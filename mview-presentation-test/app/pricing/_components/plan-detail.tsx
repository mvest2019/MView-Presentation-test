import { h3Class } from "../../_components/typography";
import { PLAN_DETAIL } from "./pricing-content";

/**
 * "Exactly what each plan opens" — the four access limits, each with a worked
 * example.
 *
 * NO LEFT ACCENT RAIL. The design gave each card a 4px coloured left border;
 * that reads as decoration rather than as information, and with four cards it
 * just stripes the section. The tier is already named in the heading, so the
 * cards carry a ruled header and let the heading do the work. Enterprise keeps
 * a ground of its own because it is the one tier that is quoted rather than
 * priced, which is a real difference and not a colour preference.
 */
export function PlanDetail() {
  return (
    <div className="grid grid-cols-2 gap-4 max-[860px]:grid-cols-1">
      {PLAN_DETAIL.map((plan) => {
        const quoted = plan.kind === "ent";
        return (
          <article
            key={plan.kind}
            className={`flex flex-col rounded-[17px] border px-6 py-[22px] shadow-[0_1px_2px_rgba(24,24,27,.05)] max-[767px]:px-[19px] max-[767px]:py-[18px] ${
              quoted
                ? "border-mv-sand-line bg-gradient-to-b from-mv-sand-tint to-white to-[46%]"
                : "border-mv-line bg-white"
            }`}
          >
            <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-mv-line-soft pb-[11px]">
              <h3 className={h3Class}>{plan.name}</h3>
              <span
                className={`whitespace-nowrap text-[16px] font-extrabold tabular-nums ${
                  quoted ? "text-mv-sand" : "text-mv-green-deep"
                }`}
              >
                {plan.price}
              </span>
            </header>

            <p className="mt-3 max-w-[62ch] text-[13px] leading-[1.6] text-mv-muted">
              {plan.who}
            </p>

            <dl className="mt-[14px] grid grid-cols-[auto_1fr] items-baseline text-[13px]">
              {plan.rows.map((row, i) => (
                <div key={row.label} className="contents">
                  <dt
                    className={`whitespace-nowrap py-[5px] text-mv-muted ${
                      i === 0 ? "" : "border-t border-dotted border-mv-line"
                    }`}
                  >
                    {row.label}
                  </dt>
                  <dd
                    className={`m-0 py-[5px] text-right font-bold tabular-nums ${
                      i === 0 ? "" : "border-t border-dotted border-mv-line"
                    }`}
                  >
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>

            <p
              className={`mt-[14px] rounded-[10px] border px-[14px] py-3 text-[12.6px] leading-[1.6] ${
                quoted
                  ? "border-mv-sand-line bg-mv-sand-tint text-mv-portal-alert-gold-ink"
                  : "border-mv-mint-edge bg-mv-mint text-mv-green-ink"
              }`}
            >
              {plan.example}
            </p>

            <p className="mt-3 text-[12.4px] leading-[1.6] text-mv-muted">
              {plan.note}
            </p>
          </article>
        );
      })}
    </div>
  );
}
