import { describe, expect, it } from "vitest";
import { imageFilename } from "../src/markdown/images.js";

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
