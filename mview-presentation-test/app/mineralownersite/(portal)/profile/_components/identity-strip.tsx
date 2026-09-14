import { Card } from "../../../_components/ui/card";
import { identityStrip } from "../_lib/profile-data";

/**
 * THE IDENTITY STRIP — monogram, name, email, above the two cards.
 *
 * ── WHY A MONOGRAM AND NOT AN UPLOAD CONTROL ──
 *
 * A "Change photo" button would be the one control on this page that implies a
 * capability nothing behind it has: there is no upload endpoint, no storage and
 * no moderation path, and an avatar is the single most likely field for someone
 * to put a photograph of a person into. Rendering the affordance and having it
 * do nothing is worse here than not rendering it, because a reader who presses
 * it concludes their photo failed to save rather than that the feature has not
 * shipped. So the strip states plainly when photos arrive, and the monogram
 * carries the slot until then.
 *
 * The monogram is `aria-hidden`: the name it abbreviates is the next element in
 * the reading order, and "S S" announced before "Suzie Smith" is noise.
 *
 * ── WHY THE EMAIL IS NOT A `mailto:` LINK ──
 *
 * It is the reader's OWN address, shown so they can check which one the account
 * carries. A link would offer to open their mail client addressed to
 * themselves.
 */
export function IdentityStrip() {
  return (
    <Card className="mb-[18px] flex flex-wrap items-center gap-x-4 gap-y-3">
      <span
        aria-hidden="true"
        className="grid size-14 flex-none place-items-center rounded-full bg-mv-mint text-[19px] font-extrabold tracking-[0.02em] text-mv-green-ink"
      >
        {identityStrip.initials}
      </span>

      <div className="min-w-0 flex-1 basis-48">
        <p className="truncate text-[17px] leading-[1.3] font-bold">
          {identityStrip.name}
        </p>
        <p className="mt-0.5 truncate text-[13px] leading-[1.45] text-mv-muted">
          {identityStrip.email}
        </p>
      </div>

      <p className="min-w-0 basis-full text-xs leading-[1.5] text-mv-muted min-[560px]:basis-auto min-[560px]:text-right">
        {identityStrip.photoNote}
      </p>
    </Card>
  );
}
