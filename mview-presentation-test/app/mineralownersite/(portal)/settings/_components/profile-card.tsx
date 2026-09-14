import { PortalButtonLink } from "../../../_components/ui/button";
import { SETTINGS_SECTIONS, profilePointer } from "../_lib/settings-data";
import { SettingsCard } from "./settings-card";

/**
 * PROFILE & CONTACT — a pointer, not a form.  (2026-09-14)
 *
 * ── WHAT CHANGED, AND WHY THIS IS NOT A REGRESSION ──
 *
 * This card used to BE the form: name, email, phone and mailing address, with
 * its own fieldsets, hints and submit. All of it moved to
 * `/mineralownersite/profile`, which the account menu's "My Profile" row now
 * opens, and `profile/_lib/profile-data.ts` is the single definition of those
 * four fields.
 *
 * The alternative was to render the form on both routes from the shared content
 * module. It was considered and rejected: two forms writing the same four
 * fields means two submit paths, two validation states and two places for the
 * email-verification and address-recheck rules to be half-implemented. The
 * reader loses one click; the build loses a whole class of drift.
 *
 * ── THE SECTION KEEPS ITS ID AND ITS JUMP CHIP ──
 *
 * `SETTINGS_SECTIONS.profile` is unchanged, so `#settings-profile` still
 * resolves and the "Profile" chip in the jump nav still lands here. A reader
 * who has bookmarked that fragment, or who follows the chip looking for the
 * form, arrives at the card that tells them where it went — which is the whole
 * job of this card and the reason the section was not simply deleted from the
 * page.
 *
 * The fields are NAMED here rather than described in the abstract, because
 * "manage your profile elsewhere" does not tell a reader looking for their
 * mailing address whether this is the right link to follow.
 */
export function ProfileCard() {
  return (
    <SettingsCard section={SETTINGS_SECTIONS.profile}>
      <p className="mt-1.5 text-[13px] leading-[1.55] text-mv-muted">
        {profilePointer.body}
      </p>
      <ul className="mt-2 mb-3.5 flex flex-wrap gap-x-4 gap-y-1 list-none p-0 text-[12.5px] font-semibold text-mv-slate">
        {profilePointer.fields.map((field) => (
          <li
            key={field}
            className="before:mr-1.5 before:font-extrabold before:text-mv-green before:content-['✓']"
          >
            {field}
          </li>
        ))}
      </ul>
      <PortalButtonLink
        href="/mineralownersite/profile"
        variant="primary"
        size="sm"
      >
        {profilePointer.cta}
      </PortalButtonLink>
    </SettingsCard>
  );
}
