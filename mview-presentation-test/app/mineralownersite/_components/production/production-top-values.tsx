import { PortalLink } from "../portal-link";
import { rangesNote, topValues } from "../../_lib/portal-production-data";

/**
 * VALUES AT THE TOP — v43 · OW-45, and every view gets them.
 *
 * Ryan: "Values at the top: next month, next quarter". They sit above the lease
 * table because they are the only figures on the page a reader might have come
 * for; everything below explains where they came from.
 *
 * A RANGE, NEVER A POINT (OW-35/36). The first two cards headline a BAND and
 * demote the midpoint to the sub-line, because the model's uncertainty is real
 * and stating a single dollar figure would be a promise the model cannot make.
 * The paragraph underneath names all four reasons the band is wide — prices
 * held flat, a benchmark discount that varies, deducts we cannot see until the
 * owner shows a statement, and operators posting months behind.
 *
 * `.cl-lock` ON THE MONEY, INCLUDING THE MIDPOINTS. A free claimed owner has
 * these covered up; that is the product gate, and it applies to the modelled
 * dollars and nothing else on this page.
 */
export function ProductionTopValues() {
  return (
    <>
      <div className="pf2-topvals">
        {topValues.map((card) => (
          <div
            key={card.label}
            className="pf2-tv"
            style={card.borderColor ? { borderColor: card.borderColor } : undefined}
          >
            <span className="tvl">{card.label}</span>
            <span className="tvv num cl-lock">{card.value}</span>
            <span className="tvs">
              {card.subLead}
              {card.subStrong ? (
                <strong className="num cl-lock">{card.subStrong}</strong>
              ) : null}
              {card.subTail}
              {card.estimateChip ? (
                <span className="chip chip-est" style={{ fontSize: 9 }}>
                  estimate — not an appraisal
                </span>
              ) : null}
            </span>
          </div>
        ))}
      </div>

      <p className="small muted" style={{ margin: "-6px 0 14px" }}>
        <strong>{rangesNote.lead}</strong>
        {rangesNote.body}
        <PortalLink href={rangesNote.href}>{rangesNote.link}</PortalLink>
      </p>
    </>
  );
}
