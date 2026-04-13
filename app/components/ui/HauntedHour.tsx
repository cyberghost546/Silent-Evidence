"use client";

// HauntedHour.tsx — Global ambient horror effect that activates between 3:00 AM and 4:00 AM.
// Known as the "Witching Hour" — the hour associated with paranormal activity and restless spirits.
// Injects a subtle red vignette overlay and a floating banner into the DOM when active.
// Cleans up all injected elements when the hour ends or the component unmounts.

import { useEffect, useRef } from "react";

// Unique IDs for injected DOM elements so we can find and remove them later
const STYLE_ID  = "witching-hour-styles";
const OVERLAY_ID = "witching-hour-overlay";
const BANNER_ID  = "witching-hour-banner";

// The CSS injected during the witching hour:
// - @keyframes witchingPulse: a slow, barely-visible blood-red pulse across the page
// - .witching-hour-active: applies the pulse to the body
// - Banner slide-in animation for the top notification bar
const WITCHING_CSS = `
  /* Slow blood-red pulse — subtle enough not to disturb reading */
  @keyframes witchingPulse {
    0%   { opacity: 1; filter: brightness(1);    }
    30%  { opacity: 1; filter: brightness(0.97); }
    60%  { opacity: 1; filter: brightness(0.99); }
    100% { opacity: 1; filter: brightness(1);    }
  }

  /* Apply the pulse animation to the whole page body */
  body.witching-hour-active {
    animation: witchingPulse 8s ease-in-out infinite;
  }

  /* Floating banner slide-in from the top */
  @keyframes witchingBannerIn {
    from { transform: translateY(-100%); opacity: 0; }
    to   { transform: translateY(0);     opacity: 1; }
  }

  #${BANNER_ID} {
    animation: witchingBannerIn 1.5s ease forwards;
  }
`;

// Main component — renders nothing visible; all effects are injected directly into the DOM
export default function HauntedHour() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Returns true if the current local time is between 3:00 AM and 4:00 AM
  function isWitchingHour(): boolean {
    return new Date().getHours() === 3;
  }

  // Injects the style tag, red vignette overlay, and floating banner into the DOM
  function activateWitchingHour() {
    // Style tag
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = WITCHING_CSS;
      document.head.appendChild(style);
    }

    // Vignette overlay — deep red radial glow around the screen edges
    if (!document.getElementById(OVERLAY_ID)) {
      const overlay = document.createElement("div");
      overlay.id = OVERLAY_ID;
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 9990;
        pointer-events: none;
        background: radial-gradient(
          ellipse at center,
          transparent 45%,
          rgba(180, 0, 0, 0.12) 100%
        );
      `;
      document.body.appendChild(overlay);
    }

    // Floating banner at the top of the viewport
    if (!document.getElementById(BANNER_ID)) {
      const banner = document.createElement("div");
      banner.id = BANNER_ID;
      banner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 9999;
        background: linear-gradient(90deg, #0a0000 0%, #1a0000 50%, #0a0000 100%);
        color: #dc2626;
        text-align: center;
        padding: 10px 0;
        font-family: serif;
        font-size: 14px;
        letter-spacing: 0.25em;
        text-transform: uppercase;
        border-bottom: 1px solid #7f1d1d;
        box-shadow: 0 2px 24px rgba(220, 38, 38, 0.3);
        pointer-events: none;
      `;
      banner.textContent = "💀  The Witching Hour — 3AM  💀";
      document.body.appendChild(banner);
    }

    document.body.classList.add("witching-hour-active");
  }

  // Removes all injected elements and restores the body to its normal state
  function deactivateWitchingHour() {
    document.getElementById(STYLE_ID)?.remove();
    document.getElementById(OVERLAY_ID)?.remove();
    document.getElementById(BANNER_ID)?.remove();
    document.body.classList.remove("witching-hour-active");
  }

  useEffect(() => {
    // Run immediately on mount in case the page loads during 3 AM
    if (isWitchingHour()) {
      activateWitchingHour();
    }

    // Check every 60 seconds so we activate/deactivate at the right moment
    intervalRef.current = setInterval(() => {
      if (isWitchingHour()) {
        activateWitchingHour();
      } else {
        deactivateWitchingHour();
      }
    }, 60_000);

    // Cleanup: clear interval and remove injected DOM nodes on unmount
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
      deactivateWitchingHour();
    };
  }, []);

  // This component renders nothing — all effects are applied to the existing DOM
  return null;
}
