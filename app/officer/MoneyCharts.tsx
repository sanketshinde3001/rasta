"use client";

import { useState } from "react";
import { AUDIT_CATEGORIES, treemap, type AuditCategory, type AuditItem, type WarrantyWard } from "@/lib/audit-overview";
import { inr, inrShort } from "@/lib/taxonomy";
import "./money-charts.css";

type Selection = { title: string; wards: string[]; category?: AuditCategory; warranty?: boolean };

export function MoneyCharts({ items, warranty }: { items: AuditItem[]; warranty: WarrantyWard[] }) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [category, setCategory] = useState<AuditCategory | null>(null);
  const [allEvidence, setAllEvidence] = useState(false);
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const warrantyTotal = warranty.reduce((sum, ward) => sum + ward.surface + ward.review, 0);
  const groups = AUDIT_CATEGORIES.map((c) => {
    const amounts = new Map<string, number>();
    items.filter((item) => item.category === c.id).forEach((item) => amounts.set(item.ward, (amounts.get(item.ward) || 0) + item.amount));
    const wards = [...amounts].map(([ward, amount]) => ({ label: `Ward ${ward}`, wards: [ward], amount })).sort((a, b) => b.amount - a.amount);
    const top = wards.slice(0, 4);
    const rest = wards.slice(4);
    if (rest.length) top.push({ label: `${rest.length} other wards`, wards: rest.flatMap((w) => w.wards), amount: rest.reduce((sum, w) => sum + w.amount, 0) });
    return { ...c, amount: wards.reduce((sum, w) => sum + w.amount, 0), wards: top.sort((a, b) => b.amount - a.amount) };
  }).filter((c) => c.amount > 0 && (!category || c.id === category)).sort((a, b) => b.amount - a.amount);
  const boxes = treemap(groups, { x: 0, y: 0, width: 500, height: 380 }).flatMap((group) =>
    treemap(group.wards, group).map((tile) => ({ ...tile, category: group.id, color: group.color, reason: group.label }))
  );
  const rows = showAll ? warranty : warranty.slice(0, 12);
  const maximum = Math.max(100_000, Math.ceil((warranty[0]?.surface + warranty[0]?.review || 0) / 1_000_000) * 1_000_000);
  const evidence = selection ? items.filter((item) => selection.wards.includes(item.ward) && (!selection.category || item.category === selection.category) && (!selection.warranty || item.underWarranty)).sort((a, b) => b.amount - a.amount) : [];
  const select = (next: Selection) => { setSelection(next); setAllEvidence(false); };

  return (
    <section className="money-overview" aria-label="Citywide repair money dashboard">
      <div className="money-section-title">
        <div><h2>Follow the repair money</h2><p>All 24 wards · Synthetic 2025 dataset · Select a tile or bar to inspect the bills</p></div>
      </div>
      <div className="money-chart-grid">
        <article className="money-chart-card">
          <header className="money-chart-heading"><span className="money-badge"><i />High</span><h3>Where the questioned money sits</h3><details className="money-why"><summary>Why?</summary><p>Each work order counts once, using its largest flagged amount. Warranty and duplicate candidates use the full bill; bills above 1.5× the rate card use only the excess. Scope-review work is shown separately and requires checking the contract. These amounts are candidates for review, not money already recovered.</p></details></header>
          <div className="money-headline"><b>{inrShort(total)}</b><span>across {items.length.toLocaleString("en-IN")} distinct work orders</span></div>
          <div className="money-legend" aria-label="Filter audit reasons">
            {AUDIT_CATEGORIES.map((c) => <button key={c.id} aria-pressed={category === c.id} onClick={() => { setCategory(category === c.id ? null : c.id); setSelection(null); }}><i style={{ background: c.color }} />{c.label}</button>)}
          </div>
          {category && <p className="money-filter-note">Showing {AUDIT_CATEGORIES.find((c) => c.id === category)?.label}: {inrShort(groups.reduce((sum, g) => sum + g.amount, 0))}. Select the reason again to show all.</p>}
          <div className="money-treemap" aria-label="Questioned money by reason and ward">
            {boxes.map((tile) => {
              const label = `${tile.label}: ${inr(tile.amount)} · ${tile.reason}`;
              return <button key={`${tile.category}-${tile.label}`} className="money-tile" style={{ left: `${tile.x / 5}%`, top: `${tile.y / 3.8}%`, width: `${tile.width / 5}%`, height: `${tile.height / 3.8}%`, background: tile.color }} title={label} aria-label={label} onClick={() => select({ title: `${tile.reason} · ${tile.label}`, wards: tile.wards, category: tile.category })}>
                {tile.width >= 65 && tile.height >= 38 && <><span>{tile.label}</span><b>{inrShort(tile.amount)}</b></>}
              </button>;
            })}
            {!boxes.length && <p className="empty">No audit candidates for this selection.</p>}
          </div>
          <p className="money-footnote">Tile area represents the questioned amount. Overlapping flags are counted once.</p>
        </article>
        <article className="money-chart-card">
          <header className="money-chart-heading"><span className="money-badge critical"><i />Critical</span><h3>Repairs billed on roads under warranty</h3><details className="money-why"><summary>Why?</summary><p>Ward totals include all work orders marked under the Defect Liability Period (DLP). Orange marks surface work; brown marks drainage, covers and other work needing a contract-scope check. Billed amounts do not establish payment or recovery. Wards are ranked by their total warranty-related bills.</p></details></header>
          <div className="money-headline"><b>{inrShort(warrantyTotal)}</b><span>{warranty.reduce((sum, w) => sum + w.jobs, 0)} bills to check against warranty scope</span></div>
          <div className="money-legend money-static-legend"><span><i style={{ background: "#e9743c" }} />Surface work</span><span><i style={{ background: "#ad6632" }} />Check contract scope</span></div>
          <div className="money-bars">
            {rows.map((ward) => <button className="money-bar-row" key={ward.ward} title={`Ward ${ward.ward}: surface ${inr(ward.surface)}; scope review ${inr(ward.review)}; ${ward.jobs} work orders`} aria-label={`Inspect Ward ${ward.ward} warranty bills, ${inr(ward.surface + ward.review)}`} onClick={() => select({ title: `Warranty bills · Ward ${ward.ward}`, wards: [ward.ward], warranty: true })}>
              <span className="money-bar-label">Ward {ward.ward}</span>
              <span className="money-bar-track"><span className="money-bar-fill" style={{ width: `${100 * (ward.surface + ward.review) / maximum}%` }}><i style={{ width: `${100 * ward.surface / (ward.surface + ward.review)}%`, background: "#e9743c" }} /><i style={{ flex: 1, background: "#ad6632" }} /></span></span>
              <b className="money-bar-value">{inrShort(ward.surface + ward.review)}</b>
            </button>)}
            {!rows.length && <p className="empty">No warranty-related bills in this dataset.</p>}
            <div className="money-axis" aria-hidden="true">{[0, 0.25, 0.5, 0.75, 1].map((v) => <span key={v}>{inrShort(maximum * v)}</span>)}</div>
          </div>
          <div className="money-chart-bottom"><span>Ranked by billed amount</span><button onClick={() => setShowAll(!showAll)} aria-expanded={showAll}>{showAll ? "Show top 12" : `Show all ${warranty.length} wards`}</button></div>
        </article>
      </div>
      {selection && <div className="money-evidence" aria-live="polite">
        <div className="between wrap-gap"><div><h3>{selection.title}</h3><p className="small ink2">{evidence.length} work orders · {inr(evidence.reduce((sum, item) => sum + (selection.warranty ? item.billed : item.amount), 0))} {selection.warranty ? "billed" : "questioned"}</p></div><button className="btn ghost sm" onClick={() => setSelection(null)}>Close details</button></div>
        <div className="money-table-scroll"><table><thead><tr><th>Work order / road</th><th>Contractor</th><th>Billed</th><th>{selection.warranty ? "Work type" : "Questioned"}</th></tr></thead><tbody>{(allEvidence ? evidence : evidence.slice(0, 8)).map((item) => <tr key={item.id}><td><b>{item.id}</b><a href={`/roads/${encodeURIComponent(item.roadId)}`}>{item.road} · Ward {item.ward}</a></td><td>{item.contractor}<span>{item.method}</span></td><td>{inr(item.billed)}</td><td>{selection.warranty ? (/patch|asphalt|paver|PQC/i.test(item.method) ? "Surface work" : "Scope review") : inr(item.amount)}</td></tr>)}</tbody></table></div>
        {evidence.length > 8 && <button className="btn ghost sm" onClick={() => setAllEvidence(!allEvidence)}>{allEvidence ? "Show largest 8 bills" : `Show all ${evidence.length} bills`}</button>}
      </div>}
    </section>
  );
}
