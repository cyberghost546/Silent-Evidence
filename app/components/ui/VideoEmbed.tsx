'use client';
// app/components/ui/VideoEmbed.tsx
// Renders a video attachment on a story page.
// Supports three URL formats:
//   1. YouTube watch / short URL  → converts to a privacy-enhanced embed iframe
//   2. Direct video file (.mp4, .webm, .ogg) → renders a native <video> element
//   3. Anything else               → shows a plain "Watch video" hyperlink as a fallback

// ── Helpers ───────────────────────────────────────────────────────────────────

// getYouTubeEmbedUrl — converts a YouTube watch/short URL to a nocookie embed URL.
// Returns null if the URL is not a recognised YouTube format so callers can
// fall through to the next rendering strategy.
function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url); // parse the URL; throws if the string is not a valid URL

    // Case 1: youtu.be/<id>  — the short-link format
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.slice(1); // pathname is "/<id>", slice to remove the leading slash
      if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
    }

    // Case 2: youtube.com variants
    if (u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') {
      // 2a: youtube.com/watch?v=<id>  — the standard watch URL
      if (u.pathname === '/watch') {
        const id = u.searchParams.get('v'); // extract the ?v= query parameter
        if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
      }

      // 2b: youtube.com/shorts/<id>  — the Shorts format
      const shortsMatch = u.pathname.match(/^\/shorts\/([^/]+)/);
      if (shortsMatch) return `https://www.youtube-nocookie.com/embed/${shortsMatch[1]}`;

      // 2c: youtube.com/embed/<id>  — already an embed URL, pass it through unchanged
      if (u.pathname.startsWith('/embed/')) return url;
    }
  } catch {
    // The URL constructor threw — the string is not a valid URL, fall through to return null
  }

  // Not a recognised YouTube URL format
  return null;
}

// isDirectVideo — returns true when the URL ends with a common video file extension.
// The regex is case-insensitive and tolerates query strings (e.g. file.mp4?token=abc).
function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
}

// ── Component ─────────────────────────────────────────────────────────────────

// Props: just the raw video URL stored in the database
export default function VideoEmbed({ videoUrl }: { videoUrl: string }) {
  // Attempt to convert the URL to a YouTube embed URL first
  const embedUrl = getYouTubeEmbedUrl(videoUrl);

  // ── Strategy 1: YouTube embed ────────────────────────────────────────────────

  if (embedUrl) {
    return (
      // Outer wrapper adds vertical spacing above and below the video
      <div className="my-6">

        {/* Responsive 16:9 container — uses padding-top trick to maintain aspect ratio */}
        <div className="relative w-full" style={{ paddingTop: '56.25%' /* 16:9 = 9/16 = 56.25% */ }}>
          <iframe
            src={embedUrl}                    // the privacy-enhanced youtube-nocookie.com embed URL
            title="Story video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            // Absolute positioning fills the padding-top container defined above
            className="absolute inset-0 w-full h-full rounded-xl border border-gray-700"
          />
        </div>

        {/* External link fallback — gives users an easy way to open YouTube directly */}
        <a
          href={videoUrl}                   // links to the original YouTube page, not the embed URL
          target="_blank"                   // open in a new tab
          rel="noopener noreferrer"         // security: prevent the new tab accessing window.opener
          className="mt-2 inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-400 transition"
        >
 Watch on YouTube
        </a>
      </div>
    );
  }

  // ── Strategy 2: Direct video file ───────────────────────────────────────────

  if (isDirectVideo(videoUrl)) {
    return (
      <div className="my-6">
        {/* Native HTML5 video player with browser-default controls */}
        <video
          src={videoUrl}
          controls                          // show play/pause, volume, seek bar, etc.
          className="w-full rounded-xl border border-gray-700 max-h-[500px]"
        />
      </div>
    );
  }

  // ── Strategy 3: Unknown format fallback ─────────────────────────────────────
  // The URL is not YouTube and not a known video file extension.
  // Show a plain hyperlink so the reader can still access the content.

  return (
    <div className="my-6">
      <a
        href={videoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition underline"
      >
 Watch video
      </a>
    </div>
  );
}
