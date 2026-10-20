import type { ReactNode } from "react";
import { AuthenticatedArea } from "../../components/authenticated-area";

export const metadata = { robots: { index: false, follow: false } };

export default function AccountSettingsLayout({ children }: { children: ReactNode }) {
  return <AuthenticatedArea>{children}</AuthenticatedArea>;
}
