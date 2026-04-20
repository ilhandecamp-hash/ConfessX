-- =====================================================================
-- ConfessX — Migration V5 : bans, follows, blocks, hidden posts, notifications
-- À exécuter APRÈS migration_v4.sql.
-- Idempotent. Aucun SELECT INTO (évite le bug parser Supabase SQL Editor).
-- =====================================================================

-- 1) ALTER profiles : bans + bio + deleted_at --------------------------
alter table public.profiles
    add column if not exists banned         boolean not null default false,
    add column if not exists banned_reason  text,
    add column if not exists banned_at      timestamptz;

-- 2) TABLE follows ----------------------------------------------------
create table if not exists public.follows (
    follower_id  uuid not null references public.profiles(id) on delete cascade,
    followed_id  uuid not null references public.profiles(id) on delete cascade,
    created_at   timestamptz not null default now(),
    primary key (follower_id, followed_id),
    check (follower_id <> followed_id)
);

create index if not exists idx_follows_follower on public.follows (follower_id);
create index if not exists idx_follows_followed on public.follows (followed_id);

-- 3) TABLE blocks -----------------------------------------------------
create table if not exists public.blocks (
    blocker_id  uuid not null references public.profiles(id) on delete cascade,
    blocked_id  uuid not null references public.profiles(id) on delete cascade,
    created_at  timestamptz not null default now(),
    primary key (blocker_id, blocked_id),
    check (blocker_id <> blocked_id)
);

create index if not exists idx_blocks_blocker on public.blocks (blocker_id);

-- 4) TABLE hidden_posts -----------------------------------------------
create table if not exists public.hidden_posts (
    user_id    uuid not null references public.profiles(id) on delete cascade,
    post_id    uuid not null references public.posts(id)    on delete cascade,
    created_at timestamptz not null default now(),
    primary key (user_id, post_id)
);

create index if not exists idx_hidden_user on public.hidden_posts (user_id);

-- 5) TABLE notifications ----------------------------------------------
create table if not exists public.notifications (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references public.profiles(id) on delete cascade,
    type        text not null check (type in ('comment','reply','follow','mention')),
    actor_id    uuid references public.profiles(id) on delete set null,
    post_id     uuid references public.posts(id)    on delete cascade,
    comment_id  uuid references public.comments(id) on delete cascade,
    read_at     timestamptz,
    created_at  timestamptz not null default now()
);

create index if not exists idx_notifs_user on public.notifications (user_id, created_at desc);
create index if not exists idx_notifs_unread on public.notifications (user_id) where read_at is null;

-- 6) RLS --------------------------------------------------------------
alter table public.follows        enable row level security;
alter table public.blocks         enable row level security;
alter table public.hidden_posts   enable row level security;
alter table public.notifications  enable row level security;

drop policy if exists "public read follows" on public.follows;
create policy "public read follows"
    on public.follows for select using (true);

drop policy if exists "user manages own follows" on public.follows;
create policy "user manages own follows"
    on public.follows for all
    using (auth.uid() = follower_id)
    with check (auth.uid() = follower_id);

drop policy if exists "user manages own blocks" on public.blocks;
create policy "user manages own blocks"
    on public.blocks for all
    using (auth.uid() = blocker_id)
    with check (auth.uid() = blocker_id);

drop policy if exists "user manages own hidden" on public.hidden_posts;
create policy "user manages own hidden"
    on public.hidden_posts for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "user reads own notifications" on public.notifications;
create policy "user reads own notifications"
    on public.notifications for select
    using (auth.uid() = user_id);

drop policy if exists "user updates own notifications" on public.notifications;
create policy "user updates own notifications"
    on public.notifications for update
    using (auth.uid() = user_id);

-- 7) TRIGGER : notification sur nouveau commentaire ------------------
-- Crée une notification pour l'auteur du post (top-level) ou du parent (reply).
-- Ne notifie jamais un commentateur anonyme ou soi-même.
create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.user_id is null then return new; end if;

    if new.parent_id is not null then
        -- Reply
        insert into public.notifications (user_id, type, actor_id, post_id, comment_id)
        select c.user_id, 'reply', new.user_id, new.post_id, new.id
        from public.comments c
        where c.id = new.parent_id
          and c.user_id is not null
          and c.user_id <> new.user_id;
    else
        -- Top-level comment
        insert into public.notifications (user_id, type, actor_id, post_id, comment_id)
        select p.user_id, 'comment', new.user_id, new.post_id, new.id
        from public.posts p
        where p.id = new.post_id
          and p.user_id is not null
          and p.user_id <> new.user_id;
    end if;
    return new;
end;
$$;

drop trigger if exists trg_notify_comment on public.comments;
create trigger trg_notify_comment
    after insert on public.comments
    for each row
    execute function public.notify_on_comment();

-- 8) TRIGGER : notification sur nouveau follower ---------------------
create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.notifications (user_id, type, actor_id)
    values (new.followed_id, 'follow', new.follower_id);
    return new;
end;
$$;

drop trigger if exists trg_notify_follow on public.follows;
create trigger trg_notify_follow
    after insert on public.follows
    for each row
    execute function public.notify_on_follow();

-- 9) RPC : mark_all_notifications_read ------------------------------
create or replace function public.mark_all_notifications_read()
returns void
language sql
security definer
set search_path = public
as $$
    update public.notifications
    set read_at = now()
    where user_id = auth.uid()
      and read_at is null;
$$;

grant execute on function public.mark_all_notifications_read() to authenticated;

-- 10) RPC : count_unread_notifications ------------------------------
create or replace function public.count_unread_notifications()
returns int4
language sql
stable
security definer
set search_path = public
as $$
    select coalesce((
        select count(*)::int4
        from public.notifications
        where user_id = auth.uid() and read_at is null
    ), 0);
$$;

grant execute on function public.count_unread_notifications() to authenticated;

-- 11) RPC : list_notifications (joint avec actor + post excerpt) -----
create or replace function public.list_notifications(p_limit int4 default 50)
returns table (
    id uuid,
    type text,
    post_id uuid,
    comment_id uuid,
    read_at timestamptz,
    created_at timestamptz,
    actor_username text,
    actor_avatar_seed text,
    post_excerpt text,
    comment_excerpt text
)
language sql
stable
security definer
set search_path = public
as $$
    select
        n.id,
        n.type,
        n.post_id,
        n.comment_id,
        n.read_at,
        n.created_at,
        p.username       as actor_username,
        p.avatar_seed    as actor_avatar_seed,
        left(pst.content, 80) as post_excerpt,
        left(c.content, 80)   as comment_excerpt
    from public.notifications n
    left join public.profiles p on p.id = n.actor_id
    left join public.posts    pst on pst.id = n.post_id
    left join public.comments c   on c.id = n.comment_id
    where n.user_id = auth.uid()
    order by n.created_at desc
    limit greatest(1, least(p_limit, 100));
$$;

grant execute on function public.list_notifications(int4) to authenticated;
