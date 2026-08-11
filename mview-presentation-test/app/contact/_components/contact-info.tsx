import { Mail, MapPin, Phone } from "lucide-react";

import { contactConfig as cfg } from "./contact-config";

/**
 * Right-hand "Get in touch" card, following `contact_page_proposed.html`.
 *
 * Three details carry the layout, and all three are load-bearing:
 *  - icons are TOP-aligned, so the three-line address grows downward and the
 *    icon rhythm stays even;
 *  - no dividers between rows — the even icon spacing does that work;
 *  - the rows are a `justify-between` track with `gap-[18px]` as a floor. The gap
 *    matters on phones, where there is no spare height to distribute and
 *    `justify-between` alone would let the rows collapse against each other.
 */
export function ContactInfo() {
  return (
    <div className="flex h-full flex-col rounded-mv border border-mv-line bg-mv-card p-[22px] shadow-mv">
      <div className="mb-1.5 text-[11.5px] font-bold uppercase tracking-[.12em] text-mv-green-deep">
        Get in touch
      </div>
      <h2 className="mb-1.5 font-serif text-[19px] font-semibold leading-[1.25] tracking-[-.01em] text-mv-ink">
        Reach us directly
      </h2>

      <div className="flex flex-1 flex-col">
        <ul className="m-0 flex flex-1 list-none flex-col justify-between gap-[18px] p-0 py-[10px]">
          <li className="flex items-start gap-[13px]">
            <span className="flex h-[40px] w-[40px] flex-none items-center justify-center rounded-[11px] bg-mv-mint text-mv-green-deep">
              <Phone className="h-[19px] w-[19px]" />
            </span>
            <div className="min-w-0 pt-[1px]">
              <div className="text-[11px] font-extrabold uppercase tracking-[.09em] text-mv-green-deep">
                Phone
              </div>
              <div className="mt-[3px] text-[14.5px] font-semibold leading-[1.45] text-mv-ink">
                <a
                  className="text-mv-ink no-underline hover:text-mv-green-deep hover:underline"
                  href={cfg.phone.href}
                >
                  {cfg.phone.display}
                </a>
              </div>
            </div>
          </li>

          <li className="flex items-start gap-[13px]">
            <span className="flex h-[40px] w-[40px] flex-none items-center justify-center rounded-[11px] bg-mv-mint text-mv-green-deep">
              <Mail className="h-[19px] w-[19px]" />
            </span>
            <div className="min-w-0 pt-[1px]">
              <div className="text-[11px] font-extrabold uppercase tracking-[.09em] text-mv-green-deep">
                Email
              </div>
              <div className="mt-[3px] text-[14.5px] font-semibold leading-[1.45] text-mv-ink">
                {/* `break-all`: the address is 2px too wide for the column at
                    320px, and a mid-word break beats overflowing the card. */}
                <a
                  className="break-all text-mv-ink no-underline hover:text-mv-green-deep hover:underline"
                  href={cfg.email.href}
                >
                  {cfg.email.display}
                </a>
              </div>
            </div>
          </li>

          <li className="flex items-start gap-[13px]">
            <span className="flex h-[40px] w-[40px] flex-none items-center justify-center rounded-[11px] bg-mv-mint text-mv-green-deep">
              <MapPin className="h-[19px] w-[19px]" />
            </span>
            <div className="min-w-0 pt-[1px]">
              <div className="text-[11px] font-extrabold uppercase tracking-[.09em] text-mv-green-deep">
                Our address
              </div>
              <address className="mt-[3px] text-[14.5px] font-semibold not-italic leading-[1.45] text-mv-ink">
                {cfg.address.map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < cfg.address.length - 1 && <br />}
                  </span>
                ))}
              </address>
            </div>
          </li>
        </ul>

        {/* Single-line rows, so nothing has to wrap on a phone — the previous
            two-column version broke "Monday – Friday" onto two lines below 400px. */}
        <div className="mt-[14px] rounded-xl bg-mv-green-ink px-[22px] py-[18px] text-[#cfeade]">
          <div className="mb-[7px] text-[14px] font-bold text-white">
            Business Hours
          </div>
          {cfg.hours.map((h) => (
            <div key={h.label} className="text-[13px] leading-[1.75]">
              {h.label}: <b className="font-semibold text-white">{h.value}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
