import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function ScoreHero({ score, scoreTone, onOpenReport }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="grid w-full gap-4 rounded-[2.5rem] border border-white/70 bg-[linear-gradient(140deg,rgba(255,255,255,0.92),rgba(240,253,250,0.75),rgba(239,246,255,0.8))] p-8 text-left shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl transition hover:shadow-[0_22px_70px_rgba(15,23,42,0.1)]"
      onClick={onOpenReport}
    >
      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-700/70">Fairness Integrity Score</p>
          <div className="mt-4 flex flex-wrap items-end gap-6">
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.2 }}
              className="font-display text-7xl font-bold tracking-tighter text-gray-900 sm:text-8xl"
            >
              {score}
            </motion.div>
            <div className={`mb-4 rounded-full border px-4 py-1.5 text-sm font-bold uppercase tracking-wider ${scoreTone.chipClassName}`}>
              {scoreTone.label}
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-gray-600">
            {scoreTone.message}
          </p>
        </div>

        <div className="rounded-[1.75rem] border border-white/80 bg-white/72 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <div className="mb-3 flex items-center justify-between gap-4 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-900/40">
            <span>Progress toward 100</span>
            <span className="shrink-0">{Math.min(score, 100)}%</span>
          </div>
          <div className="h-4 overflow-hidden rounded-full bg-emerald-100/50 p-1">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(score, 100)}%` }}
              transition={{ duration: 1.5, ease: "circOut", delay: 0.5 }}
              className={`h-full rounded-full bg-gradient-to-r ${scoreTone.accentClassName}`} 
            />
          </div>
          <div className="mt-6 inline-flex items-center gap-3 text-sm font-bold text-emerald-700">
            Full Fairness Audit
            <ArrowRight size={18} />
          </div>
        </div>
      </div>
    </motion.button>
  );
}
