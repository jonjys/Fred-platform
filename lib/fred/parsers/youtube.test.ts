import { describe, expect, it } from "vitest";
import { parseYouTube } from "./youtube";

describe("parseYouTube", () => {
  it("parses a youtu.be short link", () => {
    expect(parseYouTube("check this https://youtu.be/dQw4w9WgXcQ")).toEqual({
      videoId: "dQw4w9WgXcQ",
      timestamp: undefined,
      url: "https://youtu.be/dQw4w9WgXcQ",
    });
  });

  it("parses a youtube.com/watch link with a timestamp", () => {
    const result = parseYouTube("https://youtube.com/watch?v=dQw4w9WgXcQ&t=42");
    expect(result?.videoId).toBe("dQw4w9WgXcQ");
    expect(result?.timestamp).toBe(42);
    expect(result?.url).toBe("https://youtu.be/dQw4w9WgXcQ?t=42");
  });

  it("parses a shorts link", () => {
    expect(parseYouTube("https://youtube.com/shorts/dQw4w9WgXcQ")?.videoId).toBe("dQw4w9WgXcQ");
  });

  it("returns null for non-YouTube text", () => {
    expect(parseYouTube("just some random text")).toBeNull();
  });
});
