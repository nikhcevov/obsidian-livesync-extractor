import matter from "gray-matter";
import { basename } from "node:path";

export interface FrontmatterResult {
  skip: boolean;
  reason?: string;
  content?: string;
  data?: Record<string, unknown>;
  slug?: string;
}

export function slugFromVaultPath(path: string): string {
  const name = basename(path);
  return name.endsWith(".md") ? name.slice(0, -3) : name;
}

function defaultTitle(path: string): string {
  return slugFromVaultPath(path);
}

function formatDate(mtime: number): string {
  return new Date(mtime).toISOString().slice(0, 10);
}

function trimString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeTags(value: unknown): string[] | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") {
    const tag = value.trim();
    return tag ? [tag] : undefined;
  }
  if (Array.isArray(value)) {
    const tags = value.filter(
      (item): item is string => typeof item === "string" && item.trim() !== "",
    );
    return tags.length > 0 ? tags : undefined;
  }
  return undefined;
}

function buildPublishedFrontmatter(
  src: Record<string, unknown>,
  filePath: string,
  mtime: number,
): { data: Record<string, unknown>; slug: string } {
  const slug = trimString(src.post_slug) ?? slugFromVaultPath(filePath);
  const data: Record<string, unknown> = {};

  data.title = trimString(src.post_title) ?? defaultTitle(filePath);
  data.date = src.post_date ?? formatDate(mtime);
  data.slug = slug;

  const description = trimString(src.post_description);
  if (description) data.description = description;

  const tags = normalizeTags(src.post_tags);
  if (tags) data.tags = tags;

  return { data, slug };
}

export function processFrontmatter(
  raw: string,
  filePath: string,
  mtime: number,
): FrontmatterResult {
  const parsed = matter(raw);
  const src = parsed.data as Record<string, unknown>;

  if (src.post_published !== true) {
    return { skip: true, reason: "not_published" };
  }

  const { data, slug } = buildPublishedFrontmatter(src, filePath, mtime);
  const content = matter.stringify(parsed.content, data);
  return { skip: false, content, data, slug };
}
