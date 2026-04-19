import Tooltip from "./Tooltip";
import { TOOLTIP_COPY } from "../constants";

function scoreTone(score) {
  if (score >= 80) {
    return "text-emerald-600";
  }
  if (score >= 60) {
    return "text-amber-600";
  }
  return "text-rose-600";
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
      <div className="rounded-2xl bg-gradient-to-br from-white/70 to-emerald-50/40 backdrop-blur-sm p-5 shadow-[0_4px_24px_rgba(0,100,100,0.22)]">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400">Overall Fairness Score</p>
        <div className={`mt-2 text-5xl font-bold ${scoreTone(metrics?.OFS ?? 0)}`}>{metrics?.OFS ?? 0} / 100</div>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          This score blends approval parity, disparate impact, borderline label consistency, and representation equity into one north-star fairness metric.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.key} className="rounded-xl bg-white/40 p-4 shadow-[0_2px_12px_rgba(0,100,100,0.14)]">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{card.key}</p>
              <Tooltip text={metricTooltips[card.key]} />
            </div>
            <p className="mt-1.5 text-2xl font-bold text-slate-800">{card.value}</p>
            <p className="mt-1 text-sm font-semibold capitalize text-slate-600">{card.status}</p>
            <p className="mt-2 text-xs leading-5 text-slate-400">{card.description}</p>
          </article>
        ))}
      </div>

      <div className="rounded-xl bg-white/40 p-4 shadow-[0_2px_12px_rgba(0,100,100,0.14)]">
        <h3 className="text-sm font-bold text-slate-800">Before vs After Snapshot</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg bg-white/50 p-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Before mitigation</p>
            <pre className="mt-2 overflow-x-auto text-xs leading-5 text-slate-600 scrollbar-minimal">{JSON.stringify(beforeMetrics || {}, null, 2)}</pre>
          </div>
          <div className="rounded-lg bg-white/50 p-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">After mitigation</p>
            <pre className="mt-2 overflow-x-auto text-xs leading-5 text-slate-600 scrollbar-minimal">{JSON.stringify(metrics || {}, null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
