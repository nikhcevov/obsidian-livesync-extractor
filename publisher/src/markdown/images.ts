import { createHash } from "node:crypto";
import { mkdir, rename, stat, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import MarkdownIt from "markdown-it";
import { config } from "../config.js";
import { reconstructBinary } from "../extractor/binary.js";
import type { ImageIndex } from "../extractor/imageIndex.js";
import { log } from "../logger.js";

const WIKILINK_RE = /!\[\[([^\]\n]+?)(?:\|([^\]\n]+))?\]\]/g;

function safeBasename(path: string): string {
  const base = basename(path);
  return base.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function imageFilename(vaultPath: string): string {
  const hash = createHash("sha1").update(vaultPath).digest("hex").slice(0, 8);
  return `${hash}-${safeBasename(vaultPath)}`;
}

function publicUrl(filename: string): string {
  const prefix = config.imageUrlPrefix.replace(/\/$/, "");
  return `${prefix}/${filename}`;
}

function replaceWikilinks(
  markdown: string,
  index: ImageIndex,
): { text: string; pending: string[] } {
  const pending: string[] = [];
  const text = markdown.replace(WIKILINK_RE, (full, target: string, alt?: string) => {
    const ref = target.trim();
    const docId = index.resolve(ref);
    if (!docId) {
      pending.push(ref);
      log.warn({ ref }, "image_missing");
      return full;
    }
    const label = alt?.trim() || basename(ref);
    return `![${label}](${ref})`;
  });
  return { text, pending };
}

function extractMarkdownImageRefs(markdown: string): Array<{ alt: string; src: string; full: string }> {
  const md = new MarkdownIt();
  const refs: Array<{ alt: string; src: string; full: string }> = [];
  const tokens = md.parse(markdown, {});
  const src = markdown;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.type !== "inline" || !t.children) continue;
    for (const child of t.children) {
      if (child.type !== "image") continue;
      const alt = child.content ?? "";
      const href = child.attrGet("src") ?? "";
      if (!href || href.startsWith("http://") || href.startsWith("https://")) continue;
      const start = child.map?.[0] ?? 0;
      const end = child.map?.[1] ?? start;
      refs.push({ alt, src: href, full: src.slice(start, end) });
    }
  }

  return refs;
}

async function writeImageFile(
  filename: string,
  buffer: Buffer,
  mtime: number,
): Promise<void> {
  await mkdir(config.imageDir, { recursive: true });
  const dest = join(config.imageDir, filename);
  try {
    const st = await stat(dest);
    if (st.size === buffer.length && st.mtimeMs >= mtime) return;
  } catch {
    /* new file */
  }
  const tmp = `${dest}.tmp`;
  await writeFile(tmp, buffer);
  await rename(tmp, dest);
  log.info({ filename, bytes: buffer.length }, "image_written");
}

export interface ImageProcessResult {
  markdown: string;
  imageDocIds: string[];
  files: string[];
  pending: string[];
}

export async function processImages(
  markdown: string,
  index: ImageIndex,
): Promise<ImageProcessResult> {
  const { text: afterWiki, pending: wikiPending } = replaceWikilinks(
    markdown,
    index,
  );
  const refs = extractMarkdownImageRefs(afterWiki);
  const imageDocIds: string[] = [];
  const files: string[] = [];
  const pending = [...wikiPending];
  let result = afterWiki;

  for (const ref of refs) {
    const docId = index.resolve(ref.src);
    if (!docId) {
      pending.push(ref.src);
      log.warn({ ref: ref.src }, "image_missing");
      continue;
    }

    const binary = await reconstructBinary(docId);
    if (!binary) continue;

    const filename = imageFilename(binary.path);
    await writeImageFile(filename, binary.buffer, binary.mtime);
    const url = publicUrl(filename);
    const replacement = `![${ref.alt}](${url})`;
    result = result.replace(ref.full, replacement);

    if (!imageDocIds.includes(docId)) imageDocIds.push(docId);
    if (!files.includes(filename)) files.push(filename);
  }

  return { markdown: result, imageDocIds, files, pending };
}
