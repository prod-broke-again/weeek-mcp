import type { Board, BoardColumn, Project } from "../../../domain/project/entities.js";
import { toBool } from "./primitives.js";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function mapProject(dto: unknown): Project {
  const r = asRecord(dto);
  return {
    id: Number(r.id),
    name: String(r.name ?? r.title ?? ""),
    description: r.description === null || r.description === undefined ? null : String(r.description),
    color: String(r.color ?? ""),
    status: Number(r.status ?? 1),
    isPrivate: toBool(r.isPrivate),
    portfolioId: r.portfolioId === null || r.portfolioId === undefined ? null : Number(r.portfolioId),
    logoLink: r.logoLink === null || r.logoLink === undefined ? null : String(r.logoLink),
    team: Array.isArray(r.team) ? r.team.map(String) : [],
  };
}

export function mapBoard(dto: unknown): Board {
  const r = asRecord(dto);
  return {
    id: Number(r.id),
    name: String(r.name ?? ""),
    projectId: Number(r.projectId),
    isPrivate: toBool(r.isPrivate),
  };
}

export function mapBoardColumn(dto: unknown): BoardColumn {
  const r = asRecord(dto);
  return {
    id: Number(r.id),
    name: String(r.name ?? ""),
    boardId: Number(r.boardId),
  };
}
