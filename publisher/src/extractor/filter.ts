import { config } from "../config.js";
import type { DocClass } from "./types.js";

const imageExtSet = new Set(
  config.imageExtensions.map((e) => (e.startsWith(".") ? e : `.${e}`).toLowerCase()),
);

function hasImageExtension(path: string): boolean {
  const lower = path.toLowerCase();
  for (const ext of imageExtSet) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
}

function basename(path: string): string {
  const i = path.lastIndexOf("/");
  return i >= 0 ? path.slice(i + 1) : path;
}

function isDeleted(doc: Record<string, unknown>): boolean {
  return Boolean(doc._deleted || doc.deleted);
}

function hasConflicts(doc: Record<string, unknown>): boolean {
  const c = doc._conflicts;
  return Array.isArray(c) && c.length > 0;
}

export function classifyDoc(doc: Record<string, unknown>): DocClass {
  const id = String(doc._id ?? "");
  if (id.startsWith("h:")) return "ignored";

  if (isDeleted(doc)) return "ignored";

  if (hasConflicts(doc)) return "ignored";

  const type = doc.type as string | undefined;
  const path = typeof doc.path === "string" ? doc.path : "";

  if (type === "plain" && path) {
    if (!path.endsWith(".md")) return "ignored";
    if (basename(path).startsWith(".")) return "ignored";
    return "post";
  }

  if (type === "newnote" && path && hasImageExtension(path)) {
    return "image";
  }

  return "ignored";
}

export function isChunkId(id: string): boolean {
  return id.startsWith("h:");
}
