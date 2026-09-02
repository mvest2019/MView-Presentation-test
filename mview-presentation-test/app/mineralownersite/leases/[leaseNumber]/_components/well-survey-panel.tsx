import { Badge } from "../../../_components/ui/badge";
import { Card, CardHeader, StatRow } from "../../../_components/ui/card";
import { Notice } from "../../../_components/ui/notice";
import { portalGate } from "../../../_components/ui/portal-gating";
import type { WellSurveyRecord } from "../_lib/well-survey-record";
import {
  SURVEY_VIEWBOX,
  deftones2HProjections,
} from "../_lib/well-survey-paths";
import type { WellReport } from "../_lib/lease-report-types";

/**
 * "WHERE THIS WELLBORE ACTUALLY GOES" — and the line we refuse to draw.
 *
 * ── FOUR TIERS ──
 *
 *   Ultra         "The well's path"
 *   Essentials    "The shape of the well" — the refusal, in plain words
 *   Detailed      + a real survey plotted three ways, and why three
 *   Professional  + the closure against the RRC record, and the grade scale
 *
 * The refusal notice is OUTSIDE the tier blocks because it is true at every
 * tier: no directional survey was filed for this well, and no tier gets a path
 * drawn for it. Everything the tiers add is about someone else's survey.
 *
 * ── WHY THREE PROJECTIONS AND NOT ONE PRETTY ONE ──
 *
 * Plan view, section and inclination-against-depth are the same wellbore from
 * three angles, and a survey corrupted at import — north read as east, feet as
 * metres — is visibly wrong in at least one of them before anyone reads a number
 * off it. The design says so in as many words. One flattering 3-D render would
 * hide exactly the failure the panel exists to catch.
 */
export function WellSurveyPanel({
  well,
  survey,
}: {
  well: WellReport;
  survey: WellSurveyRecord;
}) {
  return (
    <div className="mt-4 rounded-mv border border-mv-line bg-mv-card p-[18px] shadow-mv">
      <CardHeader
        title={
          <h4 className="text-[15px] font-bold">
            <span className={portalGate.hideInEssentials}>
              Where this wellbore actually goes
            </span>
            <span className={portalGate.essentialsOnly}>
              The shape of the well
            </span>
            <span className={portalGate.ultraOnly}>The well&rsquo;s path</span>
          </h4>
        }
        action={
          <Badge tone="estimate" size="xs" className={portalGate.hideInUltra}>
            No survey on file for this well
          </Badge>
        }
      />

      {/* UNGATED: the refusal holds at every tier. */}
      <Notice tone="slate" glyph="⚠" className="mt-1.5 border-l-4 border-l-mv-amber">
        <strong>No directional survey on file for Well {well.name}.</strong>
        <p className="mt-1.5 text-[13px]">
          This well was completed in <strong>{well.completedYear}</strong> and
          drilled straight down. Texas only requires a directional survey where a
          well deviates, so for a vertical well of this age there is usually
          nothing filed —{" "}
          <strong>
            this is a gap in the public record, not a gap in our data
          </strong>
          , and we do not draw a line we have not measured.
        </p>
        <p className="mt-1.5 text-[11px] text-mv-muted">
          Where a survey does exist we plot the filed stations and say how far the
          survey lands from the Railroad Commission&rsquo;s own bottom-hole
          coordinate. A well we cannot verify is labelled, never straightened into
          a plausible-looking path.
        </p>
      </Notice>

      <div className={portalGate.detailedOnly}>
        <Notice tone="mint" glyph="◎" className="my-2.5">
          <strong>What this looks like on a well that does have one.</strong>{" "}
          <strong>{survey.example.name}</strong> (API {survey.example.api}) on
          the four-well unit above — <strong>{survey.example.stations} filed
          stations</strong>, plotted straight from the survey.
        </Notice>

        <div className="grid gap-3 min-[760px]:grid-cols-3">
          {deftones2HProjections.map((view) => (
            <div key={view.title}>
              <p className="mb-0.5 text-[11px] font-extrabold text-mv-slate">
                {view.title}
              </p>
              <svg
                viewBox={`0 0 ${SURVEY_VIEWBOX.width} ${SURVEY_VIEWBOX.height}`}
                role="img"
                aria-label={`${view.title}: ${view.caption.lead} ${view.caption.rest}`}
                className="h-auto w-full rounded-lg border border-mv-line bg-white"
              >
                <path
                  d={view.d}
                  fill="none"
                  stroke="var(--color-mv-green-deep)"
                  strokeWidth={2.2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
              <p className="mt-[3px] text-[11px] text-mv-muted">
                <strong>{view.caption.lead}</strong> {view.caption.rest}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-2.5 text-[13px]">
          <strong>
            Read the three together and a wrong survey shows itself.
          </strong>{" "}
          A column swapped at import — north for east, feet for metres — produces
          a path that is visibly wrong here before anyone reads a number off it.
          That is most of what these are for.
        </p>
      </div>

      <div className={portalGate.professionalOnly}>
        <div className="mt-2.5 grid gap-3 min-[900px]:grid-cols-2">
          <Card>
            <CardHeader
              title={
                <h4 className="text-[15px] font-bold">
                  How far this survey is trusted
                </h4>
              }
              action={
                <Badge tone="mint" size="xs">
                  {survey.trust.grade}
                </Badge>
              }
            />
            <div className="mt-1">
              <StatRow
                label={<span className="text-[13px]">Closure vs the RRC bottom hole</span>}
                value={<span className="text-[13px]">{survey.trust.closure}</span>}
              />
              <StatRow
                label={<span className="text-[13px]">Stations filed</span>}
                value={<span className="text-[13px]">{survey.trust.stations}</span>}
              />
              <StatRow
                label={<span className="text-[13px]">Measured depth</span>}
                value={<span className="text-[13px]">{survey.trust.measuredDepth}</span>}
              />
              <StatRow
                label={<span className="text-[13px]">Geometry</span>}
                value={<span className="text-[13px]">{survey.trust.geometry}</span>}
              />
            </div>
            <p className="mt-2 text-[11px] text-mv-muted">
              Closure is the distance between where the survey says the well ends
              and where the Railroad Commission&rsquo;s own record puts it.{" "}
              <strong>
                {survey.trust.closure} on a {survey.trust.measuredDepth} hole
              </strong>{" "}
              is agreement, and it is why this one is graded A.
            </p>
          </Card>

          <Card>
            <CardHeader
              title={
                <h4 className="text-[15px] font-bold">What the grades mean</h4>
              }
              action={
                <Badge tone="slate" size="xs">
                  A to N
                </Badge>
              }
            />
            <div className="mt-1">
              {survey.grades.map((grade) => (
                <StatRow
                  key={grade.code}
                  label={
                    <span className="text-[13px]">
                      <strong>{grade.code}</strong>
                      {grade.label ? ` ${grade.label}` : ""}
                    </span>
                  }
                  value={
                    <span className="text-[13px]">
                      {grade.neverPlotted && (
                        <>
                          <strong>never plotted</strong> —{" "}
                        </>
                      )}
                      {grade.meaning}
                    </span>
                  }
                />
              ))}
            </div>
            <p className="mt-2 text-[11px] text-mv-muted">
              Only <strong>A</strong> and <strong>B</strong> are drawn without
              qualification. Across the {survey.drawnWithoutCaveat.counties}{" "}
              counties exported so far, that is{" "}
              <strong>
                {survey.drawnWithoutCaveat.drawn} of{" "}
                {survey.drawnWithoutCaveat.total}
              </strong>{" "}
              wellbores.
            </p>
          </Card>
        </div>

        <p className="mt-2.5 text-[10px] leading-[1.5] text-mv-muted">
          Source: the survey digitised from the operator&rsquo;s filed plat,
          station by station. Paths are computed by minimum curvature.{" "}
          <strong>
            The perforated interval these stations define is the same length that
            sets this well&rsquo;s allocated share above
          </strong>{" "}
          — a wellbore we cannot survey is one whose share rests on the weaker
          basis, and the allocation panel says so.
        </p>
      </div>
    </div>
  );
}
