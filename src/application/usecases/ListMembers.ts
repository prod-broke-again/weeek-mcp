import type { DirectoryRepository } from "../../domain/ports/DirectoryRepository.js";
import { memberDisplayName } from "../../domain/workspace/entities.js";

export class ListMembers {
  constructor(private readonly directory: DirectoryRepository) {}

  async execute() {
    const members = await this.directory.members();
    const markdown =
      members.length === 0
        ? "No members."
        : members
            .map((m) => `- \`${m.id}\` ${memberDisplayName(m)} <${m.email}>${m.position ? ` — ${m.position}` : ""}`)
            .join("\n");

    return {
      markdown,
      structured: {
        members: members.map((m) => ({
          id: m.id,
          name: memberDisplayName(m),
          email: m.email,
          position: m.position,
        })),
      },
    };
  }
}
