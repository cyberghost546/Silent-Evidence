'use client';

interface Props {
  spotifyPlaylistUrl: string;
}

// Converts a full Spotify playlist URL or URI to the embed URL.
// Input: https://open.spotify.com/playlist/37i9dQZF1DX...
// Output: https://open.spotify.com/embed/playlist/37i9dQZF1DX...
function toEmbedUrl(url: string): string | null {
  try {
    // Handle spotify: URI format  e.g. spotify:playlist:37i9dQZF1DX...
    if (url.startsWith('spotify:')) {
      const parts = url.split(':'); // ["spotify", "playlist", "id"]
      if (parts.length === 3) return `https://open.spotify.com/embed/${parts[1]}/${parts[2]}`;
    }
    const u = new URL(url);
    if (!u.hostname.includes('spotify.com')) return null;
    // Replace /playlist/ with /embed/playlist/
    const embedPath = u.pathname.replace(/^\/(playlist|album|track)\//, '/embed/$1/');
    return `https://open.spotify.com${embedPath}?utm_source=generator&theme=0`;
  } catch {
    return null;
  }
}

export default function StorySoundtrack({ spotifyPlaylistUrl }: Props) {
  const embedUrl = toEmbedUrl(spotifyPlaylistUrl);
  if (!embedUrl) return null;

  return (
    <div className="my-8 rounded-2xl overflow-hidden border border-gray-800 bg-gray-900/60">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
        {/* Spotify green logo mark */}
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#1DB954]" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>
        <span className="text-gray-300 text-sm font-medium">Author&apos;s Recommended Soundtrack</span>
        <span className="text-gray-600 text-xs ml-auto">Play while reading</span>
      </div>

      {/* Spotify embed */}
      <iframe
        src={embedUrl}
        width="100%"
        height="152"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        className="block"
        title="Story soundtrack playlist"
      />
    </div>
  );
}
