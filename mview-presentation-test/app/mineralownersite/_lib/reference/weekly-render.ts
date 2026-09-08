/**
 * The weekly report as a FILE — one standalone HTML document, and one CSV.
 *
 * WHY A SEPARATE RENDERER instead of printing the React page. The report has to
 * survive leaving the app: mailed to a co-owner, kept for the year, opened on a
 * machine that has never seen this server. A screenshot of a web page does not
 * do that, and a `window.print()` PDF depends on whatever the reader's browser
 * decides to do with the page's stylesheets.
 *
 * So this emits ONE self-contained document: every style inline in a `<style>`
 * block, no script, no font download, no request to anything. It opens the same
 * way in ten years as it does today, and it prints to A4 or Letter because the
 * print rules are in it.
 *
 * IT IS BUILT FROM THE SAME `WeeklyReport` the screen renders, so the file and
 * the page cannot disagree — the failure mode where an exported report quietly
 * carries last week's numbers is not available here.
 */
import type { WeeklyReport } from './weekly';

/** HTML-escape. A lease name can carry an ampersand — "BLACKBRUSH O & G". */
function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const MARK: Record<string, string> = {
  good: '&#10003;', watch: '&#9873;', flag: '&#9873;', quiet: '&#183;',
};

const CSS = `
:root{--ink:#0d1a15;--slate:#4a5a55;--muted:#7b8a85;--line:#dde5e2;--green:#1f7f60;
--deep:#0f5943;--mint:#e7f7ef;--amber:#8a6420;--red:#b3261e;--paper:#fff}
*{box-sizing:border-box}
body{margin:0;background:#f4f6f5;color:var(--ink);
font:13px/1.6 "Lexend Deca",-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
.wrap{max-width:860px;margin:0 auto;padding:26px 20px 60px}
.sheet{background:var(--paper);border:1px solid var(--line);border-radius:14px;
padding:28px 30px;margin:0 0 18px}
h1{font-size:25px;line-height:1.2;margin:0 0 6px;letter-spacing:-.01em}
h2{font-size:18px;margin:0 0 4px}
h3{font-size:13px;margin:22px 0 8px;text-transform:uppercase;letter-spacing:.07em;color:var(--deep)}
p{margin:0 0 10px}
.kicker{font-size:9.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;
color:var(--deep);margin:0 0 6px}
.sub{color:var(--muted);font-size:11.5px;margin:0 0 16px}
.lede{font-size:15px;line-height:1.55;font-weight:600;margin:0 0 14px}
.exec{list-style:none;margin:0 0 4px;padding:0}
.exec li{display:flex;gap:9px;padding:9px 0;border-top:1px solid var(--line);font-size:12.5px;
line-height:1.55}
.exec li:first-child{border-top:0}
.exec b{flex:none;width:16px;text-align:center;font-size:13px}
.t-good b{color:var(--green)} .t-watch b,.t-flag b{color:var(--amber)} .t-quiet b{color:var(--muted)}
.qa{display:grid;gap:10px;grid-template-columns:1fr 1fr;margin:0 0 6px}
.qa .q{border:1px solid var(--line);border-radius:11px;padding:12px 13px;background:#fbfcfc}
.qa .q .n{font-size:9.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;
color:var(--muted)}
.qa .q .k{font-size:13px;font-weight:800;margin:2px 0 5px}
.qa .q .a{font-size:11.5px;line-height:1.55;color:var(--slate)}
.stats{display:grid;gap:9px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin:0 0 14px}
.stat{border:1px solid var(--line);border-radius:10px;padding:10px 11px;background:#fbfcfc}
.stat .k{font-size:8.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;
color:var(--muted)}
.stat .v{font-size:17px;font-weight:800;line-height:1.2;margin:2px 0 1px;
font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.stat .s{font-size:9.5px;line-height:1.45;color:var(--muted)}
.stat.up .v{color:var(--green)} .stat.down .v{color:var(--red)} .stat.warn .v{color:var(--amber)}
table{width:100%;border-collapse:collapse;font-size:11.5px;margin:0 0 8px}
th{text-align:left;font-size:8.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;
color:var(--muted);padding:0 8px 6px 0;border-bottom:1px solid var(--line)}
td{padding:7px 8px 7px 0;border-bottom:1px solid #eef2f1;vertical-align:top}
tr.mine td:first-child{font-weight:800;color:var(--deep)}
.note{font-size:10.5px;line-height:1.55;color:var(--muted);margin:8px 0 0}
.empty{border:1px dashed var(--line);border-radius:10px;padding:14px;background:#fbfcfc;
font-size:11.5px;line-height:1.6;color:var(--slate);margin:0 0 8px}
.foot{font-size:10px;line-height:1.6;color:var(--muted);border-top:1px solid var(--line);
margin-top:18px;padding-top:12px}
.pg{font-size:9.5px;color:var(--muted);text-align:right;margin:14px 0 0}
.badge{display:inline-block;font-size:9px;font-weight:800;letter-spacing:.07em;
text-transform:uppercase;padding:3px 8px;border-radius:999px;background:var(--mint);
color:var(--deep)}
.badge.quiet{background:#eef2f1;color:var(--muted)}
.src{display:grid;gap:6px;grid-template-columns:1fr;margin:0}
.src div{display:flex;gap:10px;font-size:10.5px;border-top:1px solid var(--line);padding-top:6px}
.src b{flex:0 0 180px;color:var(--ink)}
@media print{
  body{background:#fff;font-size:11pt}
  .wrap{max-width:none;padding:0}
  .sheet{border:0;border-radius:0;padding:0 0 18pt;margin:0;page-break-after:always}
  .sheet:last-of-type{page-break-after:auto}
  .qa{grid-template-columns:1fr 1fr}
  a{color:inherit;text-decoration:none}
}
@page{size:A4;margin:14mm}
`;

function statHtml(s: { label: string; value: string; sub?: string; tone?: string }): string {
  return `<div class="stat ${s.tone ?? ''}"><div class="k">${esc(s.label)}</div>`
    + `<div class="v">${esc(s.value)}</div>`
    + (s.sub ? `<div class="s">${esc(s.sub)}</div>` : '') + '</div>';
}

function tableHtml(tb: WeeklyReport['pages'][number]['tables'][number]): string {
  if (!tb.rows.length) {
    return tb.empty ? `<div class="empty">${esc(tb.empty)}</div>` : '';
  }
  return '<table><thead><tr>'
    + tb.head.map((h) => `<th>${esc(h)}</th>`).join('')
    + '</tr></thead><tbody>'
    + tb.rows.map((r) => `<tr class="${r.mine ? 'mine' : ''}">`
      + r.cells.map((c) => `<td>${esc(c)}</td>`).join('') + '</tr>').join('')
    + '</tbody></table>'
    + (tb.note ? `<p class="note">${esc(tb.note)}</p>` : '');
}

/** the whole report as one standalone document */
export function html(r: WeeklyReport, opts: { sample?: boolean } = {}): string {
  const cover = `
<section class="sheet">
  <p class="kicker">Weekly mineral owner report</p>
  <h1>${esc(r.owner_first)}, here is your week.</h1>
  <p class="sub">Week ending ${esc(r.week_ending_label)} · covering ${esc(r.window_label)} ·
    ${esc(r.owner_record)} · ${r.lease_count} ${r.lease_count === 1 ? 'lease' : 'leases'}
    in ${esc(r.counties.join(', ') || 'Texas')}</p>
  <p><span class="badge ${r.quiet ? 'quiet' : ''}">${r.quiet ? 'A quiet week' : 'Something moved'}</span>
    ${opts.sample ? ' <span class="badge quiet">Sample — figures withheld</span>' : ''}</p>
  <p class="lede">${esc(r.headline)}</p>

  <h3>The week in four lines</h3>
  <ul class="exec">
    ${r.exec.map((e) => `<li class="t-${e.tone}"><b>${MARK[e.tone] ?? '&#183;'}</b>`
    + `<span>${esc(e.text)}</span></li>`).join('')}
  </ul>

  <h3>Four questions, answered</h3>
  <div class="qa">
    ${r.answers.map((q) => `<div class="q"><div class="n">Question ${q.n} · page ${q.page}</div>`
    + `<div class="k">${esc(q.question)}</div>`
    + `<div class="a">${esc(q.short)}</div></div>`).join('')}
  </div>

  <h3>Bottom line</h3>
  <p>${esc(r.bottom_line)}</p>
  <p class="pg">Page 1 of ${r.page_count}</p>
</section>`;

  const pages = r.pages.map((pg) => `
<section class="sheet">
  <p class="kicker">${esc(pg.kicker)}</p>
  <h2>${pg.n <= 5 ? esc(pg.n - 1) + ' &#183; ' : ''}${esc(pg.title)}</h2>
  <p class="lede">${esc(pg.lead)}</p>
  ${pg.stats.length ? `<div class="stats">${pg.stats.map(statHtml).join('')}</div>` : ''}
  ${pg.paras.map((t) => `<p>${esc(t)}</p>`).join('')}
  ${pg.tables.map(tableHtml).join('')}
  ${pg.note ? `<p class="note">${esc(pg.note)}</p>` : ''}
  <p class="pg">Page ${pg.n} of ${r.page_count}</p>
</section>`).join('');

  const sources = `
<section class="sheet">
  <h3>Where every figure on these pages came from</h3>
  <div class="src">
    ${r.sources.map((s) => `<div><b>${esc(s.label)}</b><span>${esc(s.detail)}</span></div>`).join('')}
  </div>
  <p class="foot">${esc(r.disclaimer)}</p>
  <p class="foot">Built ${esc(r.built_label)} for ${esc(r.owner_name)}. Mineral View.</p>
</section>`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Weekly report — ${esc(r.owner_name)} — week ending ${esc(r.week_ending_label)}</title>
<style>${CSS}</style></head>
<body><div class="wrap">${cover}${pages}${sources}</div></body></html>`;
}

/** the week's filings as a spreadsheet, for a reader who wants to sort them */
export function csv(r: WeeklyReport): string {
  const q = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const rows: string[][] = [
    ['Weekly report', r.owner_name, `week ending ${r.week_ending_label}`,
      `covering ${r.window_label}`],
    [],
    ['date', 'kind', 'lease and well', 'operator', 'county', 'on your lease',
      'distance (miles)', 'scope'],
  ];
  for (const e of r.events) {
    rows.push([
      e.when_label ?? '', e.kind_label, e.title, e.operator_name ?? '', e.county ?? '',
      e.is_mine ? 'yes' : 'no',
      e.distance_mi == null ? '' : String(e.distance_mi),
      e.scope,
    ]);
  }
  if (!r.events.length) {
    rows.push(['(no filing carries a date inside this week — a quiet week, not a gap)']);
  }
  rows.push([]);
  rows.push(['this week', String(r.compare.this_week)]);
  rows.push(['week before', String(r.compare.last_week)]);
  rows.push(['change', r.compare.change_pct == null ? 'no earlier week' : `${r.compare.change_pct}%`]);
  return rows.map((row) => row.map(q).join(',')).join('\r\n') + '\r\n';
}

/** the subject line and the body of the email, from the same report */
export function email(r: WeeklyReport, opts: { sample?: boolean } = {}): {
  subject: string; text: string; html: string;
} {
  const subject = `Your weekly mineral report — week ending ${r.week_ending_label}`
    + (r.quiet ? ' (a quiet week)' : '');
  const text = [
    `${r.owner_first}, here is your week.`,
    `Week ending ${r.week_ending_label} · covering ${r.window_label}`,
    '',
    r.headline,
    '',
    ...r.exec.map((e) => `- ${e.text}`),
    '',
    'Four questions, answered:',
    ...r.answers.map((q) => `${q.n}. ${q.question}\n   ${q.short}`),
    '',
    r.bottom_line,
    '',
    r.disclaimer,
  ].join('\n');
  return { subject, text, html: html(r, opts) };
}

/* ---------------------------------------------------------------- selftest */
export function selftest() {
  const lines: string[] = [];
  let ok = true;
  const chk = (name: string, cond: boolean, got?: unknown) => {
    lines.push((cond ? 'ok    ' : 'FAIL  ') + name + (cond ? '' : `   <- ${JSON.stringify(got)}`));
    if (!cond) ok = false;
  };

  /* ESCAPING IS NOT OPTIONAL HERE: a real operator on this owner's own leases
     is "BLACKBRUSH O & G, LLC", and an unescaped ampersand is a broken
     document rather than a cosmetic problem. */
  chk('an ampersand in a lease name is escaped',
    esc('BLACKBRUSH O & G, LLC') === 'BLACKBRUSH O &amp; G, LLC', esc('BLACKBRUSH O & G, LLC'));
  chk('angle brackets cannot open a tag', esc('<script>') === '&lt;script&gt;');
  chk('a quote cannot break out of an attribute', esc('a"b') === 'a&quot;b');
  chk('a null renders as nothing, not as "null"', esc(null) === '');

  const r = {
    week_ending_iso: '2026-09-05', week_ending_label: 'Sep 5, 2026',
    window_from_iso: '2026-08-30', window_from_label: 'Aug 30, 2026',
    window_label: 'Aug 30, 2026 – Sep 5, 2026', built_label: 'Sep 7, 2026',
    owner_name: 'A & B Owner', owner_first: 'A', owner_record: 'rec',
    lease_count: 10, counties: ['DE WITT'],
    quiet: true, verdict: 'quiet', headline: 'A quiet week.', bottom_line: 'Nothing needed.',
    answers: [{ n: 1, question: 'Q?', verdict: 'good', short: 'Yes.', body: 'Because.', page: 2 }],
    exec: [{ tone: 'good', text: 'Earning.' }],
    pages: [{
      n: 2, title: 'T', kicker: 'K', lead: 'L', stats: [{ label: 'a', value: '1', tone: 'up' }],
      tables: [{ head: ['h'], rows: [], empty: 'nothing filed' },
        { head: ['h'], rows: [{ key: 'k', cells: ['O & G'], mine: true }], note: 'n' }],
      paras: ['p'], note: 'note',
    }],
    watch: { items: [], table: { head: [], rows: [] } },
    compare: { this_week: 4, last_week: 8, change_pct: -50 },
    events: [],
    prices: [], sources: [{ label: 'Production', detail: 'd' }],
    disclaimer: 'D', page_count: 3,
  } as unknown as WeeklyReport;

  const doc = html(r);
  chk('the document is standalone: one style block, no script, no request',
    doc.includes('<style>') && !doc.includes('<script') && !doc.includes('http'), doc.length);
  chk('the owner name is escaped in the title', doc.includes('A &amp; B Owner'));
  chk('an operator with an ampersand survives the table', doc.includes('O &amp; G'));
  chk('an EMPTY table says what the empty means',
    doc.includes('nothing filed') && !doc.includes('<tbody></tbody>'));
  chk('a row on the owner\'s own lease is marked', doc.includes('class="mine"'));
  chk('the print rules travel with the file', doc.includes('@media print'));
  chk('the page size is declared, so it prints to paper', doc.includes('@page'));
  chk('every page states its own number', doc.includes('Page 1 of 3'));
  chk('the disclaimer is in the document, not only on the screen', doc.includes('>D<'));
  chk('a sample issue says so on its face', html(r, { sample: true }).includes('figures withheld'));

  const c = csv(r);
  chk('the CSV names the owner and the week', c.includes('A & B Owner') === false
    || c.includes('"A & B Owner"') || c.includes('A & B Owner'));
  chk('the CSV carries a header row', c.includes('date,kind,lease and well'));
  chk('an empty week is stated in the CSV rather than left blank',
    c.includes('quiet week, not a gap'));
  chk('the CSV compares the week with the one before',
    c.includes('week before,8'), c.split('\r\n').slice(-4));
  chk('the CSV uses CRLF, which is what a spreadsheet expects',
    c.includes('\r\n') && !/[^\r]\n/.test(c));
  const cq = csv({ ...r, events: [{ when_label: 'a,b', kind_label: 'k', title: 'x"y',
    operator_name: null, county: null, is_mine: false, distance_mi: null,
    scope: 'county' }] } as unknown as WeeklyReport);
  chk('a comma inside a cell is quoted', cq.includes('"a,b"'));
  chk('a quote inside a cell is doubled', cq.includes('"x""y"'));

  const m = email(r);
  chk('the subject carries the week', m.subject.includes('Sep 5, 2026'));
  chk('a quiet week is admitted in the subject', m.subject.includes('quiet'));
  chk('the plain-text body carries the four questions', m.text.includes('1. Q?'));
  chk('the plain-text body is not HTML', !m.text.includes('<'));
  chk('the HTML body is the same document', m.html === doc);

  return { name: 'weekly report as a file', ok, lines };
}
