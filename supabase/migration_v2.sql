-- =====================================================================
-- ConfessX — Migration V2 : profil anonyme, ownership, commentaires,
-- vues, édition, raisons de signalement, search full-text.
-- À exécuter dans l'éditeur SQL Supabase APRÈS schema.sql.
-- Idempotent (peut être relancée sans casser).
-- =====================================================================

-- 1) EXTENSIONS FULL-TEXT ---------------------------------------------
create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- 2) ALTER TABLE posts ------------------------------------------------
alter table public.posts
    add column if not exists author_token text,
    add column if not exists view_count   int4 not null default 0,
    add column if not exists updated_at   timestamptz;

create index if not exists idx_posts_author_token on public.posts (author_token);

-- Index trigram pour recherche fuzzy FR (tolère accents/typos)
create index if not exists idx_posts_content_trgm
    on public.posts using gin (content gin_trgm_ops);

-- 3) ALTER TABLE reports (raisons) ------------------------------------
alter table public.reports
    add column if not exists reason text
        check (reason is null or reason in ('spam','hate','sexual','illegal','harassment','other'));

-- 4) TABLE comments ---------------------------------------------------
create table if not exists public.comments (
    id             uuid primary key default gen_random_uuid(),
    post_id        uuid not null references public.posts(id) on delete cascade,
    content        text not null check (char_length(content) between 1 and 500),
    author_token   text,
    status         text not null default 'published' check (status in ('pending','published','rejected')),
    funny_count    int4 not null default 0,
    awkward_count  int4 not null default 0,
    serious_count  int4 not null default 0,
    report_count   int4 not null default 0,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz
);

create index if not exists idx_comments_post_id     on public.comments (post_id, created_at desc);
create index if not exists idx_comments_author      on public.comments (author_token);
create index if not exists idx_comments_status      on public.comments (status);

-- 5) TABLE comment_votes (anti double-vote) ---------------------------
create table if not exists public.comment_votes (
    id          uuid primary key default gen_random_uuid(),
    comment_id  uuid not null references public.comments(id) on delete cascade,
    fingerprint text not null,
    vote_type   text not null check (vote_type in ('funny','awkward','serious')),
    created_at  timestamptz not null default now(),
    unique (comment_id, fingerprint, vote_type)
);

create index if not exists idx_comment_votes_comment on public.comment_votes (comment_id);

-- 6) TABLE comment_reports -------------------------------------------
create table if not exists public.comment_reports (
    id          uuid primary key default gen_random_uuid(),
    comment_id  uuid not null references public.comments(id) on delete cascade,
    fingerprint text not null,
    reason      text check (reason is null or reason in ('spam','hate','sexual','illegal','harassment','other')),
    created_at  timestamptz not null default now(),
    unique (comment_id, fingerprint)
);

-- 7) SYNC commentaires -> post.updated_at stays stale intentionally --
--    (pas besoin de trigger pour le MVP)

-- 8) FONCTIONS RPC ----------------------------------------------------

-- Augmente atomiquement le compteur de vues (idempotent par fingerprint via table optionnelle).
-- Implémentation simple : incrément sans dédup (les bots brouilleront peu). Pour dédup :
-- ajouter une table post_views. Ici on privilégie la simplicité.
create or replace function public.increment_view(
    p_post_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    update public.posts
    set view_count = view_count + 1
    where id = p_post_id and status = 'published';
end;
$$;

-- Supprime un post si l'appelant est le vrai auteur.
create or replace function public.delete_post(
    p_post_id uuid,
    p_author_token text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_deleted int4;
begin
    if p_author_token is null or length(p_author_token) < 16 then
        return false;
    end if;

    delete from public.posts
    where id = p_post_id
      and author_token = p_author_token;

    get diagnostics v_deleted = row_count;
    return v_deleted > 0;
end;
$$;

-- Édite un post dans les 5 minutes après création, si auteur.
create or replace function public.update_post(
    p_post_id uuid,
    p_author_token text,
    p_content text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_updated int4;
begin
    if p_author_token is null or length(p_author_token) < 16 then
        return false;
    end if;
    if p_content is null or char_length(trim(p_content)) < 3 or char_length(p_content) > 280 then
        return false;
    end if;

    update public.posts
    set content = trim(p_content),
        updated_at = now()
    where id = p_post_id
      and author_token = p_author_token
      and created_at >= now() - interval '5 minutes';

    get diagnostics v_updated = row_count;
    return v_updated > 0;
end;
$$;

-- Ajoute un commentaire.
create or replace function public.add_comment(
    p_post_id uuid,
    p_content text,
    p_author_token text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_id uuid;
begin
    if p_content is null or char_length(trim(p_content)) < 1 or char_length(p_content) > 500 then
        raise exception 'invalid content';
    end if;

    insert into public.comments (post_id, content, author_token)
    values (p_post_id, trim(p_content), p_author_token)
    returning id into v_id;

    return v_id;
end;
$$;

-- Supprime un commentaire (auteur seulement).
create or replace function public.delete_comment(
    p_comment_id uuid,
    p_author_token text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_deleted int4;
begin
    if p_author_token is null or length(p_author_token) < 16 then
        return false;
    end if;

    delete from public.comments
    where id = p_comment_id
      and author_token = p_author_token;

    get diagnostics v_deleted = row_count;
    return v_deleted > 0;
end;
$$;

-- Vote sur un commentaire (même logique que increment_vote).
create or replace function public.increment_comment_vote(
    p_comment_id uuid,
    p_vote_type text,
    p_fingerprint text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
    if p_vote_type not in ('funny','awkward','serious') then
        raise exception 'invalid vote_type';
    end if;

    begin
        insert into public.comment_votes (comment_id, fingerprint, vote_type)
        values (p_comment_id, p_fingerprint, p_vote_type);
    exception when unique_violation then
        return false;
    end;

    update public.comments
    set funny_count   = funny_count   + case when p_vote_type = 'funny'   then 1 else 0 end,
        awkward_count = awkward_count + case when p_vote_type = 'awkward' then 1 else 0 end,
        serious_count = serious_count + case when p_vote_type = 'serious' then 1 else 0 end
    where id = p_comment_id and status = 'published';

    return true;
end;
$$;

-- Signale un commentaire (auto-masque à 3 signalements).
create or replace function public.report_comment(
    p_comment_id uuid,
    p_fingerprint text,
    p_reason text default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
    begin
        insert into public.comment_reports (comment_id, fingerprint, reason)
        values (p_comment_id, p_fingerprint, p_reason);
    exception when unique_violation then
        return false;
    end;

    update public.comments
    set report_count = report_count + 1,
        status = case
                   when report_count + 1 >= 3 and status = 'published' then 'pending'
                   else status
                 end
    where id = p_comment_id;

    return true;
end;
$$;

-- Remplace l'ancienne `report_post` pour accepter une raison.
create or replace function public.report_post(
    p_post_id uuid,
    p_fingerprint text,
    p_reason text default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
    begin
        insert into public.reports (post_id, fingerprint, reason)
        values (p_post_id, p_fingerprint, p_reason);
    exception when unique_violation then
        return false;
    end;

    update public.posts
    set report_count = report_count + 1,
        status = case
                   when report_count + 1 >= 3 and status = 'published' then 'pending'
                   else status
                 end
    where id = p_post_id;

    return true;
end;
$$;

-- Search full-text : trigram + unaccent.
create or replace function public.search_posts(
    p_query text,
    p_limit int4 default 20
) returns setof public.posts
language sql
stable
security definer
set search_path = public
as $$
    select p.*
    from public.posts p
    where p.status = 'published'
      and unaccent(p.content) ilike '%' || unaccent(p_query) || '%'
    order by similarity(p.content, p_query) desc, p.created_at desc
    limit greatest(1, least(p_limit, 50));
$$;

-- 9) RLS ---------------------------------------------------------------

alter table public.comments        enable row level security;
alter table public.comment_votes   enable row level security;
alter table public.comment_reports enable row level security;

drop policy if exists "public can read published comments" on public.comments;
create policy "public can read published comments"
    on public.comments for select
    using (status = 'published');

-- 10) GRANTS ----------------------------------------------------------
grant execute on function public.increment_view(uuid) to anon, authenticated;
grant execute on function public.delete_post(uuid, text) to anon, authenticated;
grant execute on function public.update_post(uuid, text, text) to anon, authenticated;
grant execute on function public.add_comment(uuid, text, text) to anon, authenticated;
grant execute on function public.delete_comment(uuid, text) to anon, authenticated;
grant execute on function public.increment_comment_vote(uuid, text, text) to anon, authenticated;
grant execute on function public.report_comment(uuid, text, text) to anon, authenticated;
grant execute on function public.report_post(uuid, text, text) to anon, authenticated;
grant execute on function public.search_posts(text, int4) to anon, authenticated;
