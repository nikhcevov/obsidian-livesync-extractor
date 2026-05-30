import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function loadFilter() {
  return import("../src/extractor/filter.js");
}

describe("classifyDoc", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.IMAGE_EXTENSIONS = "png,jpg,jpeg";
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("ignores chunk ids", async () => {
    const { classifyDoc } = await loadFilter();
    expect(classifyDoc({ _id: "h:abc", type: "leaf" })).toBe("ignored");
  });

  it("ignores deleted docs", async () => {
    const { classifyDoc } = await loadFilter();
    expect(
      classifyDoc({
        _id: "x",
        type: "plain",
        path: "posts/a.md",
        _deleted: true,
      }),
    ).toBe("ignored");
  });

  it("ignores conflicted docs", async () => {
    const { classifyDoc } = await loadFilter();
    expect(
      classifyDoc({
        _id: "x",
        type: "plain",
        path: "posts/a.md",
        _conflicts: ["rev-2"],
      }),
    ).toBe("ignored");
  });

  it("classifies vault markdown as post", async () => {
    const { classifyDoc } = await loadFilter();
    expect(
      classifyDoc({ _id: "x", type: "plain", path: "posts/hello.md" }),
    ).toBe("post");
  });

  it("classifies markdown anywhere in vault as post", async () => {
    const { classifyDoc } = await loadFilter();
    expect(
      classifyDoc({ _id: "x", type: "plain", path: "notes/hello.md" }),
    ).toBe("post");
  });

  it("ignores hidden markdown filenames", async () => {
    const { classifyDoc } = await loadFilter();
    expect(
      classifyDoc({ _id: "x", type: "plain", path: "posts/.hidden.md" }),
    ).toBe("ignored");
  });

  it("ignores non-markdown files", async () => {
    const { classifyDoc } = await loadFilter();
    expect(
      classifyDoc({ _id: "x", type: "plain", path: "posts/readme.txt" }),
    ).toBe("ignored");
  });

  it("classifies newnote images", async () => {
    const { classifyDoc } = await loadFilter();
    expect(
      classifyDoc({ _id: "x", type: "newnote", path: "assets/photo.PNG" }),
    ).toBe("image");
  });

  it("ignores newnote non-images", async () => {
    const { classifyDoc } = await loadFilter();
    expect(
      classifyDoc({ _id: "x", type: "newnote", path: "assets/doc.pdf" }),
    ).toBe("ignored");
  });
});

describe("isChunkId", () => {
  it("detects h: prefix", async () => {
    const { isChunkId } = await loadFilter();
    expect(isChunkId("h:chunk1")).toBe(true);
    expect(isChunkId("post:abc")).toBe(false);
  });
});
