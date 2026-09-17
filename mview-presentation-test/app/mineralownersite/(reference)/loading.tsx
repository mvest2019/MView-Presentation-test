/**
 * WHAT IS ON SCREEN WHILE A PORTAL ROUTE IS BEING BUILT.
 *
 * DEFECT #27: pressing "Alert preferences" from the Alerts header "takes too
 * much time to load and shows no loader". Both halves of that are true and
 * they are one cause. Every page in this group is `force-dynamic` and awaits
 * `getOwnerPayload`, which reads the owner record — and on a cold read that is
 * a real wait. Until this file existed there was no `loading.tsx` anywhere
 * under `/mineralownersite`, so Next had no boundary to show anything at: the
 * click landed, the old page stayed on screen unchanged, and the reader had no
 * way to tell whether it had registered. The second press made it worse, not
 * faster.
 *
 * A route-group `loading.tsx` is the framework's own answer. It wraps every
 * page under `(reference)` in a Suspense boundary, so the navigation commits
 * IMMEDIATELY and this renders while the server work finishes.
 *
 * IT IS THE SAME SKELETON LANGUAGE AS THE SHELL'S — see `ShellSkeleton` in
 * `Portal` and `.mv-shellskel` in `dashboard-reference.alerts.css`. A reader
 * who has seen one of these recognises the other, and the two cover the two
 * different waits: this one is the server building the route, that one is the
 * browser deciding which density to render it at.
 *
 * WHY IT DOES NOT DRAW THE CHROME. The sidebar and top bar are rendered by
 * `Portal`, which is inside the page — not in this group's layout — so there
 * is nothing here to keep. Reproducing them would mean a second copy of the
 * chrome that could drift from the real one, which is the defect the payload's
 * own comments say the single snapshot exists to prevent.
 */
export default function PortalRouteLoading() {
  return (
    <div className="mv-ref-app in-app">
      <div className="mv-shellskel" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading</span>
        <div className="sk-line sk-head" />
        <div className="sk-line sk-sub" />
        <div className="sk-card" />
        <div className="sk-row">
          <div className="sk-card sk-sm" />
          <div className="sk-card sk-sm" />
          <div className="sk-card sk-sm" />
        </div>
        <div className="sk-card" />
      </div>
    </div>
  );
}
