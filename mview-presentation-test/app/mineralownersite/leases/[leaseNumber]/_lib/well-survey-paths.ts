/**
 * THE THREE SURVEY PROJECTIONS, AS PLOTTED PATHS.
 *
 * ── WHY THESE ARE PATHS AND NOT STATIONS ──
 *
 * Every other geometry in this module stores real coordinates and projects them
 * in code (see `unit-outline-projection.ts`), because the outline has to survive
 * a change of viewBox. These do not: the design ships the three projections as
 * baked `d` attributes and does not publish DEFTONES 2H's 115 stations anywhere,
 * so re-deriving them would mean inventing station data to fit a curve we can
 * already draw exactly. Storing the plotted path is the honest option — it is
 * the same fidelity the design has, and no more.
 *
 * All three are drawn in a 300x190 box. The green stroke is the same one the
 * unit outline uses for a measured line, which is the point: a measured path is
 * always drawn this way, and an unmeasured one is not drawn at all.
 *
 * If the survey service is ever wired, these become derived output and this file
 * goes away — the panel reads the projections, not the literals.
 */

export const SURVEY_VIEWBOX = { width: 300, height: 190 } as const;

/** One of the three orthogonal views a wrong survey gives itself away in. */
export interface SurveyProjection {
  title: string;
  /** The plotted path, in `SURVEY_VIEWBOX` units. */
  d: string;
  /** The figure the caption leads with, and the clause after it. */
  caption: { lead: string; rest: string };
}

export const deftones2HProjections: SurveyProjection[] = [
  {
    title: "Plan view — E/W against N/S",
    d: "M46.3,16.7 L46.3,16.7 L46.2,16.7 L46.1,16.6 L45.9,16.6 L45.6,16.5 L45.2,16.4 L44.2,16.2 L42.6,15.9 L40.6,15.5 L38.2,15.0 L35.7,14.4 L33.2,13.9 L30.7,13.3 L28.2,12.8 L25.8,12.3 L23.4,11.9 L20.9,11.3 L18.5,10.8 L16.3,10.3 L16.0,10.2 L14.5,9.9 L12.9,9.6 L12.0,9.4 L11.8,9.4 L11.7,9.3 L11.6,9.3 L11.4,9.3 L11.2,9.3 L11.1,9.2 L10.8,9.1 L10.6,9.1 L10.4,9.2 L10.1,9.3 L10.1,9.3 L10.2,9.4 L10.4,9.5 L10.6,9.6 L10.5,9.6 L10.3,9.4 L10.2,9.0 L10.2,8.6 L10.1,8.3 L9.8,8.1 L9.6,8.2 L9.1,8.2 L8.9,8.2 L8.9,8.3 L8.5,8.1 L8.0,8.0 L8.0,8.0 L8.0,8.0 L8.2,8.0 L8.7,8.1 L9.0,8.2 L9.2,8.2 L9.8,8.7 L10.9,9.8 L12.7,11.4 L15.2,13.4 L18.2,15.7 L21.5,18.5 L25.5,21.4 L30.4,24.5 L35.3,27.6 L40.1,30.9 L44.9,34.2 L50.1,37.3 L55.8,40.2 L61.5,43.1 L66.8,46.2 L71.7,49.5 L76.2,52.8 L80.9,56.2 L85.7,59.5 L90.5,62.8 L95.4,66.1 L100.1,69.4 L104.7,72.7 L109.5,76.0 L114.3,79.3 L119.2,82.6 L124.0,85.8 L128.8,89.1 L133.7,92.4 L138.6,95.6 L143.4,98.8 L148.1,102.1 L152.7,105.4 L157.4,108.8 L162.1,112.1 L166.9,115.4 L172.1,118.6 L177.2,121.6 L182.5,124.7 L187.8,127.8 L193.2,130.8 L198.9,133.8 L204.3,136.8 L209.7,139.9 L215.2,143.0 L220.7,146.0 L226.5,148.9 L232.4,151.8 L238.3,154.6 L244.2,157.4 L250.0,160.3 L255.9,163.2 L261.6,166.1 L267.2,169.1 L273.0,172.0 L278.7,175.0 L284.3,177.9 L288.6,180.1 L292.0,182.0",
    caption: { lead: "3,796 ft S, 2,780 ft E", rest: "of the wellhead · surface at the top left" },
  },
  {
    title: "Section — distance against TVD",
    d: "M31.1,8.0 L31.1,10.2 L31.0,13.2 L30.9,16.2 L30.8,19.2 L30.7,22.3 L30.4,25.3 L29.8,28.3 L28.9,31.3 L27.8,34.3 L26.4,37.2 L24.8,40.2 L23.3,43.2 L21.9,46.2 L20.4,49.2 L19.0,52.2 L17.6,55.1 L16.2,58.1 L14.7,61.1 L13.4,64.1 L13.2,64.7 L12.4,67.1 L11.5,70.1 L10.9,73.1 L10.8,76.1 L10.7,79.1 L10.7,82.2 L10.5,85.2 L10.5,88.2 L10.4,91.2 L10.2,94.2 L10.1,97.2 L10.1,100.2 L10.1,103.2 L10.1,106.2 L10.3,109.2 L10.4,112.3 L10.5,115.3 L10.5,118.3 L10.3,121.3 L9.8,124.3 L9.4,127.3 L9.1,130.3 L8.8,133.3 L8.7,136.4 L8.6,139.4 L8.5,142.4 L8.6,145.4 L8.3,148.4 L8.0,151.4 L8.0,154.5 L8.0,157.5 L8.1,160.5 L8.4,163.5 L8.5,165.0 L8.6,166.6 L9.3,168.1 L10.9,169.5 L13.2,170.9 L16.2,172.1 L19.7,173.2 L23.7,174.1 L28.3,174.8 L33.2,175.3 L38.3,175.6 L43.4,175.8 L48.5,176.0 L53.7,176.1 L58.8,176.2 L63.9,176.3 L69.1,176.5 L74.2,176.6 L79.3,176.8 L84.5,176.8 L89.7,176.9 L94.9,177.0 L100.1,177.1 L105.2,177.3 L110.3,177.5 L115.5,177.6 L120.6,177.8 L125.8,177.9 L130.9,178.1 L136.1,178.3 L141.2,178.5 L146.4,178.8 L151.5,179.0 L156.6,179.3 L161.7,179.5 L166.9,179.7 L172.0,179.8 L177.2,180.0 L182.4,180.1 L187.4,180.3 L192.6,180.5 L197.7,180.6 L202.8,180.7 L208.0,180.8 L213.1,180.9 L218.2,180.9 L223.4,181.0 L228.6,181.0 L233.7,181.0 L238.8,181.0 L243.9,181.1 L249.0,181.1 L254.2,181.2 L259.3,181.2 L264.4,181.3 L269.5,181.4 L274.7,181.5 L279.8,181.7 L284.9,181.8 L288.8,181.9 L292.0,182.0",
    caption: { lead: "10,803 ft TVD", rest: "total depth — the hole turning over to horizontal" },
  },
  {
    title: "Inclination against measured depth",
    d: "M8.0,182.0 L10.5,181.2 L14.0,181.2 L17.5,180.4 L20.9,180.4 L24.4,180.4 L27.9,176.8 L31.3,172.7 L34.8,168.2 L38.3,166.4 L41.7,162.8 L45.2,163.1 L48.7,163.5 L52.2,163.9 L55.6,164.3 L59.1,164.3 L62.6,164.1 L66.1,163.7 L69.5,164.5 L73.0,167.8 L73.7,168.4 L76.5,168.8 L80.0,171.9 L83.4,179.1 L86.9,181.4 L90.4,181.4 L93.8,180.6 L97.3,179.9 L100.8,181.4 L104.2,180.4 L107.7,179.5 L111.1,180.4 L114.6,180.1 L118.1,180.1 L121.5,180.4 L125.0,180.4 L128.4,180.1 L131.9,181.2 L135.4,180.4 L138.8,178.3 L142.3,174.0 L145.7,179.5 L149.2,176.6 L152.7,179.9 L156.2,180.1 L159.6,177.5 L163.1,179.7 L166.6,180.4 L170.0,177.1 L173.5,180.1 L177.0,180.4 L180.5,180.3 L183.9,178.5 L187.4,177.9 L189.1,179.5 L190.9,177.9 L192.6,155.0 L194.4,138.1 L196.1,125.0 L197.9,105.2 L199.6,89.7 L201.3,72.5 L203.0,51.7 L204.8,35.4 L206.5,25.7 L208.3,16.9 L210.0,14.8 L211.7,15.8 L213.4,16.4 L215.2,20.8 L216.9,17.1 L218.6,16.0 L220.3,15.6 L222.1,13.1 L223.8,13.4 L225.6,14.2 L227.3,16.2 L229.0,20.2 L230.7,21.6 L232.5,16.7 L234.2,17.1 L235.9,17.5 L237.7,20.8 L239.4,24.3 L241.1,24.5 L242.9,25.3 L244.6,26.9 L246.3,24.1 L248.1,22.6 L249.8,17.7 L251.5,18.5 L253.3,17.7 L255.0,19.3 L256.7,21.0 L258.5,21.4 L260.2,14.0 L261.9,14.0 L263.6,14.4 L265.4,12.3 L267.1,8.2 L268.8,8.0 L270.6,8.4 L272.3,8.4 L274.0,9.6 L275.7,10.3 L277.5,11.1 L279.2,11.9 L281.0,13.1 L282.7,13.2 L284.4,14.6 L286.1,16.6 L287.9,16.7 L289.6,16.7 L290.9,18.1 L292.0,18.1",
    caption: { lead: "89.5°", rest: "built over 15,335 ft of hole" },
  },
];
