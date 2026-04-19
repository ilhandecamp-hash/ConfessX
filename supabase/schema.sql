-- =====================================================================
-- ConfessX — Schéma complet à exécuter dans l'éditeur SQL Supabase
-- Ordre : extensions -> tables -> index -> fonctions RPC -> RLS policies
-- =====================================================================

-- 1) EXTENSIONS ------------------------------------------------------------
create extension if not exists "pgcrypto";

-- 2) TABLES ---------------------------------------------------------------

-- Table principale des confessions
create table if not exists public.posts (
    id              uuid primary key default gen_random_uuid(),
    content         text not null check (char_length(content) between 1 and 280),
    category        text not null check (category in ('ecole','amour','famille','argent')),
    mode            text not null check (mode in ('confession','judgment')),
    status          text not null default 'published' check (status in ('pending','published','rejected')),
    funny_count     int4 not null default 0,
    awkward_count   int4 not null default 0,
    serious_count   int4 not null default 0,
    yes_count       int4 not null default 0,
    no_count        int4 not null default 0,
    report_count    int4 not null default 0,
    is_highlight    bool not null default false,
    trending_score  int4 not null default 0,
    created_at      timestamptz not null default now()
);

-- Table des signalements (1 par device par post)
create table if not exists public.reports (
    id          uuid primary key default gen_random_uuid(),
    post_id     uuid not null references public.posts(id) on delete cascade,
    fingerprint text not null,
    created_at  timestamptz not null default now(),
    unique (post_id, fingerprint)
);

-- Table des votes (1 par device par type de vote par post)
create table if not exists public.votes (
    id          uuid primary key default gen_random_uuid(),
    post_id     uuid not null references public.posts(id) on delete cascade,
    fingerprint text not null,
    vote_type   text not null check (vote_type in ('funny','awkward','serious','yes','no')),
    created_at  timestamptz not null default now(),
    unique (post_id, fingerprint, vote_type)
);

-- 3) INDEX ----------------------------------------------------------------
create index if not exists idx_posts_created_at       on public.posts (created_at desc);
create index if not exists idx_posts_trending         on public.posts (status, trending_score desc, created_at desc);
create index if not exists idx_posts_status           on public.posts (status);
create index if not exists idx_posts_highlight        on public.posts (is_highlight) where is_highlight = true;
create index if not exists idx_reports_post_id        on public.reports (post_id);
create index if not exists idx_votes_post_id          on public.votes (post_id);

-- 4) FONCTIONS RPC --------------------------------------------------------

-- Incrémente atomiquement un compteur de vote.
-- Rejette les doublons via la contrainte UNIQUE et renvoie false en cas de doublon.
create or replace function public.increment_vote(
    p_post_id uuid,
    p_vote_type text,
    p_fingerprint text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_inserted bool := false;
begin
    if p_vote_type not in ('funny','awkward','serious','yes','no') then
        raise exception 'invalid vote_type: %', p_vote_type;
    end if;

    begin
        insert into public.votes (post_id, fingerprint, vote_type)
        values (p_post_id, p_fingerprint, p_vote_type);
        v_inserted := true;
    exception when unique_violation then
        return false;
    end;

    update public.posts
    set
        funny_count    = funny_count    + case when p_vote_type = 'funny'    then 1 else 0 end,
        awkward_count  = awkward_count  + case when p_vote_type = 'awkward'  then 1 else 0 end,
        serious_count  = serious_count  + case when p_vote_type = 'serious'  then 1 else 0 end,
        yes_count      = yes_count      + case when p_vote_type = 'yes'      then 1 else 0 end,
        no_count       = no_count       + case when p_vote_type = 'no'       then 1 else 0 end,
        trending_score = trending_score + 1
    where id = p_post_id
      and status = 'published';

    return v_inserted;
end;
$$;

-- Signale un post. Masque automatiquement le post (status='pending') dès 3 signalements.
create or replace function public.report_post(
    p_post_id uuid,
    p_fingerprint text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
    begin
        insert into public.reports (post_id, fingerprint)
        values (p_post_id, p_fingerprint);
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

-- Recalcule le score tendance (somme votes des 24 dernières heures).
-- À exécuter via un cron (pg_cron ou Edge Function) toutes les 10 min.
create or replace function public.recalc_trending_scores()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    update public.posts p
    set trending_score = coalesce(t.c, 0)
    from (
        select post_id, count(*)::int4 as c
        from public.votes
        where created_at >= now() - interval '24 hours'
        group by post_id
    ) t
    where p.id = t.post_id;

    -- Remet à zéro les posts qui n'ont plus d'activité récente
    update public.posts
    set trending_score = 0
    where id not in (
        select post_id from public.votes
        where created_at >= now() - interval '24 hours'
    ) and trending_score <> 0;
end;
$$;

-- Sélectionne et marque la "Confession du jour" (celle avec le + de votes sur 24h).
create or replace function public.pick_daily_highlight()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    update public.posts set is_highlight = false where is_highlight = true;

    update public.posts
    set is_highlight = true
    where id = (
        select p.id
        from public.posts p
        where p.status = 'published'
          and p.created_at >= now() - interval '24 hours'
        order by (p.funny_count + p.awkward_count + p.serious_count + p.yes_count + p.no_count) desc,
                 p.created_at desc
        limit 1
    );
end;
$$;

-- 5) ROW LEVEL SECURITY ---------------------------------------------------

alter table public.posts    enable row level security;
alter table public.reports  enable row level security;
alter table public.votes    enable row level security;

-- Lecture publique des posts publiés
drop policy if exists "public can read published posts" on public.posts;
create policy "public can read published posts"
    on public.posts for select
    using (status = 'published');

-- Insertion : on autorise côté anon (on préfère passer par route API server-side pour la modération,
-- mais on laisse une policy minimale permettant l'INSERT avec champs verrouillés).
drop policy if exists "anon can insert posts" on public.posts;
create policy "anon can insert posts"
    on public.posts for insert
    with check (
        status = 'published'
        and report_count = 0
        and is_highlight = false
        and trending_score = 0
        and funny_count = 0 and awkward_count = 0 and serious_count = 0
        and yes_count = 0 and no_count = 0
    );

-- Votes & reports : aucun SELECT public, tout passe par les RPC SECURITY DEFINER.
drop policy if exists "no direct read votes" on public.votes;
drop policy if exists "no direct read reports" on public.reports;

-- Les fonctions RPC étant SECURITY DEFINER, elles contournent RLS.
-- On grant les EXECUTE aux rôles anon/authenticated.
grant execute on function public.increment_vote(uuid, text, text) to anon, authenticated;
grant execute on function public.report_post(uuid, text) to anon, authenticated;
grant execute on function public.recalc_trending_scores() to service_role;
grant execute on function public.pick_daily_highlight() to service_role;

-- 6) CRON (optionnel — activer pg_cron dans Dashboard -> Database -> Extensions) --
-- select cron.schedule('recalc_trending', '*/10 * * * *', $$select public.recalc_trending_scores();$$);
-- select cron.schedule('pick_highlight',  '0 6 * * *',     $$select public.pick_daily_highlight();$$);
