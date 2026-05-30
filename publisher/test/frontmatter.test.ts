import { describe, expect, it } from "vitest";
import {
  processFrontmatter,
  slugFromVaultPath,
} from "../src/markdown/frontmatter.js";

describe("processFrontmatter", () => {
  it("skips when post_published is not true", () => {
    const result = processFrontmatter("body", "posts/draft.md", 0);
    expect(result.skip).toBe(true);
    expect(result.reason).toBe("not_published");
  });

  it("skips when post_published is false", () => {
    const result = processFrontmatter(
      "---\npost_published: false\n---\nbody",
      "posts/draft.md",
      0,
    );
    expect(result.skip).toBe(true);
  });

  it("publishes and strips post_ fields from output", () => {
    const mtime = Date.parse("2026-05-20T12:00:00Z");
    const result = processFrontmatter(
      "---\npost_published: true\npost_title: Hello\npost_date: 2026-05-20\n---\nHello",
      "posts/my-post.md",
      mtime,
    );
    expect(result.skip).toBe(false);
    expect(result.content).toContain("Hello");
    expect(result.content).not.toContain("post_published:");
    expect(result.content).not.toContain("post_title:");
    expect(result.data?.title).toBe("Hello");
    const date = result.data?.date;
    if (date instanceof Date) {
      expect(date.toISOString().slice(0, 10)).toBe("2026-05-20");
    } else {
      expect(date).toBe("2026-05-20");
    }
    expect(result.slug).toBe("my-post");
  });

  it("maps post_tags to Hugo tags", () => {
    const result = processFrontmatter(
      "---\npost_published: true\npost_tags:\n  - homelab\n  - networking\n---\nBody",
      "posts/x.md",
      0,
    );
    expect(result.data?.tags).toEqual(["homelab", "networking"]);
    expect(result.content).toContain("tags:");
    expect(result.content).not.toContain("post_tags:");
  });

  it("accepts post_tags as a single string", () => {
    const result = processFrontmatter(
      "---\npost_published: true\npost_tags: homelab\n---\nBody",
      "posts/x.md",
      0,
    );
    expect(result.data?.tags).toEqual(["homelab"]);
  });

  it("strips vault tags and omits Hugo tags when post_tags is missing", () => {
    const result = processFrontmatter(
      "---\npost_published: true\ntags:\n  - private\n---\nBody",
      "posts/x.md",
      0,
    );
    expect(result.data?.tags).toBeUndefined();
    expect(result.content).not.toContain("tags:");
  });

  it("maps post metadata fields", () => {
    const result = processFrontmatter(
      [
        "---",
        "post_published: true",
        'post_title: "Мой Homelab"',
        "post_slug: my-homelab",
        'post_description: "Как устроен мой домашний сервер."',
        "post_date: 2026-05-30",
        "post_tags:",
        "  - homelab",
        "---",
        "Body",
      ].join("\n"),
      "posts/ignored-name.md",
      0,
    );
    expect(result.slug).toBe("my-homelab");
    expect(result.data?.title).toBe("Мой Homelab");
    expect(result.data?.description).toBe("Как устроен мой домашний сервер.");
    expect(result.data?.tags).toEqual(["homelab"]);
    expect(result.content).not.toContain("post_");
  });

  it("defaults title, date, and slug from vault path", () => {
    const mtime = Date.parse("2026-05-20T12:00:00Z");
    const result = processFrontmatter(
      "---\npost_published: true\n---\nBody",
      "posts/my-post.md",
      mtime,
    );
    expect(result.data?.title).toBe("my-post");
    expect(result.data?.date).toBe("2026-05-20");
    expect(result.slug).toBe("my-post");
  });
});

describe("slugFromVaultPath", () => {
  it("derives slug from markdown filename", () => {
    expect(slugFromVaultPath("posts/hello-world.md")).toBe("hello-world");
  });
});
