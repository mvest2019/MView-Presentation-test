import { Mail, MapPin, Phone } from "lucide-react";

import { contactConfig as cfg } from "./contact-config";

/**
 * Right-hand "Get in touch" card — static details + business hours.
 *
 * Matches the form card's height. That leaves ~96px spare, so the three rows and
 * the hours block share one `justify-between` track: the leftover is split
 * equally across the three gaps between them, and Business Hours lands on the
 * card's bottom edge. Every element keeps its designed size — rows stay at
 * content height, the hours block keeps its padding — so the spare height reads
 * as even rhythm rather than as one dead band or as inflated rows.
 */
export function ContactInfo() {
  return (
    <div className="flex h-full flex-col rounded-mv border border-mv-line bg-mv-card p-[20px] shadow-mv">
      <div className="mb-1.5 text-[11.5px] font-bold uppercase tracking-[.12em] text-mv-green-deep">
        Get in touch
      </div>
      <h2 className="mb-3 font-serif text-[19px] font-semibold leading-[1.25] tracking-[-.01em] text-mv-ink">
        Reach us directly
      </h2>

      <div className="flex flex-1 flex-col justify-between">
      <div className="flex items-center gap-[13px] border-b border-mv-line py-[7px]">
        <span className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-[11px] bg-mv-mint text-mv-green-deep">
          <Phone className="h-5 w-5" />
        </span>
        <div>
          <div className="mb-[3px] text-[11px] font-extrabold uppercase tracking-[.09em] text-mv-green-deep">
            Phone
          </div>
          <div className="text-[14.5px] font-semibold leading-[1.5] text-mv-ink">
            <a className="text-mv-ink no-underline hover:text-mv-green-deep hover:underline" href={cfg.phone.href}>
              {cfg.phone.display}
            </a>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-[13px] border-b border-mv-line py-[7px]">
        <span className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-[11px] bg-mv-mint text-mv-green-deep">
          <Mail className="h-5 w-5" />
        </span>
        <div>
          <div className="mb-[3px] text-[11px] font-extrabold uppercase tracking-[.09em] text-mv-green-deep">
            Email
          </div>
          <div className="text-[14.5px] font-semibold leading-[1.5] text-mv-ink">
            <a className="text-mv-ink no-underline hover:text-mv-green-deep hover:underline" href={cfg.email.href}>
              {cfg.email.display}
            </a>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-[13px] py-[6px]">
        <span className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-[11px] bg-mv-mint text-mv-green-deep">
          <MapPin className="h-5 w-5" />
        </span>
        <div>
          <div className="mb-[3px] text-[11px] font-extrabold uppercase tracking-[.09em] text-mv-green-deep">
            Our address
          </div>
          <div className="text-[14.5px] font-semibold leading-[1.5] text-mv-ink">
            {cfg.address.map((line, i) => (
              <span key={i}>
                {line}
                {i < cfg.address.length - 1 && <br />}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-mv-green-ink p-[30.1px] text-[#eafff6]">
        <div className="mb-[9px] text-[11.5px] font-extrabold uppercase tracking-[.09em] text-[#7fd4ae]">
          Business hours
        </div>
        {cfg.hours.map((h) => (
          <div key={h.label} className="flex justify-between gap-[14px] py-1 text-[13.5px] leading-[1.4]">
            <span>{h.label}</span>
            <b className="whitespace-nowrap font-bold">{h.value}</b>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
