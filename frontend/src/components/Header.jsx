import { Check, CircleHelp, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function Header({ 
  score, 
  scoreTone, 
  result, 
  loading, 
  step, 
  generateButtonLabel, 
  showGenerateSuccess, 
  onShowHelp, 
  onLoadDemo, 
  onGenerate,
  onSetActiveTab
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/50 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0">
            <motion.p 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xs font-bold uppercase tracking-[0.4em] text-blue-600"
            >
              de.bias
            </motion.p>
            <p className="mt-0.5 truncate text-[11px] font-medium text-gray-500 uppercase tracking-wider">
              Schema Builder → Configuration → Generate → Report
            </p>
          </div>
          {result ? (
            <motion.button
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.05 }}
              className={`hidden rounded-full border px-3 py-1 text-xs font-semibold md:inline-flex ${scoreTone.chipClassName}`}
              onClick={() => onSetActiveTab("report")}
            >
              Score {score}
            </motion.button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <button
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-95"
            onClick={onShowHelp}
          >
            <CircleHelp size={14} />
            How it works
          </button>
          <button
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-95"
            onClick={onLoadDemo}
          >
            Load Demo
          </button>
          {step === "config" ? (
            <motion.button
              layoutId="generate-btn"
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
              onClick={onGenerate}
              disabled={loading}
            >
              {showGenerateSuccess ? <Check size={14} /> : <Sparkles size={14} />}
              {generateButtonLabel}
            </motion.button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
