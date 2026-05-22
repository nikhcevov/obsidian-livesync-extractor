import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function loadChanges() {
  return import("../src/couchdb/changes.js");
}

describe("shouldProcessChange", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.WATCH_FOLDERS = "posts/";
    process.env.IMAGE_EXTENSIONS = "png,jpg,jpeg";
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("processes couch tombstones", async () => {
    const { shouldProcessChange } = await loadChanges();
    expect(shouldProcessChange(undefined, true)).toBe(true);
  });

  it("processes livesync soft deletes", async () => {
    const { shouldProcessChange } = await loadChanges();
    expect(
      shouldProcessChange(
        {
          _id: "abc123",
          type: "plain",
          path: "posts/hello.md",
          deleted: true,
        },
        false,
      ),
    ).toBe(true);
  });

  it("ignores unrelated docs", async () => {
    const { shouldProcessChange } = await loadChanges();
    expect(
      shouldProcessChange({ _id: "x", type: "syncinfo" }, false),
    ).toBe(false);
  });
});
