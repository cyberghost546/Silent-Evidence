'use client';
// app/components/ui/ShareButton.tsx
// A row of share actions shown on the story page so readers can spread a story.
// Includes: copy link (with a 2-second "Copied!" confirmation), X/Twitter, WhatsApp, Reddit.
// All social shares open in a new tab using each platform's standard share URL format.
//
// Props:
//   title — the story title, pre-filled into the tweet / Reddit post text

import { useState } from 'react';

export default function ShareButton({ title }: { title: string }) {
  // Tracks whether the link was just copied — used to briefly show "Copied!" feedback
  const [copied, setCopied] = useState(false);

  // Copies the current page URL to the clipboard and shows "Copied!" for 2 seconds
  const copy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    // Reset back to "Copy link" after 2 seconds
    setTimeout(() => setCopied(false), 2000);
  };

  // Opens the X (Twitter) share dialog pre-filled with the story title and URL
  const shareX = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(window.location.href)}`, '_blank');
  };

  // Opens Reddit's submit page pre-filled with the story title and URL
  const shareReddit = () => {
    window.open(`https://reddit.com/submit?title=${encodeURIComponent(title)}&url=${encodeURIComponent(window.location.href)}`, '_blank');
  };

  // Opens WhatsApp share with the title and URL combined into one message
  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(title + ' ' + window.location.href)}`, '_blank');
  };

  return (
    <div className="flex items-center gap-2">
      {/* Copy link button — turns green with a tick icon for 2 seconds after copying */}
      <button
        onClick={copy}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition ${
          copied
            ? 'bg-green-500/10 border-green-500/40 text-green-400'
            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
        }`}
      >
        {copied ? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2m-6 12h8a2 2 0 0 1 2-2v-8a2 2 0 0 1-2-2h-8a2 2 0 0 1-2 2v8a2 2 0 0 1 2 2z" />
            </svg>
            Copy link
          </>
        )}
      </button>

      {/* X (Twitter) share button */}
      <button onClick={shareX} title="Share on X" className="p-2 rounded-lg border border-gray-700 bg-gray-800 text-gray-400 hover:text-white hover:border-gray-500 transition">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      </button>

      {/* WhatsApp share button — hover turns the brand green (#25D366) */}
      <button onClick={shareWhatsApp} title="Share on WhatsApp" className="p-2 rounded-lg border border-gray-700 bg-gray-800 text-gray-400 hover:text-[#25D366] hover:border-gray-500 transition">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.102.546 4.072 1.5 5.787L0 24l6.418-1.467A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.85 0-3.588-.5-5.082-1.373l-.364-.215-3.808.871.936-3.716-.236-.38A9.937 9.937 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
        </svg>
      </button>

      {/* Reddit share button — hover turns Reddit orange (#ff4500) */}
      <button onClick={shareReddit} title="Share on Reddit" className="p-2 rounded-lg border border-gray-700 bg-gray-800 text-gray-400 hover:text-[#ff4500] hover:border-gray-500 transition">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
        </svg>
      </button>
    </div>
  );
}
