# Supabase migration manifest

현재 회원/회사 관리 시스템의 기준 스키마는 Supabase 프로젝트에 실제 적용된 migration 이력입니다. `schema.sql`의 과거 초기 DDL은 현재 구조와 달라 실행하지 않습니다.

현재 적용 순서:

1. `20260915024835_member_company_auth_schema`
2. `20260915024858_signup_and_admin_functions`
3. `20260915024907_company_documents_storage`
4. `20260915024928_harden_function_execute_privileges`
5. `20260915031820_office_staff_and_deadline_management`
6. `20260915031837_integrate_staff_with_company_document_access`
7. `20260915031920_refine_officer_term_dates`
8. `20260915032321_agm_term_reminder_january`
9. `20260915032404_deadline_overview_rpc`
10. `20260915032517_align_admin_rpc_with_frontend`
11. `20260915032857_generic_company_special_records`
12. `20260915033010_include_special_records_in_deadline_overview`
13. `20260915040957_account_withdrawal_and_privacy_controls`
14. `20260915041012_preserve_anonymized_withdrawal_audit`
15. `20260915041227_record_privacy_consent_server_side`
16. `20260915041326_preserve_company_records_on_user_deletion`
17. `20260915042527_harden_admin_auth_with_private_helper_and_mfa`
18. `20260915042814_move_deadline_permission_helper_private`
19. `20260915043051_company_relationship_requests_logs_contacts`
20. `20260915043310_admin_company_record_management`
21. `20260915044556_bulk_company_data_and_public_stats`
22. `20260915054646_harden_company_registration_and_upload_types`
23. `20260915055344_tighten_recent_table_grants`
24. `20260915055523_remove_duplicate_access_request_index`
25. `20260915055902_require_email_confirmation_before_client_approval`
26. `20260915060008_enforce_approved_identity_in_all_company_rls`
27. `20260915060354_index_company_management_queries`

## 운영 원칙

- 새 환경을 만들 때 과거 `schema.sql`을 실행하지 않습니다.
- 운영 DB 변경은 Supabase migration으로 적용합니다.
- RLS/Storage 정책을 변경한 뒤 Security Advisor를 다시 확인합니다.
- 회원 미연결 회사는 관리자(또는 명시적으로 배정된 승인 직원)만 조회할 수 있어야 합니다.
- 고객 회사 데이터 조회는 `approved client`와 활성 `company_members` 권한을 모두 만족해야 합니다.
- 직원 조회/수정은 `approved staff`, 전역 직원권한, 회사별 assignment를 모두 만족해야 합니다.
- Private Storage `company-documents`의 파일 접근은 Storage RLS와 문서 메타데이터 권한을 함께 확인합니다.
