import React, { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { getMonthly } from "../services/api";
import "./SpendCharts.css";

const inr = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 2,
  }).format(n);

const inrCompact = (n) =>
  new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n);

// "2026-10" -> "Oct 26"
const monthLabel = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
};

const MAX_SLICES = 5; // pies stop being readable past ~6 slices

// Top N categories + everything else folded into "Other".
function toPieData(byCategory) {
  const rows = byCategory
    .map((c) => ({ name: c.category, value: Number(c.total) }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
  if (rows.length <= MAX_SLICES + 1) return rows;
  const top = rows.slice(0, MAX_SLICES);
  const other = rows.slice(MAX_SLICES).reduce((s, r) => s + r.value, 0);
  return [...top, { name: "Other", value: other, isOther: true }];
}

function ChartTooltip({ active, payload, label, title }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="sc-tooltip">
      <div className="sc-tooltip-title">{title ?? label ?? p.name}</div>
      <div>{inr(p.value)}</div>
    </div>
  );
}

export default function SpendCharts({ byCategory = [] }) {
  const [monthly, setMonthly] = useState([]);
  const [months, setMonths] = useState(6);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getMonthly(months)
      .then((d) => {
        if (!cancelled) {
          setError("");
          setMonthly(d.months.map((m) => ({ label: monthLabel(m.month), total: Number(m.total) })));
        }
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, [months]);

  const pie = toPieData(byCategory);
  const pieTotal = pie.reduce((s, r) => s + r.value, 0);
  const hasMonthly = monthly.some((m) => m.total > 0);

  return (
    <div className="sc-root">
      {/* ---------- Monthly spend (bar) ---------- */}
      <section className="sc-card">
        <div className="sc-head">
          <h2>Monthly spend</h2>
          <select value={months} onChange={(e) => setMonths(Number(e.target.value))} aria-label="Months to show">
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
          </select>
        </div>
        {error && <p className="error">Error: {error}</p>}
        {!error && !hasMonthly ? (
          <p className="sc-empty">No spending in this period.</p>
        ) : (
          <div className="sc-chart">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--sc-grid)" />
                <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--sc-grid)" }}
                       tick={{ fill: "var(--sc-text-2)", fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={inrCompact}
                       tick={{ fill: "var(--sc-text-2)", fontSize: 12 }} />
                <Tooltip cursor={{ fill: "var(--sc-hover)" }} content={<ChartTooltip />} />
                <Bar dataKey="total" fill="var(--sc-series-1)" radius={[4, 4, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* ---------- Spend by category (donut) ---------- */}
      <section className="sc-card">
        <div className="sc-head"><h2>Spend by category</h2></div>
        {pie.length === 0 ? (
          <p className="sc-empty">No spending data yet.</p>
        ) : (
          <div className="sc-pie">
            <div className="sc-pie-chart">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pie} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="95%"
                       paddingAngle={0} stroke="var(--sc-surface)" strokeWidth={2} isAnimationActive={false}>
                    {pie.map((r, i) => (
                      <Cell key={r.name} fill={r.isOther ? "var(--sc-other)" : `var(--sc-series-${i + 1})`} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend doubles as the data table: name, amount and share on every row. */}
            <ul className="sc-legend">
              {pie.map((r, i) => (
                <li key={r.name}>
                  <span className="sc-swatch"
                        style={{ background: r.isOther ? "var(--sc-other)" : `var(--sc-series-${i + 1})` }} />
                  <span className="sc-legend-name">{r.name}</span>
                  <span className="sc-legend-val">{inr(r.value)}</span>
                  <span className="sc-legend-pct">{((r.value / pieTotal) * 100).toFixed(0)}%</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
