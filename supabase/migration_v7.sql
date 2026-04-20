-- =====================================================================
-- ConfessX — Migration V7 : fonction RPC admin pour supprimer un user
-- de façon atomique et garantie (bypass RLS via SECURITY DEFINER).
-- À exécuter APRÈS migration_v6.sql. Idempotent.
-- =====================================================================

-- admin_force_delete_user
--   Supprime atomiquement en SQL pur :
--   1. (option purge) posts + commentaires du user
--   2. profile row
--   Retourne JSONB avec compteurs exacts de lignes supprimées.
--   Idempotent : retourne 0 partout si user déjà parti.
--
-- N.B. : on ne touche pas à auth.users ici (réservé à supabase.auth.admin.deleteUser).
create or replace function public.admin_force_delete_user(
    p_user_id uuid,
    p_purge boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_posts int4 := 0;
    v_comments int4 := 0;
    v_profile int4 := 0;
begin
    if p_purge then
        delete from public.posts where user_id = p_user_id;
        get diagnostics v_posts = row_count;

        delete from public.comments where user_id = p_user_id;
        get diagnostics v_comments = row_count;
    end if;

    delete from public.profiles where id = p_user_id;
    get diagnostics v_profile = row_count;

    return jsonb_build_object(
        'posts_deleted',    v_posts,
        'comments_deleted', v_comments,
        'profile_deleted',  v_profile
    );
end;
$$;

-- Exécutable uniquement par le service_role (appelé depuis les routes admin).
revoke all on function public.admin_force_delete_user(uuid, boolean) from anon, authenticated;
grant  execute on function public.admin_force_delete_user(uuid, boolean) to service_role;
