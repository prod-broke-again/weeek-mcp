import type { DirectoryRepository } from "../../../domain/ports/DirectoryRepository.js";
import type { CurrentUser, Member, Tag, Workspace } from "../../../domain/workspace/entities.js";
import type { Cache } from "../../../domain/ports/Cache.js";
import type { WeeekHttpClient } from "../WeeekHttpClient.js";
import {
  mapCurrentUser,
  mapMember,
  mapTag,
  mapWorkspace,
} from "../mappers/directoryMapper.js";
import {
  currentUser,
  membersList,
  tagsList,
  workspaceInfo,
} from "../endpoints/directory.js";

export class WeeekDirectoryRepository implements DirectoryRepository {
  constructor(
    private readonly http: WeeekHttpClient,
    private readonly cache: Cache,
  ) {}

  async me(): Promise<CurrentUser> {
    const cached = this.cache.get<CurrentUser>("dir:me");
    if (cached) return cached;
    const dto = await this.http.request<unknown>(currentUser.path, {
      envelopeKey: currentUser.envelopeKey,
    });
    const user = mapCurrentUser(dto);
    this.cache.set("dir:me", user);
    return user;
  }

  async workspace(): Promise<Workspace> {
    const cached = this.cache.get<Workspace>("dir:workspace");
    if (cached) return cached;
    const dto = await this.http.request<unknown>(workspaceInfo.path, {
      envelopeKey: workspaceInfo.envelopeKey,
    });
    const ws = mapWorkspace(dto);
    this.cache.set("dir:workspace", ws);
    return ws;
  }

  async members(): Promise<Member[]> {
    const cached = this.cache.get<Member[]>("dir:members");
    if (cached) return cached;
    const dto = await this.http.request<unknown[]>(membersList.path, {
      envelopeKey: membersList.envelopeKey,
    });
    const members = (Array.isArray(dto) ? dto : []).map(mapMember);
    this.cache.set("dir:members", members);
    return members;
  }

  async tags(): Promise<Tag[]> {
    const cached = this.cache.get<Tag[]>("dir:tags");
    if (cached) return cached;
    const dto = await this.http.request<unknown[]>(tagsList.path, {
      envelopeKey: tagsList.envelopeKey,
    });
    const tags = (Array.isArray(dto) ? dto : []).map(mapTag);
    this.cache.set("dir:tags", tags);
    return tags;
  }
}
