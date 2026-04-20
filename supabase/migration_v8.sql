-- =====================================================================
-- ConfessX — V8 : nuke user complet (profile + auth.users) en SQL pur
-- À exécuter dans le SQL Editor. Idempotent.
-- =====================================================================

-- admin_nuke_user : efface TOUT (profile + auth.users) atomiquement.
-- Utilise SECURITY DEFINER pour bypasser RLS et les soft-deletes.
create or replace function public.admin_nuke_user(
    p_user_id uuid,
    p_purge boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_posts    int4 := 0;
    v_comments int4 := 0;
    v_profile  int4 := 0;
    v_auth     int4 := 0;
begin
    if p_purge then
        delete from public.posts    where user_id = p_user_id;
        get diagnostics v_posts = row_count;

        delete from public.comments where user_id = p_user_id;
        get diagnostics v_comments = row_count;
    end if;

    -- Supprime d'abord le profile (évite CASCADE qui pourrait avoir des side effects).
    delete from public.profiles where id = p_user_id;
    get diagnostics v_profile = row_count;

    -- HARD DELETE sur auth.users — passe au-dessus de toute config soft-delete.
    -- Le rôle service_role a DELETE sur auth.users.
    delete from auth.users where id = p_user_id;
    get diagnostics v_auth = row_count;

    return jsonb_build_object(
        'posts_deleted',    v_posts,
        'comments_deleted', v_comments,
        'profile_deleted',  v_profile,
        'auth_deleted',     v_auth
    );
end;
$$;

revoke all on function public.admin_nuke_user(uuid, boolean) from anon, authenticated;
grant  execute on function public.admin_nuke_user(uuid, boolean) to service_role;
