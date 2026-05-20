import { spawn } from "node:child_process";
import { config } from "../config.js";
import { log } from "../logger.js";

export async function verifyHugo(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(config.hugoBin, ["version"], { stdio: "ignore" });
    child.on("error", () =>
      reject(new Error(`Hugo binary not found: ${config.hugoBin}`)),
    );
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Hugo version check failed (code ${code})`));
    });
  });
}

export function runHugoBuild(): Promise<{ ok: boolean; durationMs: number }> {
  return new Promise((resolve) => {
    const start = Date.now();
    log.info({ source: config.hugoSite, dest: config.hugoDest }, "build_started");

    const child = spawn(
      config.hugoBin,
      [
        "--source",
        config.hugoSite,
        "--destination",
        config.hugoDest,
        "--minify",
        "--cleanDestinationDir",
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    let stderr = "";
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      const durationMs = Date.now() - start;
      if (code === 0) {
        log.info({ durationMs }, "build_finished");
        resolve({ ok: true, durationMs });
      } else {
        log.error({ code, durationMs, stderr: stderr.slice(0, 4000) }, "build_failed");
        resolve({ ok: false, durationMs });
      }
    });

    child.on("error", (err) => {
      const durationMs = Date.now() - start;
      log.error({ err, durationMs }, "build_failed");
      resolve({ ok: false, durationMs });
    });
  });
}
