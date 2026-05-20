import { basename } from "node:path";
import { log } from "../logger.js";

export class ImageIndex {
  private byBasename = new Map<string, string>();
  private byPath = new Map<string, string>();
  private reverse = new Map<string, Set<string>>();

  upsert(docId: string, path: string): void {
    const base = basename(path).toLowerCase();
    this.byBasename.set(base, docId);
    this.byPath.set(path, docId);
    this.byPath.set(path.toLowerCase(), docId);
    log.info({ docId, path }, "image_indexed");
  }

  remove(docId: string, path?: string): void {
    if (path) {
      const base = basename(path).toLowerCase();
      if (this.byBasename.get(base) === docId) this.byBasename.delete(base);
      this.byPath.delete(path);
      this.byPath.delete(path.toLowerCase());
    } else {
      for (const [k, v] of this.byBasename) {
        if (v === docId) this.byBasename.delete(k);
      }
      for (const [k, v] of this.byPath) {
        if (v === docId) this.byPath.delete(k);
      }
    }
  }

  resolve(ref: string): string | null {
    const trimmed = ref.trim();
    if (!trimmed) return null;

    const byPath = this.byPath.get(trimmed) ?? this.byPath.get(trimmed.toLowerCase());
    if (byPath) return byPath;

    const base = basename(trimmed).toLowerCase();
    return this.byBasename.get(base) ?? null;
  }

  linkPostToImage(postId: string, imageDocId: string): void {
    let set = this.reverse.get(imageDocId);
    if (!set) {
      set = new Set();
      this.reverse.set(imageDocId, set);
    }
    set.add(postId);
  }

  unlinkPostFromImage(postId: string, imageDocId: string): void {
    const set = this.reverse.get(imageDocId);
    if (!set) return;
    set.delete(postId);
    if (set.size === 0) this.reverse.delete(imageDocId);
  }

  rebuildReverseFromRefs(
    refs: Map<string, { images: string[] }>,
  ): void {
    this.reverse.clear();
    for (const [postId, ref] of refs) {
      for (const imageId of ref.images) {
        this.linkPostToImage(postId, imageId);
      }
    }
  }

  getPostsForImage(imageDocId: string): string[] {
    const set = this.reverse.get(imageDocId);
    return set ? [...set] : [];
  }

  entries(): IterableIterator<[string, string]> {
    return this.byPath.entries();
  }
}
