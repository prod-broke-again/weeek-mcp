import pino from "pino";
import type { Logger } from "../../domain/ports/Logger.js";

export function createPinoLogger(level: string): Logger {
  const root = pino({
    level,
    // MCP owns stdout — never write logs there.
    transport: undefined,
  }, pino.destination({ dest: 2, sync: false }));

  const wrap = (instance: pino.Logger): Logger => ({
    debug: (msg, obj) => (obj ? instance.debug(obj, msg) : instance.debug(msg)),
    info: (msg, obj) => (obj ? instance.info(obj, msg) : instance.info(msg)),
    warn: (msg, obj) => (obj ? instance.warn(obj, msg) : instance.warn(msg)),
    error: (msg, obj) => (obj ? instance.error(obj, msg) : instance.error(msg)),
    child: (bindings) => wrap(instance.child(bindings)),
  });

  return wrap(root);
}
