import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { config } from "../config.js";
import { log } from "../logger.js";

export function postOutputPath(slug: string): string {
  return join(config.contentDir, "posts", `${slug}.md`);
}

export async function writePost(
  slug: string,
  content: string,
): Promise<string> {
  const out = postOutputPath(slug);
  await mkdir(dirname(out), { recursive: true });
  const tmp = `${out}.tmp`;
  await writeFile(tmp, content, "utf8");
  await rename(tmp, out);
  log.info({ slug, out }, "doc_written");
  return out;
}

export async function removePost(slug: string): Promise<boolean> {
  const out = postOutputPath(slug);
  try {
    await unlink(out);
    log.info({ slug, out }, "doc_deleted");
    return true;
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === "ENOENT") return false;
    throw err;
  }
}
