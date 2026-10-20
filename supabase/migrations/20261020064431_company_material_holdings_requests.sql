-- No company files are served or accepted by website accounts, including admins.
-- Restrictive policies cannot be overridden by an existing permissive policy.
CREATE POLICY company_files_retired ON storage.objects AS RESTRICTIVE
FOR ALL TO anon, authenticated
USING (bucket_id <> 'company-documents') WITH CHECK (bucket_id <> 'company-documents');
CREATE POLICY company_document_records_retired ON public.company_documents AS RESTRICTIVE
FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE FUNCTION private.disable_registry_upload_permission()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN NEW.can_upload_registry := false; RETURN NEW; END;
$$;
REVOKE ALL ON FUNCTION private.disable_registry_upload_permission() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER company_members_disable_registry_upload
BEFORE INSERT OR UPDATE ON public.company_members
FOR EACH ROW EXECUTE FUNCTION private.disable_registry_upload_permission();
UPDATE public.company_members SET can_upload_registry = false WHERE can_upload_registry;

CREATE TABLE public.company_material_holdings (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  articles_status text NOT NULL DEFAULT 'unknown' CHECK (articles_status IN ('unknown','held','not_held')),
  shareholder_register_status text NOT NULL DEFAULT 'unknown' CHECK (shareholder_register_status IN ('unknown','held','not_held')),
  checked_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.company_material_holdings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.company_material_holdings FROM anon, authenticated;
GRANT SELECT ON public.company_material_holdings TO authenticated;
GRANT INSERT(company_id,articles_status,shareholder_register_status), UPDATE(articles_status,shareholder_register_status)
ON public.company_material_holdings TO authenticated;
-- Upsert includes company_id in the update list; RLS also checks the new company.
GRANT UPDATE(company_id) ON public.company_material_holdings TO authenticated;
CREATE FUNCTION private.stamp_material_holdings() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN NEW.checked_at := statement_timestamp(); RETURN NEW; END;
$$;
REVOKE ALL ON FUNCTION private.stamp_material_holdings() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER stamp_material_holdings BEFORE INSERT OR UPDATE ON public.company_material_holdings
FOR EACH ROW EXECUTE FUNCTION private.stamp_material_holdings();

CREATE FUNCTION private.can_manage_company_materials(p_company uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.status = 'approved' AND NOT p.must_change_password)
AND (
  private.is_approved_admin()
  OR (EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.office_staff_permissions sp ON sp.user_id=p.id
    JOIN public.office_staff_company_assignments a ON a.user_id=p.id
    WHERE p.id=(SELECT auth.uid()) AND p.role='staff' AND p.status='approved'
      AND sp.is_active AND sp.can_manage_documents
      AND a.company_id=p_company AND a.can_view AND a.can_manage_documents
  ))
);
$$;
CREATE FUNCTION private.can_request_company_materials(p_company uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
SELECT private.can_manage_company_materials(p_company)
OR EXISTS (
  SELECT 1 FROM public.profiles p JOIN public.company_members cm ON cm.user_id=p.id
  WHERE p.id=(SELECT auth.uid()) AND p.role='client' AND p.status='approved' AND NOT p.must_change_password
    AND cm.company_id=p_company AND cm.is_active AND cm.can_view_company AND cm.can_view_documents
    AND cm.member_role IN ('owner','manager')
);
$$;
REVOKE ALL ON FUNCTION private.can_manage_company_materials(uuid), private.can_request_company_materials(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_manage_company_materials(uuid), private.can_request_company_materials(uuid) TO authenticated;
CREATE FUNCTION public.can_manage_company_materials(p_company uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$ SELECT private.can_manage_company_materials(p_company); $$;
CREATE FUNCTION public.can_request_company_materials(p_company uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$ SELECT private.can_request_company_materials(p_company); $$;
REVOKE ALL ON FUNCTION public.can_manage_company_materials(uuid), public.can_request_company_materials(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_company_materials(uuid), public.can_request_company_materials(uuid) TO authenticated;

CREATE POLICY material_holdings_select ON public.company_material_holdings
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.companies c WHERE c.id=company_material_holdings.company_id)
);
CREATE POLICY material_holdings_insert ON public.company_material_holdings FOR INSERT TO authenticated
WITH CHECK (private.can_manage_company_materials(company_id));
CREATE POLICY material_holdings_update ON public.company_material_holdings FOR UPDATE TO authenticated
USING (private.can_manage_company_materials(company_id)) WITH CHECK (private.can_manage_company_materials(company_id));

CREATE TABLE public.company_material_requests (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  reply_email text NOT NULL CHECK (char_length(reply_email) BETWEEN 3 AND 254 AND reply_email=btrim(reply_email)
    AND reply_email ~ '^[^[:space:]<>@,;]+@[^[:space:]<>@,;]+\.[^[:space:]<>@,;]+$'),
  document_types text[] NOT NULL CHECK (cardinality(document_types) BETWEEN 1 AND 2
    AND document_types <@ ARRAY['articles','shareholder_register']::text[]
    AND array_position(document_types,NULL) IS NULL
    AND (cardinality(document_types)=1 OR document_types[1]<>document_types[2])),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX company_material_requests_user_time ON public.company_material_requests(requested_by,created_at DESC);
ALTER TABLE public.company_material_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.company_material_requests FROM anon, authenticated;
GRANT SELECT ON public.company_material_requests TO authenticated;
GRANT INSERT(id,company_id,reply_email,document_types) ON public.company_material_requests TO authenticated;
CREATE POLICY material_requests_select ON public.company_material_requests FOR SELECT TO authenticated
USING ((requested_by=(SELECT auth.uid()) AND private.can_request_company_materials(company_id)) OR private.can_manage_company_materials(company_id));
CREATE POLICY material_requests_insert ON public.company_material_requests FOR INSERT TO authenticated
WITH CHECK (requested_by=(SELECT auth.uid()) AND private.can_request_company_materials(company_id));

-- Direct REST inserts must obey the same request limit as the server endpoint.
CREATE FUNCTION private.limit_company_material_requests() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT private.can_request_company_materials(NEW.company_id) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='not authorized';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  IF (SELECT count(*) FROM public.company_material_requests r
      WHERE r.requested_by=auth.uid() AND r.created_at > statement_timestamp()-interval '10 minutes') >= 5 THEN
    RAISE EXCEPTION 'material request rate limit';
  END IF;
  NEW.requested_by := auth.uid(); NEW.created_at := statement_timestamp(); RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.limit_company_material_requests() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER limit_material_requests BEFORE INSERT ON public.company_material_requests
FOR EACH ROW EXECUTE FUNCTION private.limit_company_material_requests();

CREATE FUNCTION public.register_company_material_request(p_id uuid,p_company uuid,p_reply_email text,p_types text[])
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE r public.company_material_requests%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT private.can_request_company_materials(p_company) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='not authorized';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  SELECT * INTO r FROM public.company_material_requests WHERE id=p_id;
  IF FOUND THEN
    IF r.requested_by<>auth.uid() OR r.company_id<>p_company OR r.reply_email<>p_reply_email OR r.document_types<>p_types THEN
      RAISE EXCEPTION 'material request conflict';
    END IF;
  ELSE
    INSERT INTO public.company_material_requests(id,company_id,reply_email,document_types)
    VALUES(p_id,p_company,p_reply_email,p_types) RETURNING * INTO r;
  END IF;
  RETURN jsonb_build_object('id',r.id,'created_at',r.created_at);
END;
$$;
REVOKE ALL ON FUNCTION public.register_company_material_request(uuid,uuid,text,text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_company_material_request(uuid,uuid,text,text[]) TO authenticated;
