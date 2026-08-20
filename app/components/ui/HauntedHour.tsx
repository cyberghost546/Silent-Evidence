"use client";

// GoldenHour.tsx — Global ambient horror-themed effect that activates between 3:00 AM and 4:00 AM.
// Injects a <style> tag, a warm golden vignette overlay div, and a floating banner into the DOM when active.
// Cleans up all injected elements when the hour ends or the component unmounts.

import { useEffect, useRef } from "react";

// Unique IDs for injected DOM elements so we can find and remove them later
const STYLE_ID = "golden-hour-styles";
const OVERLAY_ID = "golden-hour-overlay";
const BANNER_ID = "golden-hour-banner";

// The CSS injected during golden hour:
// - @keyframes goldenGlow: a gentle shimmer effect that subtly pulses opacity and brightness
// - .golden-hour-active: applies the glow animation to the whole page body
// - Text selectors: tints visible text with a warm golden amber color
// - Banner slide-in animation for the top notification bar
const GOLDEN_CSS = `
  /* Gentle golden shimmer — slowly oscillates opacity and a slight brightness boost */
  @keyframes goldenGlow {
    0%   { opacity: 1;    filter: brightness(1);    }
    25%  { opacity: 0.98; filter: brightness(1.03); }
    50%  { opacity: 1;    filter: brightness(1.05); }
    75%  { opacity: 0.99; filter: brightness(1.02); }
    100% { opacity: 1;    filter: brightness(1);    }
  }

  /* Apply the golden glow animation to the whole page body */
  body.golden-hour-active {
    animation: goldenGlow 6s ease-in-out infinite;
  }

  /* Shift body text toward a warm golden amber tint */
  body.golden-hour-active p,
  body.golden-hour-active span,
  body.golden-hour-active li,
  body.golden-hour-active h1,
  body.golden-hour-active h2,
  body.golden-hour-active h3,
  body.golden-hour-active h4 {
    color: #d4a017 !important;
    transition: color 2s ease;
  }

  /* Floating banner slide-in from the top */
  @keyframes goldenBannerIn {
    from { transform: translateY(-100%); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }

  /* Target the banner element by its unique ID and apply the entrance animation */
  #${BANNER_ID} {
    animation: goldenBannerIn 1.2s ease forwards;
  }
`;

// Main component — renders nothing visible; all effects are injected directly into the DOM
export default function GoldenHour() {
  // Store the interval ID so we can clear it on unmount
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Returns true if the current local time is between 3:00 AM and 4:00 AM (Golden Hour)
  function isGoldenHour(): boolean {
    const h = new Date().getHours();
    return h === 3; // Only active when the hour is exactly 3 (i.e. 3:00–3:59 AM)
  }

  // Injects the <style> tag, the golden vignette overlay div, and the floating banner into the DOM.
  // Also adds the CSS class to <body> that triggers the glow animation.
  function activateGoldenHour() {
    // --- Style tag: inject our custom CSS into the document head if not already present ---
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = GOLDEN_CSS; // All golden-hour keyframes and class rules
      document.head.appendChild(style);
    }

    // --- Vignette overlay: a fixed full-screen div with a warm golden radial gradient ---
    if (!document.getElementById(OVERLAY_ID)) {
      const overlay = document.createElement("div");
      overlay.id = OVERLAY_ID;
      // pointer-events: none ensures the overlay never intercepts user clicks
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 9990;
        pointer-events: none;
        background: radial-gradient(
          ellipse at center,
          transparent 40%,
          rgba(180, 140, 0, 0.15) 100%
        );
      `;
      document.body.appendChild(overlay);
    }

    // --- Floating banner at the top of the viewport showing golden hour status ---
    if (!document.getElementById(BANNER_ID)) {
      const banner = document.createElement("div");
      banner.id = BANNER_ID;
      // Deep green-to-gold gradient background with gold text and green border
      banner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 9999;
        background: linear-gradient(90deg, #1a0033 0%, #3d0066 50%, #1a0033 100%);
        color: #ffd700;
        text-align: center;
        padding: 10px 0;
        font-family: serif;
        font-size: 15px;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        border-bottom: 1px solid #4a0080;
        box-shadow: 0 2px 24px rgba(100, 0, 180, 0.5);
        pointer-events: none;
      `;
      banner.textContent = "Golden Hour — 3AM"; // Sparkle emoji for horror flair
      document.body.appendChild(banner);
    }

    // Add class to body to trigger the golden glow animation and text tint
    document.body.classList.add("golden-hour-active");
  }

  // Removes all injected elements and restores the body to its normal state.
  function deactivateGoldenHour() {
    document.getElementById(STYLE_ID)?.remove();   // Remove injected <style> tag
    document.getElementById(OVERLAY_ID)?.remove();  // Remove vignette overlay div
    document.getElementById(BANNER_ID)?.remove();   // Remove floating banner div
    document.body.classList.remove("golden-hour-active"); // Remove animation class from body
  }

  useEffect(() => {
    // Run immediately on mount to catch the case where the page loads during 3 AM
    if (isGoldenHour()) {
      activateGoldenHour();
    }

    // Check every 60 seconds so we activate/deactivate at the right moment
    intervalRef.current = setInterval(() => {
      if (isGoldenHour()) {
        activateGoldenHour();
      } else {
        // Outside 3–4 AM: ensure everything is cleaned up
        deactivateGoldenHour();
      }
    }, 60_000); // 60 000 ms = 1 minute

    // Cleanup: clear interval and remove injected DOM nodes when component unmounts
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
      deactivateGoldenHour();
    };
  }, []); // Empty dependency array — runs once on mount

  // This component renders nothing itself; all effects are applied to the existing DOM
  return null;
}
