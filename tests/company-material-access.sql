-- Synthetic data is rolled back, including Storage metadata. No email or actual upload.
DO $verify$
DECLARE
  a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid();
  customer uuid:=gen_random_uuid(); submember uuid:=gen_random_uuid();
  pending_user uuid:=gen_random_uuid(); staff uuid:=gen_random_uuid(); admin_user uuid:=gen_random_uuid();
  req uuid:=gen_random_uuid(); r jsonb; n bigint; blocked boolean;
  companies_before bigint; officers_before bigint; users_before bigint;
BEGIN
  SELECT count(*) INTO companies_before FROM public.companies;
  SELECT count(*) INTO officers_before FROM public.company_officers;
  SELECT count(*) INTO users_before FROM auth.users;
  BEGIN
    INSERT INTO auth.users(id,email,aud,role,raw_user_meta_data)
    SELECT u,u::text||'@example.invalid','authenticated','authenticated','{}'::jsonb
    FROM unnest(ARRAY[customer,submember,pending_user,staff,admin_user])u;
    UPDATE public.profiles SET role='client',status='approved',must_change_password=false WHERE id IN(customer,submember);
    UPDATE public.profiles SET role='client',status='pending',must_change_password=false WHERE id=pending_user;
    UPDATE public.profiles SET role='staff',status='approved',must_change_password=false WHERE id=staff;
    UPDATE public.profiles SET role='admin',status='approved',must_change_password=false WHERE id=admin_user;
    INSERT INTO public.companies(id,name,corporate_registration_number) VALUES(a,'Material test A','9999990000003'),(b,'Material test B','9999990000004');
    INSERT INTO public.company_members(company_id,user_id,member_role,can_view_company,can_view_documents,can_upload_registry,is_active)
    VALUES(a,customer,'manager',true,true,true,true),(a,submember,'member',true,true,false,true),(a,pending_user,'manager',true,true,false,true);
    IF EXISTS(SELECT 1 FROM public.company_members WHERE company_id=a AND can_upload_registry) THEN RAISE EXCEPTION 'Legacy upload permission enabled'; END IF;
    INSERT INTO public.office_staff_permissions(user_id,admin_user_id,is_active,can_manage_documents) VALUES(staff,admin_user,true,true);
    INSERT INTO public.office_staff_company_assignments(user_id,company_id,can_view,can_manage_documents) VALUES(staff,a,true,true);
    INSERT INTO public.company_material_holdings(company_id,articles_status) VALUES(a,'held'),(b,'not_held');
    INSERT INTO storage.objects(bucket_id,name) VALUES('company-documents',a::text||'/registry/material-test.pdf');

    SET LOCAL ROLE anon; PERFORM set_config('request.jwt.claims','{}',true);
    blocked:=false;
    BEGIN SELECT count(*) INTO n FROM public.company_material_holdings; EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END;
    IF NOT blocked AND n<>0 THEN RAISE EXCEPTION 'Anonymous holdings access'; END IF;
    RESET ROLE;

    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',customer,'role','authenticated','aal','aal1')::text,true);
    SELECT count(*) INTO n FROM public.company_material_holdings;
    IF n<>1 THEN RAISE EXCEPTION 'Holdings company isolation'; END IF;
    IF NOT public.can_request_company_materials(a) OR public.can_request_company_materials(b) THEN RAISE EXCEPTION 'Client request company isolation'; END IF;
    IF public.can_manage_company_materials(a) THEN RAISE EXCEPTION 'Client can manage holdings'; END IF;
    UPDATE public.company_material_holdings SET articles_status='not_held' WHERE company_id=a;
    GET DIAGNOSTICS n=ROW_COUNT; IF n<>0 THEN RAISE EXCEPTION 'Client updated holdings'; END IF;
    r:=public.register_company_material_request(req,a,'reply@example.invalid',ARRAY['articles']);
    IF (r->>'id')::uuid<>req THEN RAISE EXCEPTION 'Request registration'; END IF;
    PERFORM public.register_company_material_request(req,a,'reply@example.invalid',ARRAY['articles']);
    SELECT count(*) INTO n FROM public.company_material_requests WHERE id=req;
    IF n<>1 THEN RAISE EXCEPTION 'Duplicate request record'; END IF;
    blocked:=false; BEGIN PERFORM public.register_company_material_request(req,a,'changed@example.invalid',ARRAY['articles']); EXCEPTION WHEN raise_exception THEN blocked:=true; END;
    IF NOT blocked THEN RAISE EXCEPTION 'Retry payload changed'; END IF;
    blocked:=false; BEGIN PERFORM public.register_company_material_request(gen_random_uuid(),b,'reply@example.invalid',ARRAY['articles']); EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END;
    IF NOT blocked THEN RAISE EXCEPTION 'Unlinked company requested'; END IF;
    blocked:=false; BEGIN INSERT INTO public.company_material_requests(id,company_id,reply_email,document_types) VALUES(gen_random_uuid(),b,'reply@example.invalid',ARRAY['articles']); EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END;
    IF NOT blocked THEN RAISE EXCEPTION 'Direct REST bypass'; END IF;
    FOR i IN 1..4 LOOP PERFORM public.register_company_material_request(gen_random_uuid(),a,'reply@example.invalid',ARRAY['articles']); END LOOP;
    blocked:=false; BEGIN PERFORM public.register_company_material_request(gen_random_uuid(),a,'reply@example.invalid',ARRAY['articles']); EXCEPTION WHEN raise_exception THEN blocked:=true; END;
    IF NOT blocked THEN RAISE EXCEPTION 'Request rate limit bypass'; END IF;
    -- Retry the original request even after the rate cap is reached.
    PERFORM public.register_company_material_request(req,a,'reply@example.invalid',ARRAY['articles']);

    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',submember,'role','authenticated','aal','aal1')::text,true);
    IF public.can_request_company_materials(a) THEN RAISE EXCEPTION 'Submember request permitted'; END IF;
    SELECT count(*) INTO n FROM public.company_material_requests;
    IF n<>0 THEN RAISE EXCEPTION 'Other member reply addresses leaked'; END IF;
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',pending_user,'role','authenticated','aal','aal1')::text,true);
    IF public.can_request_company_materials(a) THEN RAISE EXCEPTION 'Unapproved user request permitted'; END IF;
    SELECT count(*) INTO n FROM public.company_material_holdings;
    IF n<>0 THEN RAISE EXCEPTION 'Unapproved user holdings access'; END IF;

    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',staff,'role','authenticated','aal','aal1')::text,true);
    IF NOT public.can_manage_company_materials(a) OR public.can_manage_company_materials(b) THEN RAISE EXCEPTION 'Staff assignment restriction'; END IF;
    UPDATE public.company_material_holdings SET shareholder_register_status='held' WHERE company_id=a;
    GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Staff holdings update'; END IF;
    UPDATE public.company_material_holdings SET shareholder_register_status='held' WHERE company_id=b;
    GET DIAGNOSTICS n=ROW_COUNT; IF n<>0 THEN RAISE EXCEPTION 'Staff unrelated holdings update'; END IF;

    -- Even an approved admin's existing permissive policies cannot bypass retirement.
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',admin_user,'role','authenticated','aal','aal1')::text,true);
    SELECT count(*) INTO n FROM storage.objects WHERE bucket_id='company-documents';
    IF n<>0 THEN RAISE EXCEPTION 'Retired files readable by admin'; END IF;
    blocked:=false; BEGIN INSERT INTO storage.objects(bucket_id,name) VALUES('company-documents',a::text||'/blocked.pdf'); EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END;
    IF NOT blocked THEN RAISE EXCEPTION 'Admin file upload bypass'; END IF;
    blocked:=false; BEGIN INSERT INTO public.company_documents(company_id,document_type,title,storage_path,file_name) VALUES(a,'articles','blocked','blocked.pdf','blocked.pdf'); EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END;
    IF NOT blocked THEN RAISE EXCEPTION 'Admin document metadata insert bypass'; END IF;
    RESET ROLE;
    UPDATE public.company_members SET is_active=false WHERE company_id=a AND user_id=customer;
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',customer,'role','authenticated','aal','aal1')::text,true);
    IF public.can_request_company_materials(a) THEN RAISE EXCEPTION 'Revoked member access'; END IF;
    blocked:=false; BEGIN PERFORM public.register_company_material_request(req,a,'reply@example.invalid',ARRAY['articles']); EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END;
    IF NOT blocked THEN RAISE EXCEPTION 'Revoked member retry permitted'; END IF;
    RESET ROLE;
    RAISE EXCEPTION USING ERRCODE='ZX001',MESSAGE='rollback fixtures';
  EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
  END;
  IF (SELECT count(*) FROM public.companies)<>companies_before OR (SELECT count(*) FROM public.company_officers)<>officers_before OR (SELECT count(*) FROM auth.users)<>users_before THEN RAISE EXCEPTION 'Test fixture rollback failed'; END IF;
END $verify$;
SELECT 'PASS: material permissions, retry safety, rate limiting, retired file access, fixture cleanup' AS result;
