-- 1) Lock down profile self-updates to safe columns only
REVOKE UPDATE ON public.profiles FROM anon, authenticated, PUBLIC;
GRANT UPDATE (full_name, preferred_name) ON public.profiles TO authenticated;

-- 2) Revoke EXECUTE on trigger-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, PUBLIC;