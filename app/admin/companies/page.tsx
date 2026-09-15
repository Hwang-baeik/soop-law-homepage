"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AccountShell, fieldClassName, primaryButtonClassName } from "../../../components/account-shell";
import { getSession, rest } from "../../../lib/supabase-browser";

type Company = { id: string; name: string; corporate_registration_number: string; created_at: string };
type Membership = { company_id: string };

export default function AdminCompaniesPage() {
  const router = useRouter();
  const [companies,setCompanies]=useState<Company[]>([]);
  const [linkedCounts,setLinkedCounts]=useState<Record<string,number>>({});
  const [message,setMessage]=useState("");
  const [loading,setLoading]=useState(true);
  const [isAdmin,setIsAdmin]=useState(false);
  const [working,setWorking]=useState(false);

  async function load(){
    const session=getSession();
    if(!session){router.replace("/login");return;}
    try{
      const pr=await rest(`profiles?id=eq.${session.user.id}&select=role,status`,session.access_token);
      const profile=(await pr.json())?.[0];
      if(!profile||profile.status!=="approved"||!["admin","staff"].includes(profile.role)){router.replace("/mypage");return;}
      const admin=profile.role==="admin";
      setIsAdmin(admin);
      const r=await rest("companies?select=id,name,corporate_registration_number,created_at&order=name.asc",session.access_token);
      if(!r.ok)throw new Error("관리 가능한 회사 목록을 불러오지 못했습니다.");
      setCompanies(await r.json());
      if(admin){
        const mr=await rest("company_members?select=company_id&is_active=eq.true",session.access_token);
        if(mr.ok){
          const counts:Record<string,number>={};
          (await mr.json() as Membership[]).forEach(row=>{counts[row.company_id]=(counts[row.company_id]??0)+1;});
          setLinkedCounts(counts);
        }
      }
    }catch(e){setMessage(e instanceof Error?e.message:"회사 목록 조회 중 오류가 발생했습니다.");}
    finally{setLoading(false);}
  }
  useEffect(()=>{void load();},[]);

  async function createCompany(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const s=getSession();if(!s)return;
    const f=new FormData(e.currentTarget);
    const corp=String(f.get("corp")??"").replace(/\D/g,"");
    if(!/^\d{13}$/.test(corp)){setMessage("법인등록번호는 숫자 13자리로 입력해 주세요.");return;}
    try{
      setWorking(true);
      const r=await rest("companies",s.access_token,{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({name:String(f.get("name")??"").trim(),corporate_registration_number:corp})});
      if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error(d.message||"회사를 등록하지 못했습니다.");}
      e.currentTarget.reset();
      setMessage("회사를 먼저 등록했습니다. 회원을 연결하기 전에는 일반회원에게 노출되지 않습니다.");
      await load();
    }catch(err){setMessage(err instanceof Error?err.message:"회사 등록 중 오류가 발생했습니다.");}
    finally{setWorking(false);}
  }

  return <AccountShell title="회사관리" description="회원가입 여부와 무관하게 거래처 회사를 먼저 등록하고, 이후 회원·연락처·업무로그·임원·기간정보·문서를 연결할 수 있습니다.">
   {message&&<p className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{message}</p>}
   {isAdmin&&<form onSubmit={createCompany} className="mb-8 rounded-2xl border border-stone-200 bg-white p-5">
    <div className="mb-4"><h2 className="font-extrabold text-stone-950">거래처 회사 선등록</h2><p className="mt-1 text-sm leading-6 text-stone-500">회원가입하지 않은 기존 거래처도 회사만 먼저 등록할 수 있습니다. 회원 연결 전에는 일반회원에게 조회되지 않으며, 기본적으로 관리자만 관리합니다.</p></div>
    <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]"><label className="grid gap-2 text-sm font-semibold">회사명<input name="name" required className={fieldClassName}/></label><label className="grid gap-2 text-sm font-semibold">법인등록번호<input name="corp" required maxLength={13} inputMode="numeric" className={fieldClassName}/></label><button disabled={working} className={`${primaryButtonClassName} md:self-end`}>회사 등록</button></div>
   </form>}
   {loading?<p className="text-sm text-stone-500">불러오는 중입니다.</p>:<div className="grid gap-3">{companies.length===0?<p className="rounded-xl bg-stone-50 p-5 text-sm text-stone-500">현재 관리 가능한 회사가 없습니다.</p>:companies.map(company=>{const linked=linkedCounts[company.id]??0;return <Link key={company.id} href={`/admin/company/${company.id}`} className="block rounded-2xl border border-stone-200 bg-white p-5 transition hover:border-emerald-800 hover:shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-extrabold text-stone-950">{company.name}</p><p className="mt-1 text-sm text-stone-500">법인등록번호 {company.corporate_registration_number}</p></div>{isAdmin&&<span className={`rounded-full px-3 py-1 text-xs font-bold ${linked===0?"bg-amber-100 text-amber-950":"bg-emerald-50 text-emerald-900"}`}>{linked===0?"회원 미연결 · 관리자 전용":`연결 회원 ${linked}명`}</span>}</div><p className="mt-3 text-sm font-semibold text-emerald-900">관리정보 열기 →</p></Link>})}</div>}
  </AccountShell>;
}
