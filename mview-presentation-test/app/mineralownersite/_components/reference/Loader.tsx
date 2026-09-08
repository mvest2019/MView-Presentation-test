'use client';
/* eslint-disable react-hooks/set-state-in-effect --
 * THE EFFECTS BELOW ARE THE REFERENCE'S, AND EACH ONE SYNCHRONISES WITH AN
 * EXTERNAL SYSTEM, which is what an effect is for. This rule fires on the
 * `setState` that carries the outside world's answer back into React, and the
 * alternatives are worse than the warning:
 *
 *   · reading `localStorage` on mount — the reference's own note says why it is
 *     an effect and not initial state: "so the server and the first client
 *     render agree". Moving it into `useState` reintroduces the hydration
 *     mismatch it was written to avoid.
 *   · the retry when the server sent no payload — a fetch, reported through
 *     state, which is the documented pattern for exactly that.
 *   · the loader's step ticker and the search box's 450ms debounce — a timer is
 *     an external system, and its callback is where the `setState` belongs.
 *
 * Rewriting them would make these files forks of the reference rather than
 * copies, and this port's whole value is that they are copies. The rule stays
 * on everywhere else in the app.
 */
/**
 * The load state, with the step named.
 *
 * A first read of an owner who is not the warmed default takes seconds — the
 * appraisal-roll name field carries no index, so it scans the roll year. A bare
 * spinner for four seconds reads as a hang, and someone will refresh and start
 * the scan again. Naming the step is what makes the wait legible.
 *
 * The step advances on measured timings, not on real progress: there is no
 * progress to report from a single Mongo aggregation, and a fake percentage bar
 * that jumps to 90% and stops is worse than none. The bar here eases toward a
 * ceiling it never reaches until the work is done, which is honest about what it
 * is — an activity indicator, not a measurement.
 */
import React, { useEffect, useState } from 'react';

export interface Step { at: number; text: string }

export default function Loader(
  { on, name, steps }: { on: boolean; name: string | null; steps: Step[] },
) {
  const [ms, setMs] = useState(0);

  useEffect(() => {
    if (!on) { setMs(0); return; }
    const t0 = Date.now();
    const id = window.setInterval(() => setMs(Date.now() - t0), 200);
    return () => window.clearInterval(id);
  }, [on]);

  if (!on) return null;

  const step = [...steps].reverse().find((s) => ms >= s.at) ?? steps[0];
  /* asymptotic, so it never claims to be finished before it is */
  const pctW = Math.min(94, 6 + (1 - Math.exp(-ms / 4200)) * 88);

  return (
    /* v1's own `.mv-loader` shell, so live.css styles it. Note the component
       simply does not render when off — `hidden` alone would not be enough,
       because `.mv-loader` sets display:flex and an author declaration beats
       the user-agent [hidden]{display:none}. */
    <div className="mv-loader" role="status" aria-live="polite">
      <div className="mv-loader-card">
        <div className="mv-load-mark" aria-hidden="true"><span /><span /><span /></div>
        <h3>{name ? `Loading ${name}` : 'Loading'}</h3>
        <p className="small muted">{step.text}…</p>
        <div className="mv-load-bar" aria-hidden="true"><i style={{ width: pctW.toFixed(1) + '%' }} /></div>
        <p className="tiny muted">
          {(ms / 1000).toFixed(1)}s · the appraisal roll has no index on the owner name, so a
          first read scans the whole roll year. The next view of this owner is instant.
        </p>
      </div>
    </div>
  );
}
