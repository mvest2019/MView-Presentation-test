import { Check } from "lucide-react";

/**
 * The rail's tick box — the drawn one, not the input.
 *
 * `aria-hidden`, because it is a picture of a state a real `<input>` holds:
 * every caller lays a transparent checkbox over it, so the browser keeps the
 * keyboard behaviour, the focus ring and the accessibility tree while this
 * supplies the look.
 *
 * Extracted from `filters-panel.tsx`, where it was private, once the claimed
 * leases list needed the same box. Two hand-copied 15px squares with the same
 * green would have drifted the first time either was touched.
 */
export function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`grid h-[15px] w-[15px] shrink-0 place-items-center rounded-[4px] border ${
        checked
          ? "border-mv-green-deep bg-mv-green-deep text-white"
          : "border-[#c7cbd1] bg-white"
      }`}
    >
      {checked && <Check size={11} strokeWidth={3.5} />}
    </span>
  );
}
