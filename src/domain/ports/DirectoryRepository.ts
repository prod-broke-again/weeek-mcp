import type { CurrentUser, Member, Tag, Workspace } from "../workspace/entities.js";

export interface DirectoryRepository {
  me(): Promise<CurrentUser>;
  workspace(): Promise<Workspace>;
  members(): Promise<Member[]>;
  tags(): Promise<Tag[]>;
}
