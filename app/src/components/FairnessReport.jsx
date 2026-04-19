import Tooltip from "./Tooltip";
import { TOOLTIP_COPY } from "../constants";

function scoreTone(score) {
  if (score >= 80) {
    return "text-emerald-300";
  }
  if (score >= 60) {
    return "text-amber-200";
  }
  return "text-rose-200";
}

export default function FairnessReport({ metrics, fairnessReport, beforeMetrics }) {
  const cards = fairnessReport?.metricCards || [];
  const metricTooltips = {
    DPD: TOOLTIP_COPY.dpd,
    DIR: TOOLTIP_COPY.dir,
    LCS: TOOLTIP_COPY.lcs,
    REI: TOOLTIP_COPY.rei,
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 p-6">
        <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Overall Fairness Score</p>
        <div className={`mt-3 text-5xl font-semibold ${scoreTone(metrics?.OFS ?? 0)}`}>{metrics?.OFS ?? 0} / 100</div>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          This score blends approval parity, disparate impact, borderline label consistency, and representation equity into one north-star fairness metric.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.key} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="flex items-center gap-2">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{card.key}</p>
              <Tooltip text={metricTooltips[card.key]} />
            </div>
            <p className="mt-2 text-3xl font-semibold text-slate-100">{card.value}</p>
            <p className="mt-2 text-sm capitalize text-slate-300">{card.status}</p>
            <p className="mt-3 text-sm leading-6 text-slate-400">{card.description}</p>
          </article>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
        <h3 className="text-base font-semibold text-slate-100">Before vs After Snapshot</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm font-medium text-slate-200">Before mitigation</p>
            <pre className="mt-3 overflow-x-auto text-xs leading-6 text-slate-400">{JSON.stringify(beforeMetrics || {}, null, 2)}</pre>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm font-medium text-slate-200">After mitigation</p>
            <pre className="mt-3 overflow-x-auto text-xs leading-6 text-slate-400">{JSON.stringify(metrics || {}, null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
