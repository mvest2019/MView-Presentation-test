"use client";

import { PortalAvatar } from "../../../_components/portal-avatar";
import { Card } from "../../../_components/ui/card";
import { identityStrip } from "../_lib/profile-data";
import { safePhotoUrl } from "../_lib/safe-photo-url";
import { useProfileLive } from "./profile-live";

/**
 * THE IDENTITY STRIP — monogram, name, email, above the two cards.
 *
 * ── IT READS THE LIVE PROFILE, SO A SAVE SHOWS UP THE SAME TICK ──
 *
 * A client component on the `ProfileLive` context, not a server render of the
 * page's GET. It was the latter, refreshed after a save with
 * `router.refresh()` — and the reader watched their old name stand for as
 * long as the route took to re-render, which on this page includes the
 * chrome's multi-minute cold owner scan (user, 2026-09-17: "changes but it
 * take time"). The identity card now pushes each write's own response into
 * the context, and this strip re-renders from it immediately.
 *
 * ── EVERY VALUE IS THE READER'S OWN, OR ABSENT — NEVER INVENTED ──
 *
 * When the live profile is null (the GET failed), `fallback` is the name and
 * email off the SESSION COOKIE — what the sign-in flow stored, so still the
 * reader's real record, just a staler copy. With neither source the lines are
 * simply empty.
 *
 * ── THE AVATAR: PHOTO IF UPLOADED, ELSE THE FIRST NAME'S FIRST LETTER ──
 *
 * Asked for in exactly those terms (user, 2026-09-17). The photo is
 * `profile_pic` off the live profile (sanitised here — the field is ahead of
 * the documented contract), else the session's copy from sign-in, rendered
 * through `PortalAvatar` — the top bar's own tile, which notices a dead URL
 * and falls back rather than showing an empty circle. The fallback letter is
 * the first character of the FIRST NAME, upper-cased — a single initial, not
 * a name-splitting guess. With no photo and no name the circle stays plain:
 * not a "?", which would read as an error.
 *
 * A null `full_name` falls back to the email, so the strip's largest line is
 * never blank while an address is known.
 *
 * ── STILL NO UPLOAD CONTROL ──
 *
 * There is no upload endpoint on the backend (verified against its Swagger).
 * A "Change photo" button with nothing behind it would read as a photo that
 * failed to save, so the strip keeps stating when photos arrive; displaying
 * one the record already has is a different matter and costs nothing.
 *
 * The avatar is `aria-hidden` (inside `PortalAvatar`): the name it abbreviates
 * is the next element in the reading order, and a letter announced before
 * "Suzie Smith" is noise.
 *
 * ── WHY THE EMAIL IS NOT A `mailto:` LINK ──
 *
 * It is the reader's OWN address, shown so they can check which one the
 * account carries. A link would offer to open their mail client addressed to
 * themselves.
 */
export function IdentityStrip({
  fallback,
  sessionPhoto,
}: {
  /** the session cookie's name and email — the reader's own record, held as
   *  the stale copy for when the live read fails */
  fallback: { name: string; email: string } | null;
  /** the session's picture from sign-in, already sanitised by the page — the
   *  photo shown until the record carries its own `profile_pic` */
  sessionPhoto: string | null;
}) {
  const { profile } = useProfileLive();

  const photo = safePhotoUrl(profile?.profile_pic) ?? sessionPhoto;
  const email = profile ? profile.email : (fallback?.email ?? "");
  const name = profile
    ? (profile.full_name ?? profile.email)
    : fallback
      ? fallback.name || fallback.email
      : "";

  /* the first name's first letter — `Array.from` so a surrogate-pair glyph is
     taken whole rather than split into a broken half */
  const firstName =
    profile?.first_name ?? profile?.full_name ?? fallback?.name ?? "";
  const letter = Array.from(firstName.trim())[0]?.toUpperCase() ?? "";

  return (
    <Card className="mb-[18px] flex flex-wrap items-center gap-x-4 gap-y-3">
      <PortalAvatar
        image={photo}
        initials={letter}
        className="grid size-14 flex-none place-items-center overflow-hidden rounded-full bg-mv-mint text-[19px] font-extrabold tracking-[0.02em] text-mv-green-ink"
      />

      <div className="min-w-0 flex-1 basis-48">
        <p className="truncate text-[17px] leading-[1.3] font-bold">{name}</p>
        <p className="mt-0.5 truncate text-[13px] leading-[1.45] text-mv-muted">
          {email}
        </p>
      </div>

      <p className="min-w-0 basis-full text-xs leading-[1.5] text-mv-muted min-[560px]:basis-auto min-[560px]:text-right">
        {identityStrip.photoNote}
      </p>
    </Card>
  );
}
