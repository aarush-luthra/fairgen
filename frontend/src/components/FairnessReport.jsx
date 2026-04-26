import {
  buildExecutiveSummary,
  buildMetricComparisons,
  buildRecommendations,
  formatMetricValue,
  getFairnessStatus,
  METRIC_LABELS,
} from "../utils/reporting";

function metricTone(improved) {
  return improved ? "text-emerald-600" : "text-rose-500";
}

function statusTone(accent) {
  if (accent === "emerald") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (accent === "sky") {
    return "bg-sky-50 text-sky-700 border-sky-200";
  }
  if (accent === "amber") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  return "bg-rose-50 text-rose-700 border-rose-200";
}

function Card({ title, children, className = "" }) {
  return (
    <section className={`rounded-[1.75rem] border border-white/70 bg-white/75 p-5 shadow-[0_10px_40px_rgba(15,23,42,0.08)] ${className}`}>
      <h3 className="text-2xl font-bold text-slate-950">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function FairnessReport({ metrics, beforeMetrics, geminiNarrative }) {
  const score = Number(metrics?.OFS ?? 0);
  const status = getFairnessStatus(score);
  const summary = buildExecutiveSummary({ metrics, beforeMetrics });
  const recommendations = buildRecommendations({ metrics });
  const comparisons = buildMetricComparisons(beforeMetrics, metrics);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/80 bg-[linear-gradient(140deg,rgba(255,255,255,0.94),rgba(241,245,249,0.92),rgba(236,253,245,0.72))] p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400">Fairness compliance report</p>
            <h2 className="mt-3 text-4xl font-bold text-slate-950">Fairness Summary</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">{summary}</p>
          </div>
          <div className="min-w-[260px] rounded-[1.5rem] bg-slate-950 p-6 text-white">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400">Overall fairness score</p>
            <div className="mt-3 text-6xl font-bold">{Math.round(score)}/100</div>
            <div className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusTone(status.accent)}`}>{status.label}</div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card title="Key Metrics">
          <div className="space-y-3">
            {comparisons.map((item) => (
              <div key={item.key} className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{METRIC_LABELS[item.key]}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">{item.key}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">
                      {formatMetricValue(item.key, item.before)} → <span className="font-bold text-slate-900">{formatMetricValue(item.key, item.after)}</span>
                    </p>
                    <p className={`mt-1 text-sm font-semibold ${metricTone(item.improved)}`}>
                      {item.delta >= 0 ? "+" : ""}
                      {item.delta.toFixed(3)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Recommendations">
          <div className="space-y-3">
            {recommendations.map((item, index) => (
              <div key={item} className="rounded-2xl bg-slate-50 px-4 py-4">
                <p className="text-sm font-semibold text-slate-900">Recommendation {index + 1}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {geminiNarrative ? (
        <Card title="Narrative Analysis" className="bg-white/80">
          <div className="space-y-3">
            {geminiNarrative.split(/\n\n+/).map((paragraph, index) => (
              <p key={index} className="text-sm leading-7 text-slate-600">
                {paragraph}
              </p>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
