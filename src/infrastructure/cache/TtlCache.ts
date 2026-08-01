import type { Cache } from "../../domain/ports/Cache.js";
import type { Clock } from "../../domain/ports/Clock.js";

interface Entry {
  value: unknown;
  expiresAt: number;
}

export class TtlCache implements Cache {
  private readonly store = new Map<string, Entry>();
  private readonly defaultTtlSeconds: number;
  private readonly clock: Clock;

  constructor(defaultTtlSeconds: number, clock: Clock = { now: () => new Date() }) {
    this.defaultTtlSeconds = defaultTtlSeconds;
    this.clock = clock;
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.clock.now().getTime()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds = this.defaultTtlSeconds): void {
    if (ttlSeconds <= 0) return;
    this.store.set(key, {
      value,
      expiresAt: this.clock.now().getTime() + ttlSeconds * 1000,
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}
