import matter from "gray-matter";
import { basename } from "node:path";

export interface FrontmatterResult {
  skip: boolean;
  reason?: string;
  content?: string;
  data?: Record<string, unknown>;
}

function defaultTitle(path: string): string {
  const name = basename(path);
  return name.endsWith(".md") ? name.slice(0, -3) : name;
}

function formatDate(mtime: number): string {
  return new Date(mtime).toISOString().slice(0, 10);
}

export function processFrontmatter(
  raw: string,
  filePath: string,
  mtime: number,
): FrontmatterResult {
  const parsed = matter(raw);
  const data = { ...(parsed.data as Record<string, unknown>) };

  if (data.published !== true) {
    return { skip: true, reason: "not_published" };
  }

  if (!data.title) data.title = defaultTitle(filePath);
  if (!data.date) data.date = formatDate(mtime);

  delete data.published;
  delete data.draft;

  const content = matter.stringify(parsed.content, data);
  return { skip: false, content, data };
}
