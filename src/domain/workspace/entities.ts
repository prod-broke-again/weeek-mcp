import type { TagId, UserId } from "../shared/types.js";

export interface Workspace {
  id: number;
  title: string;
  description: string | null;
  isPersonal: boolean;
  logo: string | null;
}

export interface Member {
  id: UserId;
  email: string;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  position: string | null;
  logo: string | null;
  timeZone?: string;
}

export interface CurrentUser {
  id: UserId;
  email: string;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  position: string | null;
  logo: string | null;
  timeZone: string;
}

export interface Tag {
  id: TagId;
  title: string;
  color: string;
}

export function memberDisplayName(m: Pick<Member, "firstName" | "lastName" | "email">): string {
  const name = [m.firstName, m.lastName].filter(Boolean).join(" ").trim();
  return name || m.email;
}
