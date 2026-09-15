"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AccountShell } from "../../../components/account-shell";
import { getSession, rest } from "../../../lib/supabase-browser";

type Deadline={source_type:"officer"|"term_item";source_id:string;company_id:string;company_name:string;category:string;title:string;person_name:string|null;target_date:string|null;reminder_date:string|null;status:string;details:Record<string,unknown>};
const dayMs=86400000;
function dateLabel(v:string|null){return v?v.replaceAll("-","."):"미확정";}
function daysUntil(v:string|null,today:string){if(!v)return null;return Math.ceil((Date.parse(`${v}T00:00:00Z`)-Date.parse(`${today}T00:00:00Z`))/dayMs);}
function urgency(row:Deadline,today:string){const target=daysUntil(row.target_date,today);const reminder=daysUntil(row.reminder_date,today);if(target!==null&&target<0)return{label:"기한 경과",className:"bg-red-100 text-red-900"};if(reminder!==null&&reminder<=0)return{label:"준비 필요",className:"bg-amber-100 text-amber-950"};if(target!==null&&target<=30)return{label:"30일 이내",className:"bg-orange-100 text-orange-900"};if(target!==null&&target<=90)return{label:"90일 이내",className:"bg-blue-50 text-blue-800"};return{label:"향후 예정",className:"bg-stone-100 text-stone-700"};}

export default function DeadlineAdminPage(){
 const router=useRouter();const[rows,setRows]=useState<Deadline[]>([]);const[message,setMessage]=useState("");const[loading,setLoading]=useState(true);
 useEffect(()=>{const load=async()=>{const s=getSession();if(!s){router.replace("/login");return;}try{const pr=await rest(`profiles?id=eq.${s.user.id}&select=role,status`,s.access_token);const p=(await pr.json())?.[0];if(!p||p.status!=="approved"||!["admin","staff"].includes(p.role)){router.replace("/mypage");return;}const r=await rest("rpc/list_upcoming_company_deadlines",s.access_token,{method:"POST",body:"{}"});if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.message||"기한정보를 불러오지 못했습니다.");}setRows(await r.json());}catch(e){setMessage(e instanceof Error?e.message:"기한정보 조회 중 오류가 발생했습니다.");}finally{setLoading(false);}};void load();},[router]);
 const today=new Date().toISOString().slice(0,10);
 const sorted=useMemo(()=>[...rows].sort((a,b)=>(a.target_date||"9999-12-31").localeCompare(b.target_date||"9999-12-31")),[rows]);
 const summary=useMemo(()=>({overdue:rows.filter(r=>{const d=daysUntil(r.target_date,today);return d!==null&&d<0;}).length,action:rows.filter(r=>{const rd=daysUntil(r.reminder_date,today);const td=daysUntil(r.target_date,today);return !(td!==null&&td<0)&&rd!==null&&rd<=0;}).length,d30:rows.filter(r=>{const d=daysUntil(r.target_date,today);return d!==null&&d>=0&&d<=30;}).length,d90:rows.filter(r=>{const d=daysUntil(r.target_date,today);return d!==null&&d>30&&d<=90;}).length}),[rows,today]);
 return <AccountShell title="기한관리" description="임원 임기·전환사채·전환주식·상환주식 등 기간관리 데이터를 가까운 순서로 통합 조회합니다.">
  {message&&<p className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{message}</p>}
  {loading?<p className="text-sm text-stone-500">기한정보를 불러오는 중입니다.</p>:<>
   <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-2xl border border-red-200 bg-red-50 p-5"><p className="text-xs font-bold text-red-800">기한 경과</p><p className="mt-2 text-3xl font-black text-red-950">{summary.overdue}</p></div><div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><p className="text-xs font-bold text-amber-800">준비 알림 도래</p><p className="mt-2 text-3xl font-black text-amber-950">{summary.action}</p></div><div className="rounded-2xl border border-stone-200 bg-white p-5"><p className="text-xs font-bold text-stone-500">30일 이내</p><p className="mt-2 text-3xl font-black">{summary.d30}</p></div><div className="rounded-2xl border border-stone-200 bg-white p-5"><p className="text-xs font-bold text-stone-500">31~90일</p><p className="mt-2 text-3xl font-black">{summary.d90}</p></div></div>
   <p className="mt-5 rounded-xl bg-stone-50 p-4 text-sm leading-6 text-stone-600">정기주주총회 종결형 임원은 해당 개최연도 1월 1일부터 준비 알림 대상으로 계산합니다. 일반 임원은 임기말이 속한 달의 초일 1개월 전부터 준비 대상으로 표시합니다.</p>
   <div className="mt-6 overflow-x-auto rounded-2xl border border-stone-200 bg-white"><table className="w-full min-w-[900px] text-sm"><thead className="bg-stone-50 text-stone-600"><tr><th className="px-4 py-3 text-left">상태</th><th className="px-4 py-3 text-left">회사</th><th className="px-4 py-3 text-left">분류</th><th className="px-4 py-3 text-left">관리사항</th><th className="px-4 py-3 text-left">대상자</th><th className="px-4 py-3 text-left">알림일</th><th className="px-4 py-3 text-left">기준 기한</th><th className="px-4 py-3 text-right">남은 기간</th></tr></thead><tbody>{sorted.length?sorted.map(row=>{const u=urgency(row,today);const d=daysUntil(row.target_date,today);return <tr key={`${row.source_type}-${row.source_id}`} className="border-t border-stone-100"><td className="px-4 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${u.className}`}>{u.label}</span></td><td className="px-4 py-4 font-bold"><Link href={`/admin/company/${row.company_id}`} className="text-emerald-900 hover:underline">{row.company_name}</Link></td><td className="px-4 py-4">{row.category}</td><td className="px-4 py-4 font-semibold">{row.title}</td><td className="px-4 py-4 text-stone-600">{row.person_name||"-"}</td><td className="px-4 py-4">{dateLabel(row.reminder_date)}</td><td className="px-4 py-4">{dateLabel(row.target_date)}</td><td className="px-4 py-4 text-right font-bold">{d===null?"미확정":d<0?`${Math.abs(d)}일 경과`:d===0?"오늘":`${d}일`}</td></tr>}):<tr><td colSpan={8} className="px-4 py-8 text-center text-stone-500">등록된 기간관리 데이터가 없습니다.</td></tr>}</tbody></table></div>
  </>}
 </AccountShell>;
}
