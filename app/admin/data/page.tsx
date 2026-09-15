"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AccountShell } from "../../../components/account-shell";
import { getSession, rest } from "../../../lib/supabase-browser";
import { createXlsxBlob, downloadBlob, parseXlsxFile, type XlsxSheet } from "../../../lib/xlsx-lite";

type Cell = string | number | boolean | null | undefined;
type Company = { id: string; name: string; corporate_registration_number: string };
type DataRow = Record<string, Cell>;
type ImportPayload = { companies: DataRow[]; contacts: DataRow[]; officers: DataRow[]; terms: DataRow[]; specialRecords: DataRow[]; workLogs: DataRow[] };

const headers = {
  companies: ["회사명*", "법인등록번호*"],
  contacts: ["관리ID", "법인등록번호*", "종류*", "구분명*", "담당자명", "연락처값*", "메모", "대표여부(Y/N)", "회원공개(Y/N)"],
  officers: ["관리ID", "법인등록번호*", "직책*", "성명*", "임기기산일*", "기본임기년수", "정기주총종결형(Y/N)", "예상정기주총월", "실제정기주총일", "상태", "메모"],
  terms: ["관리ID", "법인등록번호*", "유형*", "관리명*", "시작일", "종료일*", "사전알림개월", "말소등기필요(Y/N)", "상태", "메모"],
  special: ["관리ID", "법인등록번호*", "분류*", "관리명*", "내용", "기준일", "기한일", "알림일", "회원공개(Y/N)", "상태", "메모"],
  logs: ["관리ID", "법인등록번호*", "처리일*", "분류", "업무명*", "상세내용", "회원공개(Y/N)"],
} as const;

const guideSheet: XlsxSheet = { name: "안내", rows: [
  ["항목", "안내"],
  ["기본 원칙", "별표(*)가 붙은 항목은 필수입니다. 법인등록번호는 하이픈 없이 숫자 13자리로 입력합니다."],
  ["관리ID", "신규 행은 비워 둡니다. 사이트에서 내려받은 파일을 수정해 재업로드할 때는 관리ID를 변경하지 마세요."],
  ["날짜", "YYYY-MM-DD 형식을 권장합니다. Excel 날짜 셀도 읽습니다."],
  ["Y/N", "Y 또는 N으로 입력합니다. TRUE/FALSE, 1/0도 인식합니다."],
  ["연락처 종류", "email / phone / mobile / fax / website / other"],
  ["기간관리 유형", "convertible_bond / convertible_share / redeemable_share / other"],
  ["임원 상태", "active / renewed / resigned / expired / deleted"],
  ["기간 상태", "active / completed / cancelled / expired"],
  ["특별관리 상태", "active / completed / archived"],
  ["수정 원칙", "회사명은 법인등록번호 기준으로 갱신됩니다. 하위 데이터는 관리ID가 있으면 수정, 없으면 신규 추가됩니다."],
  ["예시", "예시는 이 안내 시트만 참고하고 실제 데이터 시트에는 입력할 자료만 기재해 주세요."],
]};

const blankTemplate: XlsxSheet[] = [
  guideSheet,
  { name: "회사", rows: [Array.from(headers.companies)] },
  { name: "연락처", rows: [Array.from(headers.contacts)] },
  { name: "임원", rows: [Array.from(headers.officers)] },
  { name: "기간관리", rows: [Array.from(headers.terms)] },
  { name: "특별관리", rows: [Array.from(headers.special)] },
  { name: "업무로그", rows: [Array.from(headers.logs)] },
];

function y(value: Cell) { return value ? "Y" : "N"; }
function cleanCorp(value: string) { return value.replace(/\D/g, ""); }
function boolValue(value: string, fallback = false) { const v=value.trim().toUpperCase(); if(["Y","YES","TRUE","1","예"].includes(v))return true;if(["N","NO","FALSE","0","아니오"].includes(v))return false;return fallback; }
function rowsToObjects(rows: string[][]) { if(!rows.length)return [] as Array<Record<string,string>>;const hs=rows[0].map(v=>v.trim());return rows.slice(1).filter(row=>row.some(v=>String(v??"").trim()!=="")).map(row=>Object.fromEntries(hs.map((h,i)=>[h,String(row[i]??"").trim()]))); }
function required(row:Record<string,string>,key:string,sheet:string,n:number){const v=row[key]?.trim();if(!v)throw new Error(`${sheet} 시트 ${n}행: '${key}' 항목이 필요합니다.`);return v;}
function corp(row:Record<string,string>,sheet:string,n:number){const v=cleanCorp(required(row,"법인등록번호*",sheet,n));if(!/^\d{13}$/.test(v))throw new Error(`${sheet} 시트 ${n}행: 법인등록번호는 숫자 13자리여야 합니다.`);return v;}

export default function AdminDataPage(){
 const router=useRouter();const[message,setMessage]=useState("");const[working,setWorking]=useState("");const[ready,setReady]=useState(false);
 useEffect(()=>{const check=async()=>{const s=getSession();if(!s){router.replace("/login");return;}const r=await rest(`profiles?id=eq.${s.user.id}&select=role,status`,s.access_token);const p=(await r.json())?.[0];if(!p||p.role!=="admin"||p.status!=="approved"){router.replace("/mypage");return;}setReady(true);};void check();},[router]);

 async function downloadTemplate(){try{setWorking("template");setMessage("");downloadBlob(await createXlsxBlob(blankTemplate),"숲법무사_회사데이터_일괄관리_양식.xlsx");}catch(e){setMessage(e instanceof Error?e.message:"양식을 만들지 못했습니다.");}finally{setWorking("");}}

 async function exportAll(){const s=getSession();if(!s)return;try{setWorking("export");setMessage("");const responses=await Promise.all([
  rest("companies?select=id,name,corporate_registration_number&order=name.asc",s.access_token),
  rest("company_contacts?select=id,company_id,contact_type,label,contact_name,value,note,is_primary,visible_to_client&order=company_id,created_at",s.access_token),
  rest("company_officers?select=id,company_id,position,officer_name,term_start_date,term_years,expires_at_regular_agm,expected_regular_agm_month,actual_regular_agm_date,status,notes&order=company_id,term_start_date",s.access_token),
  rest("company_term_items?select=id,company_id,item_type,title,start_date,end_date,reminder_months_before,requires_cancellation_registration,status,notes&order=company_id,end_date",s.access_token),
  rest("company_special_records?select=id,company_id,category,title,value_text,effective_date,due_date,reminder_date,visible_to_client,status,notes&order=company_id,due_date",s.access_token),
  rest("company_work_logs?select=id,company_id,work_date,category,title,description,visible_to_client&order=company_id,work_date.desc",s.access_token),
 ]);if(!responses.every(r=>r.ok))throw new Error("전체 데이터를 불러오지 못했습니다.");
 const [companies,contacts,officers,terms,special,logs]=await Promise.all(responses.map(r=>r.json())) as [Company[],DataRow[],DataRow[],DataRow[],DataRow[],DataRow[]];
 const corpMap=new Map(companies.map(c=>[c.id,c.corporate_registration_number]));
 const sheets:XlsxSheet[]=[guideSheet,
  {name:"회사",rows:[Array.from(headers.companies),...companies.map(c=>[c.name,c.corporate_registration_number])]},
  {name:"연락처",rows:[Array.from(headers.contacts),...contacts.map(r=>[r.id,corpMap.get(String(r.company_id))??"",r.contact_type,r.label,r.contact_name,r.value,r.note,y(r.is_primary),y(r.visible_to_client)])]},
  {name:"임원",rows:[Array.from(headers.officers),...officers.map(r=>[r.id,corpMap.get(String(r.company_id))??"",r.position,r.officer_name,r.term_start_date,r.term_years,y(r.expires_at_regular_agm),r.expected_regular_agm_month,r.actual_regular_agm_date,r.status,r.notes])]},
  {name:"기간관리",rows:[Array.from(headers.terms),...terms.map(r=>[r.id,corpMap.get(String(r.company_id))??"",r.item_type,r.title,r.start_date,r.end_date,r.reminder_months_before,y(r.requires_cancellation_registration),r.status,r.notes])]},
  {name:"특별관리",rows:[Array.from(headers.special),...special.map(r=>[r.id,corpMap.get(String(r.company_id))??"",r.category,r.title,r.value_text,r.effective_date,r.due_date,r.reminder_date,y(r.visible_to_client),r.status,r.notes])]},
  {name:"업무로그",rows:[Array.from(headers.logs),...logs.map(r=>[r.id,corpMap.get(String(r.company_id))??"",r.work_date,r.category,r.title,r.description,y(r.visible_to_client)])]},
 ];downloadBlob(await createXlsxBlob(sheets),`숲법무사_회사데이터_${new Date().toISOString().slice(0,10)}.xlsx`);
 }catch(e){setMessage(e instanceof Error?e.message:"Excel 내보내기 중 오류가 발생했습니다.");}finally{setWorking("");}}

 async function upload(event:ChangeEvent<HTMLInputElement>){const file=event.target.files?.[0];event.target.value="";if(!file)return;const s=getSession();if(!s)return;try{setWorking("upload");setMessage("");if(!file.name.toLowerCase().endsWith(".xlsx"))throw new Error(".xlsx 형식의 Excel 파일만 업로드할 수 있습니다.");const book=await parseXlsxFile(file);const companyRows=rowsToObjects(book["회사"]??[]);if(!companyRows.length)throw new Error("회사 시트에 등록할 회사가 없습니다.");const p:ImportPayload={companies:[],contacts:[],officers:[],terms:[],specialRecords:[],workLogs:[]};
 companyRows.forEach((r,i)=>p.companies.push({name:required(r,"회사명*","회사",i+2),corporate_registration_number:corp(r,"회사",i+2)}));
 rowsToObjects(book["연락처"]??[]).forEach((r,i)=>p.contacts.push({id:r["관리ID"]||null,corporate_registration_number:corp(r,"연락처",i+2),contact_type:required(r,"종류*","연락처",i+2),label:required(r,"구분명*","연락처",i+2),contact_name:r["담당자명"]||null,value:required(r,"연락처값*","연락처",i+2),note:r["메모"]||null,is_primary:boolValue(r["대표여부(Y/N)"],false),visible_to_client:boolValue(r["회원공개(Y/N)"],true)}));
 rowsToObjects(book["임원"]??[]).forEach((r,i)=>p.officers.push({id:r["관리ID"]||null,corporate_registration_number:corp(r,"임원",i+2),position:required(r,"직책*","임원",i+2),officer_name:required(r,"성명*","임원",i+2),term_start_date:required(r,"임기기산일*","임원",i+2),term_years:r["기본임기년수"]||"3",expires_at_regular_agm:boolValue(r["정기주총종결형(Y/N)"],false),expected_regular_agm_month:r["예상정기주총월"]||null,actual_regular_agm_date:r["실제정기주총일"]||null,status:r["상태"]||"active",notes:r["메모"]||null}));
 rowsToObjects(book["기간관리"]??[]).forEach((r,i)=>p.terms.push({id:r["관리ID"]||null,corporate_registration_number:corp(r,"기간관리",i+2),item_type:required(r,"유형*","기간관리",i+2),title:required(r,"관리명*","기간관리",i+2),start_date:r["시작일"]||null,end_date:required(r,"종료일*","기간관리",i+2),reminder_months_before:r["사전알림개월"]||"1",requires_cancellation_registration:boolValue(r["말소등기필요(Y/N)"],true),status:r["상태"]||"active",notes:r["메모"]||null}));
 rowsToObjects(book["특별관리"]??[]).forEach((r,i)=>p.specialRecords.push({id:r["관리ID"]||null,corporate_registration_number:corp(r,"특별관리",i+2),category:required(r,"분류*","특별관리",i+2),title:required(r,"관리명*","특별관리",i+2),value_text:r["내용"]||null,effective_date:r["기준일"]||null,due_date:r["기한일"]||null,reminder_date:r["알림일"]||null,visible_to_client:boolValue(r["회원공개(Y/N)"],false),status:r["상태"]||"active",notes:r["메모"]||null}));
 rowsToObjects(book["업무로그"]??[]).forEach((r,i)=>p.workLogs.push({id:r["관리ID"]||null,corporate_registration_number:corp(r,"업무로그",i+2),work_date:required(r,"처리일*","업무로그",i+2),category:r["분류"]||"기타",title:required(r,"업무명*","업무로그",i+2),description:r["상세내용"]||null,visible_to_client:boolValue(r["회원공개(Y/N)"],true)}));
 const response=await rest("rpc/admin_bulk_import_company_data",s.access_token,{method:"POST",body:JSON.stringify({p_payload:p})});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.message||data.details||"Excel 데이터를 반영하지 못했습니다.");setMessage(`일괄 반영 완료: 신규회사 ${data.companies_inserted??0}개, 회사갱신 ${data.companies_updated??0}개, 연락처 ${data.contacts??0}건, 임원 ${data.officers??0}건, 기간관리 ${data.terms??0}건, 특별관리 ${data.special_records??0}건, 업무로그 ${data.work_logs??0}건.`);
 }catch(e){setMessage(e instanceof Error?e.message:"Excel 업로드 중 오류가 발생했습니다.");}finally{setWorking("");}}

 if(!ready)return <AccountShell title="Excel 일괄관리" description="관리자 권한을 확인하고 있습니다."><p className="text-sm text-stone-500">확인 중입니다.</p></AccountShell>;
 return <AccountShell title="Excel 일괄관리" description="회사·연락처·임원·기간정보·특별관리·업무로그를 표준 XLSX 양식으로 일괄 관리합니다.">
  {message&&<p className="mb-6 rounded-xl bg-stone-100 p-4 text-sm leading-6 text-stone-700">{message}</p>}
  <div className="grid gap-4 md:grid-cols-3">
   <button disabled={Boolean(working)} onClick={()=>void downloadTemplate()} className="rounded-2xl border border-stone-200 bg-white p-6 text-left transition hover:border-emerald-700 disabled:opacity-50"><p className="font-extrabold">1. 표준 양식 다운로드</p><p className="mt-2 text-sm leading-6 text-stone-500">신규·미가입 거래처를 포함한 회사 데이터를 입력하는 빈 XLSX 양식입니다.</p></button>
   <label className={`cursor-pointer rounded-2xl border border-stone-200 bg-white p-6 text-left transition hover:border-emerald-700 ${working?"pointer-events-none opacity-50":""}`}><p className="font-extrabold">2. Excel 업로드</p><p className="mt-2 text-sm leading-6 text-stone-500">형식을 검증한 뒤 전체를 한 트랜잭션으로 반영합니다. 오류가 있으면 일부만 저장되지 않습니다.</p><input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={e=>void upload(e)}/></label>
   <button disabled={Boolean(working)} onClick={()=>void exportAll()} className="rounded-2xl border border-stone-200 bg-white p-6 text-left transition hover:border-emerald-700 disabled:opacity-50"><p className="font-extrabold">3. 전체 데이터 다운로드</p><p className="mt-2 text-sm leading-6 text-stone-500">현재 데이터를 관리ID와 함께 XLSX로 내려받아 수정 후 재업로드할 수 있습니다.</p></button>
  </div>
  <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-950"><p className="font-extrabold">업로드 안전장치</p><p className="mt-2">법인등록번호가 회사의 기준키입니다. 기존 법인은 회사명만 갱신되며, 관리ID가 있는 세부 행은 수정되고 관리ID가 없는 행만 신규 추가됩니다.</p><p className="mt-2">등기부등본·정관·주주명부 같은 실제 파일은 Excel 대상에서 제외하며 기존 비공개 문서 업로드 기능을 사용합니다.</p></section>
 </AccountShell>;
}
