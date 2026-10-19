import type { ReactNode } from "react";
import { AuthenticatedArea } from "../../components/authenticated-area";

export const metadata = { robots: { index: false, follow: false } };

export default function MemberLayout({ children }: { children: ReactNode }) {
  return <AuthenticatedArea>{children}</AuthenticatedArea>;
}
