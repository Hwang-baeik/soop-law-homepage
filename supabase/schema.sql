-- 숲 법무사 홈페이지 회원/회사/승인 구조
-- Supabase SQL Editor에서 실행할 초기 스키마입니다.

create type public.account_role as enum ('admin', 'staff', 'client');
create type public.account_status as enum ('pending', 'approved', 'rejected', 'suspended');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  applicant_name text not null,
  phone text not null,
  role public.account_role not null default 'client',
  status public.account_status not null default 'pending',
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  corporate_registration_number text not null unique check (corporate_registration_number ~ '^[0-9]{13}$'),
  created_at timestamptz not null default now()
);

create table public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'manager' check (member_role in ('owner', 'manager')),
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_members enable row level security;

-- 사용자는 자신의 프로필만 읽을 수 있습니다.
create policy "profiles_read_self" on public.profiles for select to authenticated using (id = auth.uid());

-- 승인된 사용자는 자신에게 연결된 회사만 읽을 수 있습니다.
create policy "companies_read_member" on public.companies for select to authenticated using (
  exists (
    select 1 from public.company_members cm
    join public.profiles p on p.id = cm.user_id
    where cm.company_id = companies.id and cm.user_id = auth.uid() and p.status = 'approved'
  )
);

create policy "company_members_read_self" on public.company_members for select to authenticated using (user_id = auth.uid());

-- 회사 문서는 별도 company_documents 테이블과 private Storage bucket(company-documents)에서 관리합니다.
-- 정관/주주명부/기타 문서는 관리자 업로드를 원칙으로 합니다.
-- 등기부등본(document_type='registry')은 승인된 해당 회사 owner/manager 회원도
-- `{company_id}/registry/...` 경로에 PDF를 직접 업로드할 수 있도록 별도 RLS 정책을 적용합니다.
-- 다운로드는 승인된 해당 회사 구성원에게만 허용합니다.

-- 관리자 승인/거절 및 계정 생성은 service role을 사용하는 서버 전용 Route Handler에서 처리합니다.
-- service role key를 NEXT_PUBLIC_* 환경변수에 넣거나 브라우저 코드에 노출하지 마십시오.
