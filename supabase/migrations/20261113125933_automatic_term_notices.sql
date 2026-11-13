create table private.term_notice_deliveries (
  officer_id uuid not null,
  expiry date not null,
  delivery_key uuid not null,
  claimed_at timestamptz not null default now(),
  provider_id text,
  primary key (officer_id, expiry)
);
alter table private.term_notice_deliveries enable row level security;
revoke all on private.term_notice_deliveries from public, anon, authenticated;

create function public.claim_automatic_term_notices(p_secret text)
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
      select min(btrim(cc.value)) as value
      from public.company_contacts cc
      where cc.company_id = c.id and cc.contact_type = 'email' and cc.is_primary
        and length(btrim(cc.value)) <= 254
        and btrim(cc.value) ~ '^[^[:space:]<>@,;]+@[^[:space:]<>@,;]+\.[^[:space:]<>@,;]+$'
        and lower(split_part(btrim(cc.value), '@', 2)) <> 'sooplaw.com'
      having count(distinct lower(btrim(cc.value))) = 1
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

create function public.finish_automatic_term_notice(p_secret text, p_key uuid, p_provider_id text, p_release boolean default false)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from vault.decrypted_secrets s
    where s.name = 'term_notice_worker' and s.decrypted_secret = p_secret
  ) then
    raise insufficient_privilege;
  end if;
  if p_release then
    delete from private.term_notice_deliveries d where d.delivery_key = p_key and d.provider_id is null;
  elsif nullif(p_provider_id, '') is not null then
    update private.term_notice_deliveries d set provider_id = p_provider_id where d.delivery_key = p_key;
  end if;
end;
$$;

revoke all on function public.claim_automatic_term_notices(text) from public, authenticated;
revoke all on function public.finish_automatic_term_notice(text,uuid,text,boolean) from public, authenticated;
grant execute on function public.claim_automatic_term_notices(text) to anon;
grant execute on function public.finish_automatic_term_notice(text,uuid,text,boolean) to anon;
