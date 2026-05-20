import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function loadRefs() {
  return import("../src/state/refs.js");
}

describe("applyPostRefs", () => {
  let stateDir: string;

  beforeEach(async () => {
    vi.resetModules();
    stateDir = await mkdtemp(join(tmpdir(), "livesync-refs-"));
    process.env.STATE_DIR = stateDir;
    process.env.COUCHDB_URL = "http://localhost:5984";
    process.env.COUCHDB_DB = "test-db";
  });

  afterEach(async () => {
    vi.resetModules();
    await rm(stateDir, { recursive: true, force: true });
  });

  it("tracks image refcount across posts", async () => {
    const { applyPostRefs } = await loadRefs();
    const orphans: string[] = [];
    const onOrphan = async (f: string) => {
      orphans.push(f);
    };

    await applyPostRefs(
      "post-a",
      { images: ["img-1"], files: ["a.png"] },
      onOrphan,
    );
    await applyPostRefs(
      "post-b",
      { images: ["img-1"], files: ["b.png"] },
      onOrphan,
    );

    const counts = JSON.parse(
      await readFile(join(stateDir, "refcount.json"), "utf8"),
    ) as Record<string, number>;
    expect(counts["img-1"]).toBe(2);

    await applyPostRefs("post-a", { images: [], files: [] }, onOrphan);
    const after = JSON.parse(
      await readFile(join(stateDir, "refcount.json"), "utf8"),
    ) as Record<string, number>;
    expect(after["img-1"]).toBe(1);
    expect(orphans).toEqual(["a.png"]);
  });

  it("clears post refs and removes orphans", async () => {
    const { applyPostRefs, clearPostRefs } = await loadRefs();
    const orphans: string[] = [];
    const onOrphan = async (f: string) => {
      orphans.push(f);
    };

    await applyPostRefs(
      "post-x",
      { images: ["img-x"], files: ["x.png"] },
      onOrphan,
    );
    await clearPostRefs("post-x", onOrphan);

    expect(orphans).toEqual(["x.png"]);
    await expect(
      readFile(join(stateDir, "refs", `${Buffer.from("post-x").toString("base64url")}.json`)),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });
});
