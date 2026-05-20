import { describe, expect, it } from "vitest";
import { processFrontmatter } from "../src/markdown/frontmatter.js";

describe("processFrontmatter", () => {
  it("skips when published is not true", () => {
    const result = processFrontmatter("body", "posts/draft.md", 0);
    expect(result.skip).toBe(true);
    expect(result.reason).toBe("not_published");
  });

  it("skips when published is false", () => {
    const result = processFrontmatter(
      "---\npublished: false\n---\nbody",
      "posts/draft.md",
      0,
    );
    expect(result.skip).toBe(true);
  });

  it("publishes and strips published/draft", () => {
    const mtime = Date.parse("2026-05-20T12:00:00Z");
    const result = processFrontmatter(
      "---\npublished: true\ndraft: true\n---\nHello",
      "posts/my-post.md",
      mtime,
    );
    expect(result.skip).toBe(false);
    expect(result.content).toContain("Hello");
    expect(result.content).not.toContain("published:");
    expect(result.content).not.toContain("draft:");
    expect(result.data?.title).toBe("my-post");
    expect(result.data?.date).toBe("2026-05-20");
  });

  it("keeps explicit title and date", () => {
    const result = processFrontmatter(
      "---\npublished: true\ntitle: Custom\ndate: 2025-01-01\n---\nBody",
      "posts/x.md",
      0,
    );
    expect(result.data?.title).toBe("Custom");
    const date = result.data?.date;
    if (date instanceof Date) {
      expect(date.toISOString().slice(0, 10)).toBe("2025-01-01");
    } else {
      expect(date).toBe("2025-01-01");
    }
  });
});
