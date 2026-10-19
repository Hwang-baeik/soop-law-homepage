-- Synthetic fixtures and all mutations roll back; no customer data or mail is used.
DO $verify$
DECLARE
  staff_id uuid := gen_random_uuid(); admin_id uuid := gen_random_uuid();
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid();
  n bigint; blocked boolean; passed int := 0;
  users_before bigint; companies_before bigint; contacts_before bigint;
BEGIN
  SELECT count(*) INTO users_before FROM auth.users;
  SELECT count(*) INTO companies_before FROM public.companies;
  SELECT count(*) INTO contacts_before FROM public.company_contacts;
  BEGIN
    INSERT INTO auth.users(id,email,aud,role,email_confirmed_at,raw_user_meta_data)
    SELECT u,u::text||'@example.invalid','authenticated','authenticated',now(),'{}'::jsonb FROM unnest(ARRAY[staff_id,admin_id]) u;
    UPDATE public.profiles SET role='admin',status='approved' WHERE id=admin_id;
    UPDATE public.profiles SET role='staff',status='approved' WHERE id=staff_id;
    INSERT INTO public.companies(id,name,corporate_registration_number) VALUES(a,'Notice fixture A','9999990000011'),(b,'Notice fixture B','9999990000012');
    INSERT INTO public.company_officers(company_id,position,officer_name,term_start_date)
    VALUES(a,'이사','Fixture A',current_date-interval '3 years'+interval '10 days'),(b,'이사','Fixture B',current_date-interval '3 years'+interval '10 days');
    INSERT INTO public.company_contacts(company_id,contact_type,label,value,created_by)
    VALUES(a,'email','Fixture A','a@example.invalid',admin_id),(b,'email','Fixture B','b@example.invalid',admin_id);
    INSERT INTO public.office_staff_permissions(user_id,admin_user_id,is_active,can_manage_deadlines) VALUES(staff_id,admin_id,true,true);
    INSERT INTO public.office_staff_company_assignments(user_id,company_id,can_view,can_manage_deadlines) VALUES(staff_id,a,true,true);
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',staff_id,'role','authenticated','aal','aal1')::text,true);
    SELECT count(*) INTO n FROM public.list_upcoming_company_deadlines();
    IF n<>1 THEN RAISE EXCEPTION 'Staff deadline assignment isolation failed'; END IF;
    passed:=passed+1;
    SELECT count(*) INTO n FROM public.company_contacts;
    IF n<>1 THEN RAISE EXCEPTION 'Staff contact assignment isolation failed'; END IF;
    passed:=passed+1;
    RESET ROLE;
    UPDATE public.office_staff_company_assignments SET can_manage_deadlines=false WHERE user_id=staff_id;
    SET LOCAL ROLE authenticated;
    SELECT count(*) INTO n FROM public.list_upcoming_company_deadlines();
    IF n<>0 THEN RAISE EXCEPTION 'Company deadline permission ignored'; END IF;
    passed:=passed+1;
    RESET ROLE;
    UPDATE public.office_staff_permissions SET can_manage_deadlines=false WHERE user_id=staff_id;
    SET LOCAL ROLE authenticated;
    blocked:=false;
    BEGIN PERFORM * FROM public.list_upcoming_company_deadlines(); EXCEPTION WHEN raise_exception THEN blocked:=true; END;
    IF NOT blocked THEN RAISE EXCEPTION 'Global deadline permission ignored'; END IF;
    passed:=passed+1;
    RESET ROLE;
    UPDATE public.office_staff_permissions SET can_manage_deadlines=true,is_active=false WHERE user_id=staff_id;
    SET LOCAL ROLE authenticated;
    blocked:=false;
    BEGIN PERFORM * FROM public.list_upcoming_company_deadlines(); EXCEPTION WHEN raise_exception THEN blocked:=true; END;
    IF NOT blocked THEN RAISE EXCEPTION 'Inactive staff allowed'; END IF;
    passed:=passed+1;
    SELECT count(*) INTO n FROM public.company_contacts;
    IF n<>0 THEN RAISE EXCEPTION 'Inactive staff can read recipients'; END IF;
    passed:=passed+1;
    RESET ROLE;
    UPDATE public.profiles SET role='client' WHERE id=staff_id;
    SET LOCAL ROLE authenticated;
    blocked:=false;
    BEGIN PERFORM * FROM public.list_upcoming_company_deadlines(); EXCEPTION WHEN raise_exception THEN blocked:=true; END;
    IF NOT blocked THEN RAISE EXCEPTION 'Client can access internal deadline RPC'; END IF;
    passed:=passed+1;
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated','aal','aal1')::text,true);
    SELECT count(*) INTO n FROM public.list_upcoming_company_deadlines() WHERE company_id IN(a,b);
    IF n<>2 THEN RAISE EXCEPTION 'Admin cannot see due fixtures'; END IF;
    passed:=passed+1;
    RESET ROLE;
    RAISE EXCEPTION USING ERRCODE='ZX001',MESSAGE='rollback fixtures';
  EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
  END;
  IF passed<>8 THEN RAISE EXCEPTION 'Incomplete checks: %',passed; END IF;
  IF (SELECT count(*) FROM auth.users)<>users_before OR (SELECT count(*) FROM public.companies)<>companies_before OR (SELECT count(*) FROM public.company_contacts)<>contacts_before THEN RAISE EXCEPTION 'Fixtures remained'; END IF;
END $verify$;
