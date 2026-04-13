'use client';
// ============================================================
// FILE: DeathCountInput.tsx
// PURPOSE: A themed number input that lets story authors set the "body count"
//          (how many characters die) when creating or editing a story.
//          It is a controlled component — the parent form owns the value and
//          receives updates through the onChange callback.
//
// KEY CONCEPT — controlled component:
//   The parent passes `value` down and receives updates via `onChange(n)`.
//   DeathCountInput never stores the number in its own state — it just
//   displays whatever the parent gives it and calls onChange when the user
//   types. This is the standard pattern for form fields in React.
//
// KEY CONCEPT — safe integer parsing:
//   <input type="number"> always gives a string from e.target.value.
//   parseInt(..., 10) converts it to an integer. If the user clears the
//   field (NaN) or types a negative number, we clamp to 0 so the parent
//   always receives a valid non-negative integer.
//
// HOW TO REUSE IN ANOTHER PROJECT:
//   - Use this exact pattern (value prop + onChange callback) for any
//     controlled numeric input in a larger form.
//   - The "watermark icon inside the input" trick uses absolute positioning
//     on a <span> inside a relative <div> wrapper — copy it for any input
//     that needs a decorative right-side icon.
//   - The live feedback paragraph (shown only when value > 0) is a simple
//     way to add personality to any form field.
// ============================================================

interface Props {
  // Current body-count value controlled by the parent form
  value: number;
  // Callback fired whenever the user changes the number
  onChange: (n: number) => void;
}

export default function DeathCountInput({ value, onChange }: Props) {
  // Convert the raw input string into a safe integer before calling the parent.
  // We floor negative entries to 0 — no one un-dies in our stories.
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const parsed = parseInt(e.target.value, 10);
    onChange(isNaN(parsed) || parsed < 0 ? 0 : parsed);
  }

  return (
    <div className="flex flex-col gap-1.5">
      {/* Label row — skull icon + field name */}
      <label className="flex items-center gap-2 text-sm font-semibold text-red-400">
        <span
          className="text-xl drop-shadow-[0_0_8px_rgba(220,38,38,0.7)]"
          aria-hidden="true"
        >
          💀
        </span>
        Body Count
      </label>

      {/* Helper text shown below the label */}
      <p className="text-xs text-gray-500 -mt-0.5">
        How many characters die in this story?
      </p>

      {/* Number input — dark red accent border, red focus ring */}
      <div className="relative">
        {/* Skull watermark inside the input on the right */}
        <span
          className="absolute right-3 top-1/2 -translate-y-1/2 text-red-900/60 text-lg pointer-events-none select-none"
          aria-hidden="true"
        >
          💀
        </span>

        <input
          type="number"
          min={0}
          value={value}
          onChange={handleChange}
          className="
            w-full bg-red-950/20 border border-red-900/60 text-white
            rounded-lg px-4 py-2.5 pr-10
            text-sm font-medium
            placeholder-red-900/50
            focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-700
            transition
          "
          placeholder="0"
        />
      </div>

      {/* Live feedback — shows a dramatic message once the number is non-zero */}
      {value > 0 && (
        <p className="text-xs text-red-500/80 italic mt-0.5">
          {value === 1
            ? '1 soul lost to the darkness.'
            : `${value.toLocaleString('en-US')} souls lost to the darkness.`}
        </p>
      )}
    </div>
  );
}
