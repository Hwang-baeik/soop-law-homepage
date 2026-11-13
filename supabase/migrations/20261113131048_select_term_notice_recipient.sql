create or replace function public.claim_automatic_term_notices(p_secret text)
returns table (
  delivery_key uuid, company_id uuid, company_name text, recipient text,
  officer_ids uuid[], officers jsonb
)
language plpgsql security definer set search_path = ''
as $$
declare
  today date := (now() at time zone 'Asia/Seoul')::date;
  enabled_from date;
begin
  select (s.created_at at time zone 'Asia/Seoul')::date into enabled_from
  from vault.decrypted_secrets s
  where s.name = 'term_notice_worker' and s.decrypted_secret = p_secret;
  if enabled_from is null then
    raise insufficient_privilege;
  end if;

  -- Serialize claiming with other workers so one company receives one message per run.
  perform pg_advisory_xact_lock(824270366);
  return query
  with pending as materialized (
    select o.id, o.company_id, o.position, o.officer_name, o.calculated_term_end_date as expiry
    from public.company_officers o
    where o.status = 'active' and o.calculated_term_end_date between greatest(today - 1, enabled_from) and today
      and (not coalesce(o.expires_at_regular_agm, false) or o.actual_regular_agm_date is not null)
      and nullif(btrim(o.officer_name), '') is not null
      and nullif(btrim(o.position), '') is not null
      and not exists (
        select 1 from private.term_notice_deliveries d
        where d.officer_id = o.id and d.expiry = o.calculated_term_end_date
      )
  ), eligible as materialized (
    select p.company_id, c.name, email.value, gen_random_uuid() as notice_key
    from (select distinct p.company_id from pending p) p
    join public.companies c on c.id = p.company_id
    join lateral (
      with addresses as (
        select distinct lower(btrim(cc.value)) as value, cc.is_primary
        from public.company_contacts cc
        where cc.company_id = c.id and cc.contact_type = 'email'
          and length(btrim(cc.value)) <= 254
          and btrim(cc.value) ~ '^[^[:space:]<>@,;]+@[^[:space:]<>@,;]+[.][^[:space:]<>@,;]+$'
          and lower(split_part(btrim(cc.value), '@', 2)) <> 'sooplaw.com'
      ), summary as (
        select coalesce(min(a.value) filter (where a.is_primary), min(a.value)) as value,
          count(distinct a.value) filter (where a.is_primary) as primary_count,
          count(distinct a.value) as address_count
        from addresses a
      )
      select s.value from summary s
      where s.primary_count = 1
        or (
          s.primary_count = 0
          and s.address_count = 1
          and not exists (
            select 1 from public.company_contacts other
            where other.contact_type = 'email' and other.company_id <> c.id
              and lower(btrim(other.value)) = s.value
          )
        )
    ) email on true
    order by p.company_id
    limit 20
  ), claimed as (
    insert into private.term_notice_deliveries(officer_id, expiry, delivery_key)
    select p.id, p.expiry, e.notice_key
    from pending p join eligible e on e.company_id = p.company_id
    on conflict (officer_id, expiry) do nothing
    returning officer_id, term_notice_deliveries.delivery_key
  )
  select e.notice_key, e.company_id, e.name, e.value, array_agg(p.id order by p.id),
    jsonb_agg(jsonb_build_object('title', p.position, 'person_name', p.officer_name, 'target_date', p.expiry) order by p.id)
  from eligible e join claimed d on d.delivery_key = e.notice_key
  join pending p on p.id = d.officer_id
  group by e.notice_key, e.company_id, e.name, e.value;
end;
$$;

create function public.set_primary_term_notice_email(p_company uuid, p_contact uuid)
returns void language plpgsql security invoker set search_path = ''
as $$
begin
  if not public.is_approved_admin() then
    raise insufficient_privilege;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_company::text, 0));
  if not exists (
    select 1 from public.company_contacts c
    where c.company_id = p_company and c.id = p_contact and c.contact_type = 'email'
      and length(btrim(c.value)) <= 254
      and btrim(c.value) ~ '^[^[:space:]<>@,;]+@[^[:space:]<>@,;]+[.][^[:space:]<>@,;]+$'
  ) then
    raise invalid_parameter_value;
  end if;
  update public.company_contacts c set is_primary = (c.id = p_contact)
  where c.company_id = p_company and c.contact_type = 'email'
    and c.is_primary is distinct from (c.id = p_contact);
end;
$$;

revoke all on function public.set_primary_term_notice_email(uuid,uuid) from public, anon;
grant execute on function public.set_primary_term_notice_email(uuid,uuid) to authenticated;
