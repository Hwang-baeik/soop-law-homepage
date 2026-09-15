export type AccountRole = "admin" | "staff" | "client";
export type AccountStatus = "pending" | "approved" | "rejected" | "suspended";

export type MemberProfile = {
  id: string;
  companyName: string;
  applicantName: string;
  corporateRegistrationNumber: string;
  phone: string;
  role: AccountRole;
  status: AccountStatus;
  createdAt: string;
};

export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,}$/;
export const CORPORATE_NUMBER_PATTERN = /^\d{13}$/;
