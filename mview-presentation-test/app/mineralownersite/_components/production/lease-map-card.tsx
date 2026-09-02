import { casperMap } from "../../_lib/portal-production-data";

/**
 * WHERE THIS LEASE SITS — a projected Texas silhouette with a pin on Ward
 * County.
 *
 * NO EXTERNAL TILES, and that is the reference's own note on this card. It is a
 * single inline path, so the card costs one request, works offline, prints, and
 * cannot leak the reader's location to a tile server. The Map module will use
 * real tiles when it lands; this is a locator, not a map.
 *
 * THE PIN IS AT AN EXACT PROJECTED COORDINATE — (56.7, 89.8) in the 200×190
 * viewBox — with the shadow ellipse a shade below it and the ring around it, so
 * the drop lands ON the county rather than near it. Those three numbers are the
 * reference's and are not worth recomputing.
 */
export function LeaseMapCard() {
  return (
    <div className="chartbox pf2-mapcard">
      <h4>{casperMap.heading}</h4>
      <div className="pf2-mapfig">
        <svg viewBox="0 0 200 190" role="img" aria-label={casperMap.aria}>
          <path
            d="M75.2 6.0 L101.2 6.0 L101.2 38.5 L102.3 38.3 L105.5 41.6 L107.3 41.0 L111.8 41.2 L112.8 44.4 L115.7 44.2 L118.9 45.7 L121.7 45.5 L122.9 46.9 L124.7 45.3 L127.4 46.1 L128.6 47.9 L130.7 48.2 L131.8 50.5 L134.3 48.3 L137.6 49.5 L138.9 50.9 L140.5 50.3 L141.7 52.4 L145.3 48.6 L146.4 50.6 L149.5 50.6 L152.5 51.7 L153.6 53.2 L156.4 50.6 L159.5 49.8 L160.9 50.7 L164.2 49.1 L165.0 50.0 L168.7 50.1 L169.7 48.6 L173.4 50.3 L174.8 52.2 L180.3 54.0 L181.8 55.6 L184.6 54.8 L186.6 55.5 L186.6 64.4 L186.6 81.6 L189.8 85.3 L189.8 89.0 L193.8 95.8 L194.0 99.3 L192.5 103.7 L191.1 105.4 L191.6 107.7 L190.5 109.4 L191.6 112.7 L188.3 118.6 L189.5 120.3 L187.2 120.4 L179.7 122.7 L177.0 121.4 L176.6 118.6 L174.7 120.6 L173.4 120.1 L172.6 122.5 L174.1 123.5 L174.4 126.6 L171.7 129.9 L167.4 134.1 L158.8 138.5 L157.9 137.7 L155.3 138.8 L155.2 137.8 L151.7 138.6 L150.0 136.5 L149.0 136.9 L152.8 141.2 L150.0 142.6 L147.5 141.8 L147.1 144.8 L143.8 147.9 L140.5 153.7 L138.4 159.8 L136.9 159.3 L136.5 161.5 L138.1 161.0 L137.3 165.4 L136.2 165.6 L136.1 168.1 L137.5 169.4 L137.9 174.5 L139.4 176.2 L139.8 179.4 L141.1 182.3 L136.7 184.0 L134.9 181.8 L131.5 181.0 L127.0 181.2 L123.2 178.4 L120.3 178.2 L118.1 176.0 L115.1 175.2 L113.1 173.1 L111.7 168.1 L109.1 165.0 L109.5 162.5 L108.3 159.7 L108.7 157.3 L106.9 154.6 L105.4 154.4 L102.9 152.0 L102.2 148.9 L100.0 146.2 L97.0 143.9 L95.5 138.8 L94.1 137.5 L92.2 133.4 L91.6 130.1 L89.8 127.7 L86.7 125.6 L86.0 124.1 L83.2 122.9 L81.0 119.2 L74.7 118.4 L70.9 118.5 L67.7 117.3 L67.0 119.0 L63.5 119.5 L60.9 123.0 L59.4 128.6 L58.5 128.7 L56.6 132.0 L54.2 132.1 L50.7 129.6 L41.8 125.4 L40.1 123.2 L36.6 121.1 L34.2 116.3 L34.0 112.0 L31.6 108.5 L31.0 105.5 L29.5 103.6 L23.9 100.7 L20.9 96.9 L18.5 95.5 L15.9 92.2 L12.3 90.4 L9.8 86.0 L7.6 85.1 L6.0 83.2 L6.4 81.5 L57.3 81.5 L57.3 64.7 L57.6 47.7 L57.7 6.0 L75.2 6.0 Z"
            fill="#e5ebf1"
            stroke="#c6d2dd"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          {/* Ward County pin · the exact projected location (56.7, 89.8). */}
          <ellipse cx="56.7" cy="91.4" rx="5.2" ry="1.7" fill="#0f172a" opacity=".12" />
          <circle
            cx="56.7"
            cy="89.8"
            r="4.6"
            fill="none"
            stroke="#2e8f6d"
            strokeWidth="1"
            opacity=".3"
          />
          <path
            d="M56.7 89.8 C 52.3 83.6 50.5 81.1 50.5 77.4 A 6.2 6.2 0 1 1 62.9 77.4 C 62.9 81.1 61.1 83.6 56.7 89.8 Z"
            fill="var(--green-deep)"
          />
          <circle cx="56.7" cy="77.4" r="2.6" fill="#fff" />
          <text x="67.5" y="80.5" fontSize="9.5" fontWeight="700" fill="#475569">
            {casperMap.pinLabel}
          </text>
        </svg>
      </div>
      <div className="pf2-mapcap">{casperMap.caption}</div>
      <p className="pf2-mapsub">{casperMap.sub}</p>
    </div>
  );
}
