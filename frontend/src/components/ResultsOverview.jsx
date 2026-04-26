import { ArrowRight, Download, FileText, Sparkles } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  buildExecutiveSummary,
  buildMetricChartData,
  buildMetricComparisons,
  buildProtectedGroupComparisons,
  buildRecommendations,
  formatMetricValue,
  getDatasetPreviewRows,
  getFairnessStatus,
} from "../utils/reporting";

function toneClasses(accent) {
  if (accent === "emerald") {
    return {
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
      icon: "bg-emerald-100 text-emerald-700",
    };
  }
  if (accent === "sky") {
    return {
      badge: "border-sky-200 bg-sky-50 text-sky-700",
      icon: "bg-sky-100 text-sky-700",
    };
  }
  if (accent === "amber") {
    return {
      badge: "border-amber-200 bg-amber-50 text-amber-700",
      icon: "bg-amber-100 text-amber-700",
    };
  }
  return {
    badge: "border-rose-200 bg-rose-50 text-rose-700",
    icon: "bg-rose-100 text-rose-700",
  };
}

function PreviewTable({ rows }) {
  if (!rows.length) {
    return <p className="text-sm text-slate-500">Generate a dataset to see the preview sample here.</p>;
  }

  const columns = Object.keys(rows[0]).slice(0, 6);

  return (
    <div className="overflow-auto rounded-2xl border border-slate-200/70 bg-white/80">
      <table className="min-w-full divide-y divide-slate-200/70 text-sm">
        <thead className="bg-slate-50/80">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                {column.replaceAll("_", " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={index} className="text-slate-700">
              {columns.map((column) => (
                <td key={`${index}-${column}`} className="px-4 py-3">
                  {String(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OverviewCard({ title, subtitle, children, className = "" }) {
  return (
    <section className={`rounded-[1.75rem] border border-white/70 bg-white/75 p-5 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default function ResultsOverview({ result, onOpenTab, onDownloadPdf }) {
  if (!result) {
    return (
      <section className="rounded-[2rem] border border-dashed border-slate-300/80 bg-white/70 p-10 text-center shadow-[0_10px_40px_rgba(15,23,42,0.06)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <Sparkles size={28} />
        </div>
        <h2 className="mt-5 text-2xl font-bold text-slate-900">Generate a dataset to unlock the fairness workspace</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-500">
          Once generation completes, this area will show the preview dataset, baseline-versus-mitigated metrics, fairness recommendations, and a PDF-ready compliance summary.
        </p>
      </section>
    );
  }

  const score = Number(result?.metrics?.OFS ?? 0);
  const summary = buildExecutiveSummary(result);
  const recommendations = buildRecommendations(result);
  const status = getFairnessStatus(score);
  const metricChartData = buildMetricChartData(result?.beforeMetrics, result?.metrics);
  const comparisons = buildMetricComparisons(result?.beforeMetrics, result?.metrics);
  const protectedComparisons = buildProtectedGroupComparisons(result?.charts);
  const previewRows = getDatasetPreviewRows(result?.dataset || [], 6);
  const tones = toneClasses(status.accent);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(236,253,245,0.72),rgba(239,246,255,0.82))] p-6 shadow-[0_16px_60px_rgba(15,23,42,0.08)]">
        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              <Sparkles size={14} />
              Generated Fairness Report
            </div>
            <h2 className="mt-4 text-3xl font-bold text-slate-950">Mitigated dataset ready for review</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{summary}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                onClick={onDownloadPdf}
              >
                <Download size={16} />
                Download PDF report
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_6px_18px_rgba(15,23,42,0.08)] transition hover:bg-slate-50"
                onClick={() => onOpenTab("table")}
              >
                <FileText size={16} />
                Open dataset preview
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_6px_18px_rgba(15,23,42,0.08)] transition hover:bg-slate-50"
                onClick={() => onOpenTab("report")}
              >
                Open full fairness summary
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/80 bg-slate-950 p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.16)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400">Overall fairness score</p>
            <div className="mt-3 text-6xl font-bold">{Math.round(score)}/100</div>
            <div className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${tones.badge}`}>{status.label}</div>
            <div className="mt-6 grid gap-3">
              {comparisons.map((item) => (
                <div key={item.key} className="rounded-2xl bg-white/5 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-white">{item.key}</span>
                    <span className={`text-sm font-semibold ${item.improved ? "text-emerald-300" : "text-rose-300"}`}>
                      {formatMetricValue(item.key, item.before)} → {formatMetricValue(item.key, item.after)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <OverviewCard
          title="Baseline vs mitigated metrics"
          subtitle="The mitigated dataset should push DPD down while lifting DIR, LCS, and REI."
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metricChartData} barGap={12}>
                <CartesianGrid stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 12 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255,255,255,0.98)",
                    border: "1px solid #e2e8f0",
                    borderRadius: "16px",
                    boxShadow: "0 16px 50px rgba(15,23,42,0.12)",
                    color: "#0f172a",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="baseline" fill="#f87171" radius={[10, 10, 0, 0]} />
                <Bar dataKey="mitigated" fill="#22c55e" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </OverviewCard>

        <OverviewCard title="Key recommendations" subtitle="Suggested follow-up actions based on the current fairness profile.">
          <div className="space-y-3">
            {recommendations.map((item, index) => (
              <div key={item} className="flex gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${tones.icon}`}>
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-slate-600">{item}</p>
              </div>
            ))}
          </div>
        </OverviewCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <OverviewCard
          title="Dataset preview"
          subtitle="A quick sample from the mitigated output so the user can review values immediately after generation."
        >
          <PreviewTable rows={previewRows} />
        </OverviewCard>

        <OverviewCard
          title="Protected-group approval comparison"
          subtitle="A quick view of how opportunity rates moved between the biased baseline and the mitigated output."
        >
          <div className="space-y-4">
            {protectedComparisons.slice(0, 2).map((comparison) => (
              <div key={comparison.column} className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4">
                <p className="text-sm font-semibold capitalize text-slate-900">{comparison.column.replaceAll("_", " ")}</p>
                <div className="mt-3 space-y-3">
                  {comparison.groups.map((group) => (
                    <div key={group.name}>
                      <div className="mb-1 flex items-center justify-between gap-3 text-xs font-medium text-slate-500">
                        <span>{group.name}</span>
                        <span>
                          {Math.round(group.baseline * 100)}% → {Math.round(group.mitigated * 100)}%
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-rose-100">
                          <div className="h-full rounded-full bg-rose-400" style={{ width: `${Math.max(4, group.baseline * 100)}%` }} />
                        </div>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-emerald-100">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(4, group.mitigated * 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {!protectedComparisons.length ? (
              <p className="text-sm text-slate-500">Mark demographic columns as fairness-sensitive to unlock protected-group comparisons.</p>
            ) : null}
          </div>
        </OverviewCard>
      </div>
    </div>
  );
}
