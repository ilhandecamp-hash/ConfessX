-- =====================================================================
-- ConfessX — Migration V3 : NSFW, commentaires threaded, hot score
-- À exécuter dans l'éditeur SQL Supabase APRÈS migration_v2.sql
-- Idempotent (re-runnable).
-- =====================================================================

-- 1) ALTER TABLE posts : NSFW + hot_score -----------------------------
alter table public.posts
    add column if not exists nsfw      bool not null default false,
    add column if not exists hot_score double precision not null default 0;

create index if not exists idx_posts_hot on public.posts (status, hot_score desc, created_at desc);

-- 2) ALTER TABLE comments : threading ---------------------------------
alter table public.comments
    add column if not exists parent_id uuid references public.comments(id) on delete cascade;

create index if not exists idx_comments_parent on public.comments (parent_id);

-- 3) FONCTION hot score (Reddit-like) ---------------------------------
-- Formule : sign(score) * log10(max(|score|, 1)) + epoch_seconds / 45000
-- Plus récent = plus haut, plus populaire = plus haut.
create or replace function public.compute_hot_score(
    p_funny int4,
    p_awkward int4,
    p_serious int4,
    p_yes int4,
    p_no int4,
    p_created timestamptz
) returns double precision
language sql
immutable
as $$
    select
        sign(coalesce(p_funny + p_awkward + p_serious + p_yes + p_no, 0)) *
        log(greatest(abs(coalesce(p_funny + p_awkward + p_serious + p_yes + p_no, 0)), 1))
        + (extract(epoch from p_created) - 1700000000) / 45000.0
$$;

-- Recalcul du hot score (appelable périodiquement)
create or replace function public.recalc_hot_scores()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    update public.posts
    set hot_score = public.compute_hot_score(
        funny_count, awkward_count, serious_count, yes_count, no_count, created_at
    )
    where status = 'published';
end;
$$;

grant execute on function public.recalc_hot_scores() to service_role;

-- Déclencher automatiquement après un vote (via trigger)
create or replace function public.touch_hot_score()
returns trigger
language plpgsql
as $$
begin
    new.hot_score := public.compute_hot_score(
        new.funny_count, new.awkward_count, new.serious_count,
        new.yes_count, new.no_count, new.created_at
    );
    return new;
end;
$$;

drop trigger if exists trg_posts_hot_score on public.posts;
create trigger trg_posts_hot_score
    before insert or update of funny_count, awkward_count, serious_count, yes_count, no_count
    on public.posts
    for each row
    execute function public.touch_hot_score();

-- Initialise les hot_scores pour les posts existants
select public.recalc_hot_scores();

-- 4) FONCTION add_comment v2 (supporte parent_id) ---------------------
-- En pur SQL avec CTE pour éviter le bug SELECT INTO dans Supabase SQL Editor.
-- Retourne l'id inséré, ou NULL si validation échoue (parent invalide / contenu hors bornes).
create or replace function public.add_comment(
    p_post_id uuid,
    p_content text,
    p_author_token text,
    p_parent_id uuid default null
) returns uuid
language sql
security definer
set search_path = public
as $$
    with inserted as (
        insert into public.comments (post_id, content, author_token, parent_id)
        select p_post_id, trim(p_content), p_author_token, p_parent_id
        where p_content is not null
          and char_length(trim(p_content)) between 1 and 500
          and (
              p_parent_id is null
              or exists (
                  select 1 from public.comments c
                  where c.id = p_parent_id and c.post_id = p_post_id
              )
          )
        returning id
    )
    select id from inserted;
$$;

grant execute on function public.add_comment(uuid, text, text, uuid) to anon, authenticated;

-- 5) FONCTION karma : somme des votes reçus pour un author_token -----
create or replace function public.get_karma(p_author_token text)
returns table(posts_count int4, votes_received int4, views_received int4, comments_count int4)
language sql
stable
security definer
set search_path = public
as $$
    select
        (select count(*)::int4 from public.posts where author_token = p_author_token)                         as posts_count,
        (select coalesce(sum(funny_count + awkward_count + serious_count + yes_count + no_count), 0)::int4
            from public.posts where author_token = p_author_token)                                            as votes_received,
        (select coalesce(sum(view_count), 0)::int4 from public.posts where author_token = p_author_token)     as views_received,
        (select count(*)::int4 from public.comments where author_token = p_author_token)                      as comments_count
$$;

grant execute on function public.get_karma(text) to anon, authenticated;
