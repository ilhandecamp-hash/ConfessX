-- =====================================================================
-- ConfessX — Migration V4 : comptes utilisateurs optionnels
-- À exécuter APRÈS migration_v3.sql
-- Idempotent (re-runnable).
-- =====================================================================

-- 1) TABLE profiles ---------------------------------------------------
-- Référencée à auth.users (Supabase Auth natif).
create table if not exists public.profiles (
    id            uuid primary key references auth.users(id) on delete cascade,
    username      text unique not null check (char_length(username) between 3 and 20),
    first_name    text not null check (char_length(first_name) between 1 and 40),
    last_name     text not null check (char_length(last_name) between 1 and 40),
    avatar_seed   text not null default gen_random_uuid()::text,
    bio           text check (bio is null or char_length(bio) <= 200),
    created_at    timestamptz not null default now(),
    updated_at    timestamptz
);

create index if not exists idx_profiles_username on public.profiles (lower(username));

-- 2) ALTER posts / comments : user_id optionnel -----------------------
alter table public.posts
    add column if not exists user_id uuid references public.profiles(id) on delete set null;
alter table public.comments
    add column if not exists user_id uuid references public.profiles(id) on delete set null;

create index if not exists idx_posts_user_id    on public.posts (user_id);
create index if not exists idx_comments_user_id on public.comments (user_id);

-- 3) RLS sur profiles -------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "public read profiles" on public.profiles;
create policy "public read profiles"
    on public.profiles for select using (true);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
    on public.profiles for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile"
    on public.profiles for insert
    with check (auth.uid() = id);

-- 4) RPC create_profile ----------------------------------------------
-- Appelée juste après le signup Supabase Auth.
create or replace function public.create_profile(
    p_username   text,
    p_first_name text,
    p_last_name  text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if auth.uid() is null then
        raise exception 'not authenticated';
    end if;
    if char_length(p_username) < 3 or char_length(p_username) > 20 then
        raise exception 'username_length';
    end if;
    if not (p_username ~ '^[a-zA-Z0-9_.-]+$') then
        raise exception 'username_chars';
    end if;
    if char_length(p_first_name) < 1 or char_length(p_first_name) > 40 then
        raise exception 'first_name_length';
    end if;
    if char_length(p_last_name) < 1 or char_length(p_last_name) > 40 then
        raise exception 'last_name_length';
    end if;

    insert into public.profiles (id, username, first_name, last_name)
    values (auth.uid(), lower(p_username), trim(p_first_name), trim(p_last_name));
end;
$$;

grant execute on function public.create_profile(text, text, text) to authenticated;

-- 5) RPC username_available ------------------------------------------
-- Pour vérifier côté client avant submit.
create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select not exists (
        select 1 from public.profiles where lower(username) = lower(p_username)
    );
$$;

grant execute on function public.username_available(text) to anon, authenticated;

-- 6) RPC lookup_email_by_username ------------------------------------
-- Permet login avec username : on convertit username → email pour Supabase Auth.
create or replace function public.lookup_email_by_username(p_username text)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_id uuid;
    v_email text;
begin
    -- On garde cette fonction pour le backend seulement (grant restrictif).
    select id into v_id from public.profiles where lower(username) = lower(p_username);
    if v_id is null then return null; end if;
    select email into v_email from auth.users where id = v_id;
    return v_email;
end;
$$;

grant execute on function public.lookup_email_by_username(text) to service_role;
revoke all on function public.lookup_email_by_username(text) from anon, authenticated;

-- 7) update_post / delete_post : ownership par user_id ou author_token
-- On étend les fonctions existantes pour autoriser user_id OU author_token.
create or replace function public.delete_post(
    p_post_id uuid,
    p_author_token text,
    p_user_id uuid default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_deleted int4;
begin
    delete from public.posts
    where id = p_post_id
      and (
          (p_user_id is not null and user_id = p_user_id)
          or (p_author_token is not null and length(p_author_token) >= 16 and author_token = p_author_token)
      );
    get diagnostics v_deleted = row_count;
    return v_deleted > 0;
end;
$$;

grant execute on function public.delete_post(uuid, text, uuid) to anon, authenticated;

create or replace function public.update_post(
    p_post_id uuid,
    p_author_token text,
    p_content text,
    p_user_id uuid default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_updated int4;
begin
    if p_content is null or char_length(trim(p_content)) < 3 or char_length(p_content) > 280 then
        return false;
    end if;

    update public.posts
    set content = trim(p_content),
        updated_at = now()
    where id = p_post_id
      and created_at >= now() - interval '5 minutes'
      and (
          (p_user_id is not null and user_id = p_user_id)
          or (p_author_token is not null and length(p_author_token) >= 16 and author_token = p_author_token)
      );

    get diagnostics v_updated = row_count;
    return v_updated > 0;
end;
$$;

grant execute on function public.update_post(uuid, text, text, uuid) to anon, authenticated;

create or replace function public.delete_comment(
    p_comment_id uuid,
    p_author_token text,
    p_user_id uuid default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_deleted int4;
begin
    delete from public.comments
    where id = p_comment_id
      and (
          (p_user_id is not null and user_id = p_user_id)
          or (p_author_token is not null and length(p_author_token) >= 16 and author_token = p_author_token)
      );
    get diagnostics v_deleted = row_count;
    return v_deleted > 0;
end;
$$;

grant execute on function public.delete_comment(uuid, text, uuid) to anon, authenticated;

-- 8) add_comment v3 : supporte user_id ---------------------------------
create or replace function public.add_comment(
    p_post_id      uuid,
    p_content      text,
    p_author_token text,
    p_parent_id    uuid default null,
    p_user_id      uuid default null
) returns uuid
language sql
security definer
set search_path = public
as $$
    with inserted as (
        insert into public.comments (post_id, content, author_token, parent_id, user_id)
        select p_post_id, trim(p_content), p_author_token, p_parent_id, p_user_id
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

-- 9) RPC karma pour un user_id ---------------------------------------
create or replace function public.get_user_karma(p_user_id uuid)
returns table(posts_count int4, votes_received int4, views_received int4, comments_count int4)
language sql
stable
security definer
set search_path = public
as $$
    select
        (select count(*)::int4 from public.posts where user_id = p_user_id)                                   as posts_count,
        (select coalesce(sum(funny_count + awkward_count + serious_count + yes_count + no_count), 0)::int4
            from public.posts where user_id = p_user_id)                                                       as votes_received,
        (select coalesce(sum(view_count), 0)::int4 from public.posts where user_id = p_user_id)                as views_received,
        (select count(*)::int4 from public.comments where user_id = p_user_id)                                 as comments_count
$$;

grant execute on function public.get_user_karma(uuid) to anon, authenticated;
