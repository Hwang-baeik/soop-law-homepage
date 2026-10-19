import type { ReactNode } from "react";
import { AdminNav } from "../../components/admin-nav";
import { AuthenticatedArea } from "../../components/authenticated-area";

export const metadata = { robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthenticatedArea internal>
      <AdminNav />
      {children}
    </AuthenticatedArea>
  );
}
