import {
  casperScorecard,
  casperScorecardRows,
} from "../../_lib/portal-production-data";

/**
 * THE LEASE SCORECARD — the dark band beside the map.
 *
 * OIL AND GAS ALWAYS SEPARATE, NEVER BOE. That rule is why this is a
 * five-column grid rather than a two-column table, and the card's own footer
 * states it: a barrel and a thousand cubic feet sell at different prices, so
 * combining them into "barrels of oil equivalent" would hide which product is
 * actually paying the owner. Every row therefore carries four values — lease
 * oil, share oil, lease gas, share gas.
 *
 * IT IS A CSS GRID, NOT A `<table>`, because that is what the reference is
 * (`.pf2-tbl` with `grid-template-columns`), and its header cells are `<div>`s
 * that only exist to label columns. Reproducing it as a real table would need
 * `<th>`s the design does not have and would change how it collapses on a
 * phone — where the grid simply narrows its five tracks.
 *
 * THE OWNER-SHARE COLUMNS ARE A LABELLED EXAMPLE. CASPER A2 is not on this
 * record, so there is no real decimal interest to apply; the interest chip says
 * "example" in amber and the footer repeats it. Quietly using one of Suzie's
 * decimals here would be the single dishonest figure on the page.
 *
 * THE THREE PROJECTED ROWS CARRY THEIR OWN DISCLAIMER — projected 12 months,
 * remaining reserves and EUR each print "estimate — not an appraisal" under the
 * label rather than relying on one note at the foot of the card.
 *
 * A DECLINE RATE HAS NO OWNER SHARE. A percentage per month is the same
 * percentage whatever fraction you own, so both share cells on that row are an
 * em dash rather than a repeated number.
 */
export function LeaseScorecard() {
  return (
    <div className="pf2-kband">
      <div className="pf2-kt">
        <h4>{casperScorecard.heading}</h4>
        <span className="pf2-int">
          {casperScorecard.interest} <em>{casperScorecard.interestTag}</em>
        </span>
      </div>

      <div className="pf2-tbl">
        {/* Two header rows: the oil/gas groups, then lease/your-share under
            each. The empty cells are the label column's own headers. */}
        <div className="pf2-c gh" />
        <div className="pf2-c gh o">{casperScorecard.groupOil}</div>
        <div className="pf2-c gh o sh" />
        <div className="pf2-c gh g">{casperScorecard.groupGas}</div>
        <div className="pf2-c gh g sh" />

        <div className="pf2-c shh" />
        <div className="pf2-c shh">{casperScorecard.subLease}</div>
        <div className="pf2-c shh sh">{casperScorecard.subShare}</div>
        <div className="pf2-c shh">{casperScorecard.subLease}</div>
        <div className="pf2-c shh sh">{casperScorecard.subShare}</div>

        {casperScorecardRows.map((row) => (
          <Row key={row.label} row={row} />
        ))}
      </div>

      <div className="pf2-kstrip">
        {casperScorecard.strip.map((item) => (
          <span key={item.label}>
            <strong className="num">{item.value}</strong>
            {item.label}
          </span>
        ))}
      </div>

      <p className="pf2-kfoot">
        {casperScorecard.footLead}
        <span className="num">{casperScorecard.footInterest}</span>
        {casperScorecard.footTail}
      </p>
    </div>
  );
}

/** One scorecard row: a label plus its four values. */
function Row({ row }: { row: (typeof casperScorecardRows)[number] }) {
  return (
    <>
      <div className="pf2-c">
        <span className="pf2-l">
          {row.label}
          {row.estimate ? (
            <span className="pf2-est">estimate — not an appraisal</span>
          ) : null}
        </span>
      </div>

      <div className="pf2-c">
        <span className="pf2-vo num">
          {row.oil}
          <span className="pf2-u">{row.oilUnit}</span>
        </span>
      </div>
      <div className="pf2-c sh">
        {row.shareNotApplicable ? (
          <span className="pf2-vs na">—</span>
        ) : (
          <span className="pf2-vs o num">
            {row.oilShare}
            <span className="pf2-u">{row.oilShareUnit}</span>
          </span>
        )}
      </div>

      <div className="pf2-c">
        <span className="pf2-vg num">
          {row.gas}
          <span className="pf2-u">{row.gasUnit}</span>
        </span>
      </div>
      <div className="pf2-c sh">
        {row.shareNotApplicable ? (
          <span className="pf2-vs na">—</span>
        ) : (
          <span className="pf2-vs g num">
            {row.gasShare}
            <span className="pf2-u">{row.gasShareUnit}</span>
          </span>
        )}
      </div>
    </>
  );
}
