"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "../lib/supabase-browser";

export function AuthenticatedArea({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session?.access_token) {
      router.replace("/login?next=/mypage");
      setChecked(true);
      return;
    }

    setAuthenticated(true);
    setChecked(true);
  }, [router]);

  if (!checked || !authenticated) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-5xl items-center justify-center px-6 text-sm text-stone-500">
        로그인 상태를 확인하고 있습니다.
      </div>
    );
  }

  return <>{children}</>;
}
