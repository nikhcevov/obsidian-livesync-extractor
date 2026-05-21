import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { imageFilename, extractWikilinkRefs } from "../src/markdown/images.js";

vi.mock("../src/extractor/binary.js", () => ({
  reconstructBinary: vi.fn(async () => ({
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    path: "attachments/Pasted image 20260521145055.png",
    mtime: 1,
    size: 4,
  })),
}));

describe("imageFilename", () => {
  it("is stable for same vault path", () => {
    const a = imageFilename("assets/My Photo.png");
    const b = imageFilename("assets/My Photo.png");
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{8}-My_Photo\.png$/);
  });

  it("differs for different paths", () => {
    expect(imageFilename("a.png")).not.toBe(imageFilename("b.png"));
  });
});

describe("extractWikilinkRefs", () => {
  it("parses pasted image wikilink with spaces", () => {
    const refs = extractWikilinkRefs(
      "![[Pasted image 20260521145055.png]]",
    );
    expect(refs).toHaveLength(1);
    expect(refs[0]!.src).toBe("Pasted image 20260521145055.png");
    expect(refs[0]!.alt).toBe("Pasted image 20260521145055.png");
  });
});

describe("processImages", () => {
  let imageDir = "";

  beforeEach(async () => {
    imageDir = await mkdtemp(join(tmpdir(), "livesync-img-"));
    process.env.IMAGE_DIR = imageDir;
    process.env.IMAGE_URL_PREFIX = "/img";
    vi.resetModules();
  });

  afterEach(async () => {
    if (imageDir) await rm(imageDir, { recursive: true, force: true });
  });

  it("rewrites spaced wikilink to hashed static url", async () => {
    const { processImages } = await import("../src/markdown/images.js");
    const { ImageIndex } = await import("../src/extractor/imageIndex.js");

    const index = new ImageIndex();
    index.upsert(
      "img-doc",
      "attachments/Pasted image 20260521145055.png",
    );

    const { markdown, files } = await processImages(
      "![[Pasted image 20260521145055.png]]",
      index,
    );

    const filename = imageFilename(
      "attachments/Pasted image 20260521145055.png",
    );
    expect(markdown).toBe(
      `![Pasted image 20260521145055.png](/img/${filename})`,
    );
    expect(markdown).not.toContain("![[");
    expect(markdown).not.toMatch(/\]\(Pasted image /);
    expect(files).toEqual([filename]);
    await readFile(join(imageDir, filename));
  });
});
