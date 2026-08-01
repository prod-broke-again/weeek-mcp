import type { DirectoryRepository } from "../../domain/ports/DirectoryRepository.js";

export class ListTags {
  constructor(private readonly directory: DirectoryRepository) {}

  async execute() {
    const tags = await this.directory.tags();
    const markdown =
      tags.length === 0
        ? "No tags."
        : tags.map((t) => `- #${t.id} ${t.title} (\`${t.color}\`)`).join("\n");

    return {
      markdown,
      structured: { tags },
    };
  }
}
