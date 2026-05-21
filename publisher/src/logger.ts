import pino from "pino";
import { config } from "./config.js";
import { VERSION } from "./version.js";

export const log = pino({
  level: config.logLevel,
  base: { service: "livesync-publisher", version: VERSION },
  timestamp: pino.stdTimeFunctions.isoTime,
});
