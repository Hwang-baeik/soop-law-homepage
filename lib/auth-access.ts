export type ApprovedProfile = {
  role: "admin" | "staff" | "client";
  status: string;
  must_change_password?: boolean;
};

export function accessRedirect(profile: ApprovedProfile | null, internal: boolean): string | null {
  if (!profile || profile.status !== "approved" || !["admin", "staff", "client"].includes(profile.role)) return "/login";
  if (profile.must_change_password) return "/change-password?required=1";
  if (internal && profile.role === "client") return "/mypage";
  return null;
}
