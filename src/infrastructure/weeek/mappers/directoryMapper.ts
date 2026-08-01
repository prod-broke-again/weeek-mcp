import type {
  CurrentUser,
  Member,
  Tag,
  Workspace,
} from "../../../domain/workspace/entities.js";
import { toBool } from "./primitives.js";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function mapWorkspace(dto: unknown): Workspace {
  const r = asRecord(dto);
  return {
    id: Number(r.id),
    title: String(r.title ?? ""),
    description: r.description === null || r.description === undefined ? null : String(r.description),
    isPersonal: toBool(r.isPersonal),
    logo: r.logo === null || r.logo === undefined ? null : String(r.logo),
  };
}

export function mapMember(dto: unknown): Member {
  const r = asRecord(dto);
  return {
    id: String(r.id ?? ""),
    email: String(r.email ?? ""),
    firstName: r.firstName === null || r.firstName === undefined ? null : String(r.firstName),
    lastName: r.lastName === null || r.lastName === undefined ? null : String(r.lastName),
    middleName: r.middleName === null || r.middleName === undefined ? null : String(r.middleName),
    position: r.position === null || r.position === undefined ? null : String(r.position),
    logo: r.logo === null || r.logo === undefined ? null : String(r.logo),
    timeZone: typeof r.timeZone === "string" ? r.timeZone : undefined,
  };
}

export function mapCurrentUser(dto: unknown): CurrentUser {
  const m = mapMember(dto);
  return {
    ...m,
    timeZone: typeof asRecord(dto).timeZone === "string" ? String(asRecord(dto).timeZone) : "UTC",
  };
}

export function mapTag(dto: unknown): Tag {
  const r = asRecord(dto);
  return {
    id: Number(r.id),
    title: String(r.title ?? ""),
    color: String(r.color ?? ""),
  };
}
