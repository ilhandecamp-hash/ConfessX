-- =====================================================================
-- ConfessX — Migration V6 : annonces admin (bannières)
-- À exécuter APRÈS migration_v5.sql.
-- Idempotent.
-- =====================================================================

-- 1) TABLE announcements ----------------------------------------------
create table if not exists public.announcements (
    id           uuid primary key default gen_random_uuid(),
    title        text not null check (char_length(title) between 1 and 100),
    body         text not null check (char_length(body) between 1 and 2000),
    type         text not null default 'info'
                     check (type in ('info','update','warning','event')),
    active       boolean not null default true,
    dismissible  boolean not null default true,
    created_at   timestamptz not null default now(),
    expires_at   timestamptz
);

create index if not exists idx_announcements_active
    on public.announcements (active, created_at desc)
    where active = true;

-- 2) RLS : lecture publique des annonces actives ----------------------
alter table public.announcements enable row level security;

drop policy if exists "public read active announcements" on public.announcements;
create policy "public read active announcements"
    on public.announcements for select
    using (
        active = true
        and (expires_at is null or expires_at > now())
    );

-- L'écriture se fait via l'API admin (service_role), donc pas de policy INSERT/UPDATE/DELETE.

grant select on public.announcements to anon, authenticated;
