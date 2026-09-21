"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSession, rest } from "../lib/supabase-browser";

type StaffPermission = { can_manage_deadlines: boolean; is_active: boolean };

const adminLinks = [
  ["회원관리", "/admin"],
  ["회원-회사 연결", "/admin/access"],
  ["직원관리", "/admin/staff"],
  ["회사관리", "/admin/companies"],
  ["견적서 자동작성", "/admin/estimates"],
  ["Excel 일괄관리", "/admin/data"],
  ["기한관리", "/admin/deadlines"],
  ["탈퇴관리", "/admin/withdrawals"],
  ["보안", "/admin/security"],
] as const;

export function AdminNav() {
  const [role, setRole] = useState<"admin" | "staff" | null>(null);
  const [staffPermission, setStaffPermission] = useState<StaffPermission | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const session = getSession();
      if (!session) return;
      try {
        const response = await rest(`profiles?id=eq.${session.user.id}&select=role,status`, session.access_token);
        if (!response.ok) return;
        const profile = (await response.json())?.[0];
        if (!profile || profile.status !== "approved" || !["admin", "staff"].includes(profile.role)) return;
        if (cancelled) return;
        setRole(profile.role);
        if (profile.role === "staff") {
          const pr = await rest(`office_staff_permissions?user_id=eq.${session.user.id}&select=can_manage_deadlines,is_active`, session.access_token);
          if (pr.ok && !cancelled) setStaffPermission((await pr.json())?.[0] || null);
        }
      } catch {}
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const links = role === "admin"
    ? adminLinks
    : role === "staff" && staffPermission?.is_active
      ? ([
          ["회사관리", "/admin/companies"],
          ["견적서 자동작성", "/admin/estimates"],
          ...(staffPermission.can_manage_deadlines ? [["기한관리", "/admin/deadlines"]] as const : []),
        ] as const)
      : [];

  return (
    <div className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
        <span className="mr-2 text-sm font-extrabold text-emerald-950">숲 법무사 · {role === "staff" ? "직원" : "관리자"}</span>
        {links.map(([label, href]) => (
          <Link key={href} href={href} className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm font-semibold text-stone-700 hover:border-emerald-800 hover:text-emerald-900">{label}</Link>
        ))}
      </nav>
    </div>
  );
}
