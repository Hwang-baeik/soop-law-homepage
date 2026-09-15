"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AccountShell, fieldClassName, primaryButtonClassName } from "../../../components/account-shell";
import { getSession, rest } from "../../../lib/supabase-browser";

type RequestRow={id:string;company_name:string;corporate_registration_number:string;relationship_note:string|null;status:string;requested_at:string;admin_note:string|null};

export default function CompanyRequestPage(){
 const router=useRouter(); const [rows,setRows]=useState<RequestRow[]>([]); const [message,setMessage]=useState(""); const [working,setWorking]=useState(false);
 async function load(){const s=getSession(); if(!s){router.replace("/login");return;} const r=await rest(`company_access_requests?user_id=eq.${s.user.id}&select=id,company_name,corporate_registration_number,relationship_note,status,requested_at,admin_note&order=requested_at.desc`,s.access_token); if(r.ok)setRows(await r.json());}
 useEffect(()=>{void load();},[]);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault(); const s=getSession(); if(!s)return; const f=new FormData(e.currentTarget); const corp=String(f.get("corp")??"").replace(/\D/g,""); if(!/^\d{13}$/.test(corp)){setMessage("법인등록번호는 숫자 13자리로 입력해 주세요.");return;} try{setWorking(true);setMessage(""); const r=await rest("rpc/request_company_access",s.access_token,{method:"POST",body:JSON.stringify({p_company_name:String(f.get("name")??"").trim(),p_corporate_registration_number:corp,p_relationship_note:String(f.get("note")??"").trim()||null})}); if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error(d.message||"추가 요청을 처리하지 못했습니다.");} e.currentTarget.reset();setMessage("관리할 법인 추가 요청을 접수했습니다. 관리자 승인 후 내 회사에 표시됩니다.");await load();}catch(err){setMessage(err instanceof Error?err.message:"요청 중 오류가 발생했습니다.");}finally{setWorking(false);}}
 const label=(s:string)=>s==="approved"?"승인":s==="rejected"?"거절":s==="cancelled"?"취소":"검토 대기";
 return <AccountShell title="관리할 법인 추가 요청" description="한 계정으로 여러 법인을 관리해야 하는 경우 연결을 요청할 수 있습니다.">
  <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-5">
   <label className="grid gap-2 text-sm font-semibold">회사명<input name="name" required className={fieldClassName}/></label>
   <label className="grid gap-2 text-sm font-semibold">법인등록번호<input name="corp" required inputMode="numeric" maxLength={13} className={fieldClassName} placeholder="숫자 13자리"/></label>
   <label className="grid gap-2 text-sm font-semibold">관계 또는 요청사유<textarea name="note" rows={3} className={fieldClassName} placeholder="예: 대표자로 재직 중인 추가 법인, 그룹사 관리 담당 등"/></label>
   <button disabled={working} className={primaryButtonClassName}>{working?"요청 중...":"추가법인 연결 요청"}</button>
  </form>
  {message&&<p className="mt-4 rounded-xl bg-stone-100 p-4 text-sm">{message}</p>}
  <section className="mt-8"><h2 className="text-lg font-extrabold">요청내역</h2><div className="mt-3 grid gap-3">{rows.length?rows.map(r=><div key={r.id} className="rounded-2xl border border-stone-200 bg-white p-4"><div className="flex flex-wrap justify-between gap-2"><div><p className="font-bold">{r.company_name}</p><p className="mt-1 text-sm text-stone-500">{r.corporate_registration_number}</p></div><span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold">{label(r.status)}</span></div>{r.admin_note&&<p className="mt-3 text-sm text-stone-600">관리자 메모: {r.admin_note}</p>}</div>):<p className="rounded-xl bg-stone-50 p-5 text-sm text-stone-500">아직 추가 요청이 없습니다.</p>}</div></section>
  <div className="mt-6"><Link href="/mypage" className="text-sm font-bold text-emerald-900">← 내 회사</Link></div>
 </AccountShell>;
}