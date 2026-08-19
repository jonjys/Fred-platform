export type YouTubeData = {
  videoId: string;
  timestamp?: number;
  url: string;
};

export function parseYouTube(text: string): YouTubeData | null {
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})(?:\?t=(\d+))?/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})(?:.*t=(\d+))?/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const p of patterns) {
    const match = text.match(p);
    if (match) {
      const videoId = match[1] as string;
      const timestamp = match[2] ? parseInt(match[2], 10) : undefined;
      return {
        videoId,
        timestamp,
        url: `https://youtu.be/${videoId}${timestamp ? `?t=${timestamp}` : ""}`,
      };
    }
  }
  return null;
}
