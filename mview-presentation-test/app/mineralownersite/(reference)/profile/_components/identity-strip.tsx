"use client";

import { useRef, useState, type ChangeEvent } from "react";

import { PortalAvatar } from "../../../_components/portal-avatar";
import { PortalButton } from "../../../_components/ui/button";
import { Card } from "../../../_components/ui/card";
import { avatarProxyUrl } from "../_lib/avatar-url";
import { uploadProfileImageAction } from "../_lib/profile-actions";
import { identityStrip } from "../_lib/profile-data";
import { useProfileLive } from "./profile-live";

/**
 * THE IDENTITY STRIP — avatar, name, email, and now the photo upload.
 *
 * ── IT READS THE LIVE PROFILE, SO A SAVE SHOWS UP THE SAME TICK ──
 *
 * A client component on the `ProfileLive` context. The identity card pushes
 * each write's own response into that context and this strip re-renders from
 * it immediately — no route refresh, which on this page would wait on the
 * chrome's multi-minute owner scan (user, 2026-09-17).
 *
 * ── THE AVATAR: PHOTO IF UPLOADED, ELSE THE FIRST NAME'S FIRST LETTER ──
 *
 * The photo is `profile_image_url` off the live profile — the SERVER-built
 * URL, passed through whole (cache-buster `v` and all, §11: opaque, never
 * rebuilt) to this app's `/api/profile-image` proxy, because the URL is
 * relative to the API's origin and the browser never learns that origin. Null
 * means "never uploaded" (§F2: an ordinary state, not an error) → the session
 * photo from sign-in if there is one, else the FIRST NAME's first letter,
 * upper-cased — a single initial, not a name-splitting guess (user,
 * 2026-09-17). With no photo and no name the circle stays plain: not a "?".
 *
 * `PortalAvatar` — the top bar's own tile — notices a dead URL and falls back
 * to the letter rather than showing an empty circle.
 *
 * ── THE UPLOAD CONTROL, WHERE "PHOTOS ARRIVE LATER" USED TO STAND ──
 *
 * The strip refused to render a Change-photo button while no endpoint existed;
 * §11 shipped one, so the button is real now. The file is checked CLIENT-SIDE
 * first — the API's own four formats, and 2 MB measured on the file (its size
 * IS the decoded size the API limits) — so an oversized pick is refused before
 * any request. The chosen file goes up as the `data:` URL FileReader produces,
 * the action re-reads the profile, and the fresh `profile_image_url` (new `v`)
 * lands in the live context — the new photo paints without a reload. Refusals
 * land on the strip's own status line, the API's member-facing `details.how`
 * verbatim. There is no remove-photo control because the API has no DELETE —
 * a second upload replaces the first (§11).
 *
 * The avatar is `aria-hidden` (inside `PortalAvatar`): the name it abbreviates
 * is the next element in the reading order.
 *
 * ── WHY THE EMAIL IS NOT A `mailto:` LINK ──
 *
 * It is the reader's OWN address, shown so they can check which one the
 * account carries. A link would offer to open their mail client addressed to
 * themselves.
 */

/** the API's four accepted formats (§11) — checked before the request */
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
/** 2 MB, measured on the file itself — which is the decoded size the API caps */
const MAX_BYTES = 2 * 1024 * 1024;

export function IdentityStrip({
  fallback,
  sessionPhoto,
}: {
  /** the session cookie's name and email — the reader's own record, held as
   *  the stale copy for when the live read fails */
  fallback: { name: string; email: string } | null;
  /** the session's picture from sign-in, already sanitised by the page — shown
   *  only while the record carries no uploaded photo of its own */
  sessionPhoto: string | null;
}) {
  const { profile, update: publishProfile } = useProfileLive();
  const fileInput = useRef<HTMLInputElement>(null);
  const [photoStatus, setPhotoStatus] = useState<{
    busy?: boolean;
    note?: string;
    error?: string;
  }>({});

  /* the server-built URL rides through the proxy UNTOUCHED — `v` included */
  const photo = avatarProxyUrl(profile?.profile_image_url) ?? sessionPhoto;

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

  /* an upload needs a session; either source of identity proves one existed */
  const canUpload = profile !== null || fallback !== null;

  async function onFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    /* cleared so picking the same file again still fires a change event */
    event.target.value = "";
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setPhotoStatus({ error: identityStrip.photoWrongType });
      return;
    }
    if (file.size > MAX_BYTES) {
      setPhotoStatus({ error: identityStrip.photoTooBig });
      return;
    }

    setPhotoStatus({ busy: true });
    const dataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
    if (!dataUrl) {
      setPhotoStatus({ error: identityStrip.photoReadFailed });
      return;
    }

    const result = await uploadProfileImageAction(dataUrl);
    if (!result.ok) {
      setPhotoStatus({
        error: result.requestId
          ? `${result.message} (request ${result.requestId})`
          : result.message,
      });
      return;
    }
    publishProfile(result.profile);
    setPhotoStatus({ note: identityStrip.photoSaved });
  }

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

      {canUpload ? (
        <div className="flex min-w-0 basis-full flex-col gap-1 min-[560px]:basis-auto min-[560px]:items-end">
          {/* the input stays hidden; the button is the visible control and the
              input carries the accessible name so the pair reads as one */}
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            className="sr-only"
            aria-label={identityStrip.changePhoto}
            onChange={onFileChosen}
          />
          <PortalButton
            size="sm"
            disabled={photoStatus.busy}
            onClick={() => fileInput.current?.click()}
          >
            {photoStatus.busy
              ? identityStrip.uploading
              : identityStrip.changePhoto}
          </PortalButton>
          {/* SPEAKS ONLY WHEN THERE IS SOMETHING TO SAY — a refusal or the
              confirmation. The standing format/size caption was removed on
              request (user, 2026-09-17); the picker's `accept` filter and the
              moment-of-refusal sentences carry the rules instead. The element
              stays MOUNTED while empty (an empty block costs no height): a
              live region created at the same moment its text arrives is the
              one case where announcements are unreliable. */}
          <p
            aria-live="polite"
            className={`m-0 text-xs leading-[1.5] min-[560px]:text-right ${
              photoStatus.error ? "text-mv-required" : "text-mv-muted"
            }`}
          >
            {photoStatus.error ?? photoStatus.note ?? ""}
          </p>
        </div>
      ) : null}
    </Card>
  );
}
