-- =====================================================================
-- ConfessX — V7 fix : supprime le trigger "handle_new_user" si présent
-- (un pattern de tutos Supabase qui re-crée automatiquement un profile
--  à chaque écriture sur auth.users → empêche les suppressions admin).
-- =====================================================================
-- À exécuter UNE FOIS dans le SQL Editor. Idempotent.

-- 1) Supprime trigger éventuel sur auth.users ------------------------
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_created_trigger on auth.users;

-- 2) Supprime fonction associée si elle existe -----------------------
drop function if exists public.handle_new_user() cascade;

-- 3) Liste les triggers restants sur auth.users (pour diagnostic) ----
-- Tu peux copier-coller cette requête pour vérifier ce qui reste :
--
--   select trigger_name, event_manipulation, action_statement
--   from information_schema.triggers
--   where event_object_schema = 'auth' and event_object_table = 'users';

-- 4) Vérifie qu'il n'y a pas de fonction qui insère dans profiles ----
-- Si cette requête renvoie des lignes autres que tes fonctions publics
-- connues (create_profile, admin_force_delete_user, etc.), c'est suspect :
--
--   select routine_name, routine_definition
--   from information_schema.routines
--   where routine_definition ilike '%insert into%profiles%'
--     and routine_schema = 'public';
