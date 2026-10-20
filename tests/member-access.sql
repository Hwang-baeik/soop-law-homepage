-- Run with the configured database administration connection.
-- All synthetic users/companies are rolled back by the inner subtransaction.
-- Assertions run as anon/authenticated, with synthetic claims; no login email is sent.
DO $verify$
DECLARE
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid();
  client_user uuid := gen_random_uuid(); pending_user uuid := gen_random_uuid();
  suspended_user uuid := gen_random_uuid(); staff_user uuid := gen_random_uuid();
  admin_user uuid := gen_random_uuid();
  companies_before bigint; officers_before bigint; users_before bigint;
  n bigint; blocked boolean; passed integer := 0;
BEGIN
  SELECT count(*) INTO companies_before FROM public.companies;
  SELECT count(*) INTO officers_before FROM public.company_officers;
  SELECT count(*) INTO users_before FROM auth.users;
  BEGIN
    INSERT INTO auth.users(id,email,aud,role,email_confirmed_at,raw_user_meta_data)
    SELECT u, u::text || '@example.invalid','authenticated','authenticated',now(),'{}'::jsonb
    FROM unnest(ARRAY[client_user,pending_user,suspended_user,staff_user,admin_user]) u;
    UPDATE public.profiles SET role='client',status='approved' WHERE id=client_user;
    UPDATE public.profiles SET role='client',status='pending' WHERE id=pending_user;
    UPDATE public.profiles SET role='client',status='suspended' WHERE id=suspended_user;
    UPDATE public.profiles SET role='staff',status='approved' WHERE id=staff_user;
    UPDATE public.profiles SET role='admin',status='approved' WHERE id=admin_user;
    INSERT INTO public.companies(id,name,corporate_registration_number)
    VALUES(a,'Integration access A','9999990000001'),(b,'Integration access B','9999990000002');
    INSERT INTO public.company_members(company_id,user_id,can_view_company,can_view_documents,is_active)
    VALUES(a,client_user,true,true,true),(a,pending_user,true,true,true),(a,suspended_user,true,true,true);
    INSERT INTO public.company_officers(company_id,position,officer_name,term_start_date)
    VALUES(a,'이사','Integration A','2026-01-01'),(b,'이사','Integration B','2026-01-01');
    INSERT INTO public.company_documents(company_id,document_type,title,storage_path,file_name)
    VALUES(a,'registry','Integration A',a::text||'/registry/check.pdf','check.pdf'),
          (b,'registry','Integration B',b::text||'/registry/check.pdf','check.pdf');
    INSERT INTO public.company_special_records(company_id,category,title,value_text)
    VALUES(a,'등기사항','Integration A','original'),(b,'등기사항','Integration B','original');
    INSERT INTO public.office_staff_permissions(user_id,admin_user_id,is_active,can_manage_companies,can_manage_documents)
    VALUES(staff_user,admin_user,true,true,true);
    INSERT INTO public.office_staff_company_assignments(user_id,company_id,can_view,can_edit_company_data,can_manage_documents)
    VALUES(staff_user,a,true,true,true);

    SET LOCAL ROLE anon;
    PERFORM set_config('request.jwt.claims','{}',true);
    blocked := false;
    BEGIN
      SELECT count(*) INTO n FROM public.companies;
    EXCEPTION WHEN insufficient_privilege THEN blocked:=true;
    END;
    IF NOT blocked AND n<>0 THEN RAISE EXCEPTION 'Guest can see companies'; END IF;
    passed:=passed+1;
    SELECT count(*) INTO n FROM public.site_public_stats WHERE id=1;
    IF n<>1 THEN RAISE EXCEPTION 'Public company count inaccessible'; END IF;
    passed:=passed+1;
    RESET ROLE;

    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',client_user,'role','authenticated','aal','aal1')::text,true);
    SELECT count(*) INTO n FROM public.companies;
    IF n<>1 THEN RAISE EXCEPTION 'Client company isolation failed: %',n; END IF;
    passed:=passed+1;
    SELECT count(*) INTO n FROM public.company_officers;
    IF n<>1 THEN RAISE EXCEPTION 'Client officer isolation failed'; END IF;
    passed:=passed+1;
    SELECT count(*) INTO n FROM public.company_documents;
    IF n<>0 THEN RAISE EXCEPTION 'Retired company documents remain accessible'; END IF;
    passed:=passed+1;
    UPDATE public.companies SET name='unauthorized' WHERE id=a;
    GET DIAGNOSTICS n=ROW_COUNT;
    IF n<>0 THEN RAISE EXCEPTION 'Client can edit company'; END IF;
    passed:=passed+1;
    blocked:=false;
    BEGIN PERFORM public.admin_list_members();
    EXCEPTION WHEN insufficient_privilege OR raise_exception THEN blocked:=true; END;
    IF NOT blocked THEN RAISE EXCEPTION 'Client can call administrator RPC'; END IF;
    passed:=passed+1;
    SELECT count(*) INTO n FROM storage.objects WHERE bucket_id='company-documents';
    IF n<>0 THEN RAISE EXCEPTION 'Client can read unrelated private objects'; END IF;
    passed:=passed+1;

    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',pending_user,'role','authenticated','aal','aal1')::text,true);
    SELECT count(*) INTO n FROM public.companies;
    IF n<>0 THEN RAISE EXCEPTION 'Pending member can see companies'; END IF;
    passed:=passed+1;
    SELECT count(*) INTO n FROM public.company_documents;
    IF n<>0 THEN RAISE EXCEPTION 'Pending member can see documents'; END IF;
    passed:=passed+1;

    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',suspended_user,'role','authenticated','aal','aal1')::text,true);
    SELECT count(*) INTO n FROM public.companies;
    IF n<>0 THEN RAISE EXCEPTION 'Suspended member can see companies'; END IF;
    passed:=passed+1;
    SELECT count(*) INTO n FROM public.company_officers;
    IF n<>0 THEN RAISE EXCEPTION 'Suspended member can see officers'; END IF;
    passed:=passed+1;

    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',staff_user,'role','authenticated','aal','aal1')::text,true);
    SELECT count(*) INTO n FROM public.companies;
    IF n<>1 THEN RAISE EXCEPTION 'Staff assignment isolation failed'; END IF;
    passed:=passed+1;
    UPDATE public.companies SET name='Staff allowed edit' WHERE id=a;
    GET DIAGNOSTICS n=ROW_COUNT;
    IF n<>0 THEN RAISE EXCEPTION 'Staff can rename administrator-owned company identity'; END IF;
    passed:=passed+1;
    UPDATE public.companies SET name='unauthorized' WHERE id=b;
    GET DIAGNOSTICS n=ROW_COUNT;
    IF n<>0 THEN RAISE EXCEPTION 'Staff can edit unassigned company'; END IF;
    passed:=passed+1;
    UPDATE public.company_special_records SET value_text='allowed staff edit' WHERE company_id=a;
    GET DIAGNOSTICS n=ROW_COUNT;
    IF n<>1 THEN RAISE EXCEPTION 'Assigned staff cannot edit permitted company records'; END IF;
    passed:=passed+1;
    UPDATE public.company_special_records SET value_text='unauthorized' WHERE company_id=b;
    GET DIAGNOSTICS n=ROW_COUNT;
    IF n<>0 THEN RAISE EXCEPTION 'Staff can edit unassigned company records'; END IF;
    passed:=passed+1;

    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',admin_user,'role','authenticated','aal','aal1')::text,true);
    SELECT count(*) INTO n FROM public.companies;
    IF n<>companies_before+2 THEN RAISE EXCEPTION 'Administrator cannot view company list'; END IF;
    passed:=passed+1;
    UPDATE public.companies SET name='Admin allowed edit' WHERE id=b;
    GET DIAGNOSTICS n=ROW_COUNT;
    IF n<>1 THEN RAISE EXCEPTION 'Administrator cannot edit company'; END IF;
    passed:=passed+1;
    RESET ROLE;

    -- The sole caught exception rolls back every fixture and test update above.
    RAISE EXCEPTION USING ERRCODE='ZX001',MESSAGE='rollback successful verification fixtures';
  EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
  END;
  IF passed<>19 THEN RAISE EXCEPTION 'Incomplete access checks: %',passed; END IF;
  IF (SELECT count(*) FROM public.companies)<>companies_before
    OR (SELECT count(*) FROM public.company_officers)<>officers_before
    OR (SELECT count(*) FROM auth.users)<>users_before
  THEN RAISE EXCEPTION 'Verification fixtures were not fully rolled back'; END IF;
END
$verify$;
