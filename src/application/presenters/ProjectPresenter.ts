import type { Board, BoardColumn, Project } from "../../domain/project/entities.js";
import type { Config } from "../../infrastructure/config/Config.js";

export function aliasForProject(config: Config, projectId: number): string | undefined {
  for (const [alias, id] of Object.entries(config.projectAliases)) {
    if (id === projectId) return alias;
  }
  return undefined;
}

export function presentProjects(projects: Project[], config: Config): string {
  if (projects.length === 0) return "No projects visible (check token / WEEEK_READ_ONLY_PROJECTS).";
  return projects
    .map((p) => {
      const alias = aliasForProject(config, p.id);
      const aliasPart = alias ? ` alias=\`${alias}\`` : "";
      const def = config.defaultProjectId === p.id ? " **[default]**" : "";
      return `- #${p.id}${aliasPart}${def}: ${p.name}${p.isPrivate ? " (private)" : ""}`;
    })
    .join("\n");
}

export function presentProjectOverview(
  project: Project,
  boards: Board[],
  columnsByBoard: Map<number, BoardColumn[]>,
  config: Config,
): string {
  const alias = aliasForProject(config, project.id);
  const lines: string[] = [
    `# Project #${project.id}: ${project.name}`,
    alias ? `Alias: \`${alias}\`` : "",
    project.description ? `Description: ${project.description}` : "",
    `Private: ${project.isPrivate} | Status: ${project.status} | Team size: ${project.team.length}`,
    "",
    "## Boards",
  ].filter(Boolean);

  if (boards.length === 0) {
    lines.push("_No boards_");
  } else {
    for (const b of boards) {
      lines.push(`### Board #${b.id}: ${b.name}${b.isPrivate ? " (private)" : ""}`);
      const cols = columnsByBoard.get(b.id) ?? [];
      if (cols.length === 0) lines.push("- (no columns)");
      else for (const c of cols) lines.push(`- Column #${c.id}: ${c.name}`);
    }
  }
  return lines.join("\n");
}
