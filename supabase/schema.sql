-- IMPORTANT: 이 파일은 더 이상 초기화용 스키마가 아닙니다.
--
-- 과거 회원기능 초기에 작성된 schema.sql이 현재 Supabase 운영 구조와 달라
-- 새 환경에서 실수로 실행할 경우 잘못된 enum/컬럼/RLS가 만들어질 수 있어
-- 실행 가능한 구형 DDL을 제거했습니다.
--
-- 현재 실제 구조는 Supabase 프로젝트의 적용된 migrations가 기준입니다.
-- 주요 public 테이블:
--   profiles
--   companies
--   company_members
--   company_documents
--   company_officers
--   company_term_items
--   company_special_records
--   company_contacts
--   company_work_logs
--   company_access_requests
--   account_withdrawal_requests
--   office_staff_permissions
--   office_staff_company_assignments
--   admin_audit_log
--   site_public_stats
--
-- Storage:
--   private bucket: company-documents
--
-- 보안 원칙:
--   * 고객 회사자료는 승인된 client + 활성 company_members 권한을 함께 확인
--   * 직원은 승인된 staff + 전역 직원권한 + 회사별 assignment를 함께 확인
--   * 관리자는 승인상태 및 설정된 경우 MFA AAL2를 확인
--   * 회원 미연결 선등록 회사는 일반회원에게 노출되지 않음
--   * 문서 Storage는 private + RLS 사용
--
-- 새 Supabase 환경을 재구성할 때는 이 파일을 실행하지 말고,
-- 현재 프로젝트의 migration 이력을 기준으로 별도의 검증된 consolidated migration을 생성하십시오.

DO $$
BEGIN
  RAISE EXCEPTION 'Deprecated schema.sql: 현재 Supabase migration 이력을 사용해야 합니다.';
END
$$;
