import { describe, expect, it } from "vitest";
import { ImageIndex } from "../src/extractor/imageIndex.js";

describe("ImageIndex", () => {
  it("resolves by path and basename", () => {
    const index = new ImageIndex();
    index.upsert("doc-1", "assets/Photo.PNG");
    expect(index.resolve("assets/Photo.PNG")).toBe("doc-1");
    expect(index.resolve("photo.png")).toBe("doc-1");
  });

  it("tracks post links and rebuilds reverse map", () => {
    const index = new ImageIndex();
    index.linkPostToImage("post-a", "img-1");
    index.linkPostToImage("post-b", "img-1");
    expect(index.getPostsForImage("img-1").sort()).toEqual(["post-a", "post-b"]);

    index.rebuildReverseFromRefs(
      new Map([["post-c", { images: ["img-2"] }]]),
    );
    expect(index.getPostsForImage("img-2")).toEqual(["post-c"]);
    expect(index.getPostsForImage("img-1")).toEqual([]);
  });

  it("removes entries by doc id", () => {
    const index = new ImageIndex();
    index.upsert("doc-1", "a/x.png");
    index.remove("doc-1", "a/x.png");
    expect(index.resolve("x.png")).toBeNull();
  });
});
