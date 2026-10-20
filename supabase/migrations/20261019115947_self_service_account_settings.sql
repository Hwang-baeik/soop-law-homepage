-- Only the signed-in member's name and contact number are writable.
GRANT UPDATE (display_name, phone) ON public.profiles TO authenticated;
DROP POLICY IF EXISTS profiles_update_own_personal_fields ON public.profiles;
CREATE POLICY profiles_update_own_personal_fields ON public.profiles
FOR UPDATE TO authenticated
USING (
  id = (SELECT auth.uid()) AND status = 'approved' AND NOT must_change_password
  AND (role <> 'admin' OR (SELECT public.is_approved_admin()))
)
WITH CHECK (
  id = (SELECT auth.uid()) AND status = 'approved' AND NOT must_change_password
  AND (role <> 'admin' OR (SELECT public.is_approved_admin()))
  AND display_name = btrim(display_name) AND char_length(display_name) BETWEEN 1 AND 100
  AND display_name !~ '[[:cntrl:]]'
  AND phone = btrim(phone) AND phone ~ '^[0-9+() .-]{7,30}$'
  AND char_length(regexp_replace(phone, '[^0-9]', '', 'g')) BETWEEN 7 AND 15
);

-- The first-login password flag follows an actual Auth password change,
-- rather than trusting a browser-callable RPC to assert it happened.
CREATE OR REPLACE FUNCTION private.record_own_password_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  IF NEW.encrypted_password IS DISTINCT FROM OLD.encrypted_password THEN
    UPDATE public.profiles SET must_change_password = false WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.record_own_password_change() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS on_auth_password_changed_soop ON auth.users;
CREATE TRIGGER on_auth_password_changed_soop
AFTER UPDATE OF encrypted_password ON auth.users
FOR EACH ROW EXECUTE FUNCTION private.record_own_password_change();
REVOKE ALL ON FUNCTION public.mark_password_changed() FROM PUBLIC, anon, authenticated;
-- Backward-compatible check for older clients. It can no longer clear the flag.
CREATE OR REPLACE FUNCTION public.mark_password_changed()
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND NOT must_change_password
  ) THEN RAISE EXCEPTION 'Password change has not been confirmed'; END IF;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.mark_password_changed() TO authenticated;
