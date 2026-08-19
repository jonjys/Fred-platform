import { createAtom } from "../tunnel";
import { parseYouTube } from "../parsers/youtube";

export async function handleTunnelClip(sharedText: string, file?: File) {
  const yt = parseYouTube(sharedText);
  if (yt) {
    return createAtom("capcut", "video", {
      type: "youtube",
      ...yt,
      action: "open_premiere",
    });
  }

  if (file && file.type.startsWith("video/")) {
    return createAtom("capcut", "video", {
      type: "file",
      name: file.name,
      size: file.size,
      action: "download_to_desktop",
    });
  }

  throw new Error("TunnelClip: Kunde inte parsa. Dela från CapCut eller skicka YouTube-länk.");
}
