"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { INVOICES } from "../_lib/billing-records";

/**
 * THE INVOICE TABLE.
 *
 * ── THE SEARCH BOX IS REAL, AND IT MATCHES WHAT IS ON SCREEN ──
 *
 * Plan name, processor, period, amount and status — the same five strings the
 * reader can see in the row, joined and lowercased, rather than a hidden index.
 * That is the rule the Alerts page's own search follows and for the same
 * reason: a reader who types a figure they can see should find the row it is
 * in.
 *
 * ── DOWNLOAD PDF CONFIRMS ITSELF AND NOTHING ELSE ──
 *
 * There is no invoice PDF to serve — no billing service stands behind this page
 * yet — so the button reports that it was pressed and stops. The source does
 * the same. What it must not do is open a blank tab or download a zero-byte
 * file, either of which reads as a broken product rather than an unfinished
 * one.
 */
export function InvoicesCard() {
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return INVOICES;
    return INVOICES.filter((invoice) =>
      [invoice.title, invoice.processor, invoice.period, invoice.amount, invoice.status]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [query]);

  return (
    <div className="card card-pad" style={{ marginBottom: 14 }}>
      <div className="between" style={{ flexWrap: "wrap" }}>
        <h4>Invoices</h4>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search invoices — plan, month, amount…"
          aria-label="Search invoices"
          style={{
            minWidth: 220,
            padding: "7px 11px",
            border: "1px solid var(--line)",
            borderRadius: 9,
            fontSize: 12.5,
            fontFamily: "var(--sans)",
          }}
        />
      </div>

      <div className="tablewrap" style={{ marginTop: 10 }}>
        <table style={{ minWidth: 560 }}>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Period</th>
              <th className="right">Amount</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((invoice) => (
              <tr key={invoice.id}>
                <td>
                  <strong className="small">{invoice.title}</strong>
                  <div className="tiny muted">{invoice.processor}</div>
                </td>
                <td className="small">{invoice.period}</td>
                <td className="right num">{invoice.amount}</td>
                <td>
                  <span className="chip chip-mint">{invoice.status}</span>
                </td>
                <td>
                  <DownloadButton />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 ? (
        <p className="tiny muted" style={{ marginTop: 8 }}>
          No invoices match that search.
        </p>
      ) : null}

      <p className="tiny muted" style={{ marginTop: 8 }}>
        Payments processed by <strong>Braintree, a PayPal service</strong>. Prices
        exclude applicable taxes shown at checkout. Full mechanics:{" "}
        <Link href="/subscription-terms">Subscription Terms</Link>.
      </p>
    </div>
  );
}

function DownloadButton() {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={() => setDone(true)}
      aria-live="polite"
    >
      {done ? "PDF ✓" : "Download PDF"}
    </button>
  );
}
