-- UNION ORDER BY must reference output positions; keep a stable tie-breaker for pagination.
CREATE OR REPLACE FUNCTION public.list_upcoming_company_deadlines()
 RETURNS TABLE(source_type text, source_id uuid, company_id uuid, company_name text, category text, title text, person_name text, target_date date, reminder_date date, status text, details jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not (
    public.is_approved_admin()
    or exists (
      select 1 from public.profiles p
      join public.office_staff_permissions sp on sp.user_id=p.id
      where p.id=auth.uid() and p.role='staff' and p.status='approved' and sp.is_active and sp.can_manage_deadlines
    )
  ) then
    raise exception 'not authorized';
  end if;

  return query
  select 'officer'::text,o.id,o.company_id,c.name,
    case when o.expires_at_regular_agm then '임원(정기주총 종결형)' else '임원' end,
    o.position,o.officer_name,o.calculated_term_end_date,o.reminder_date,o.status,
    jsonb_build_object('term_start_date',o.term_start_date,'term_years',o.term_years,'expires_at_regular_agm',o.expires_at_regular_agm,'expected_regular_agm_month',o.expected_regular_agm_month,'actual_regular_agm_date',o.actual_regular_agm_date)
  from public.company_officers o join public.companies c on c.id=o.company_id
  where o.status='active' and public.can_manage_deadlines_for_company(o.company_id)

  union all

  select 'term_item'::text,t.id,t.company_id,c.name,
    case t.item_type when 'convertible_bond' then '전환사채' when 'convertible_share' then '전환주식' when 'redeemable_share' then '상환주식' else '기타 기간정보' end,
    t.title,null::text,t.end_date,t.reminder_date,t.status,
    jsonb_build_object('item_type',t.item_type,'start_date',t.start_date,'requires_cancellation_registration',t.requires_cancellation_registration,'notes',t.notes)
  from public.company_term_items t join public.companies c on c.id=t.company_id
  where t.status='active' and public.can_manage_deadlines_for_company(t.company_id)

  union all

  select 'special_record'::text,s.id,s.company_id,c.name,s.category,s.title,null::text,
    s.due_date,s.reminder_date,s.status,
    jsonb_build_object('effective_date',s.effective_date,'value_text',s.value_text,'notes',s.notes,'visible_to_client',s.visible_to_client)
  from public.company_special_records s join public.companies c on c.id=s.company_id
  where s.status='active' and s.reminder_date is not null and public.can_manage_deadlines_for_company(s.company_id)

  order by 9 nulls last, 8 nulls last, 4, 1, 2;
end
$function$
;
