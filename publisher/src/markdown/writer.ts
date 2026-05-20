import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { config } from "../config.js";
import { log } from "../logger.js";

function slugFromPath(path: string): string {
  const name = path.split("/").pop() ?? path;
  return name.endsWith(".md") ? name.slice(0, -3) : name;
}

export function postOutputPath(vaultPath: string): string {
  const slug = slugFromPath(vaultPath);
  return join(config.contentDir, "posts", `${slug}.md`);
}

export async function writePost(
  vaultPath: string,
  content: string,
): Promise<string> {
  const out = postOutputPath(vaultPath);
  await mkdir(dirname(out), { recursive: true });
  const tmp = `${out}.tmp`;
  await writeFile(tmp, content, "utf8");
  await rename(tmp, out);
  log.info({ path: vaultPath, out }, "doc_written");
  return out;
}

export async function removePost(vaultPath: string): Promise<boolean> {
  const out = postOutputPath(vaultPath);
  try {
    await unlink(out);
    log.info({ path: vaultPath, out }, "doc_deleted");
    return true;
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === "ENOENT") return false;
    throw err;
  }
}
