import { useState } from "react";
import geminiLogo from "../assets/gemini.webp";

export default function AIPromptBox({ onApply, onTestConnection, apiStatus, aiExplanation }) {
  const [instruction, setInstruction] = useState("");

  return (
    <section className="rounded-2xl bg-gradient-to-br from-white/70 to-blue-50/20 backdrop-blur-sm p-5 shadow-[0_4px_24px_rgba(66,133,244,0.12)]">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center">
          <img src={geminiLogo} alt="Gemini" className="w-5 h-5 inline-block mr-2" />
          Gemini Constraint Box
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Describe a fairness requirement in plain English — Gemini 1.5 Flash will translate it into a config change and regenerate.
        </p>
      </div>

      <textarea
        value={instruction}
        onChange={(event) => setInstruction(event.target.value)}
        rows={4}
        className="w-full rounded-lg border border-slate-200/60 bg-white/60 px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-1 focus:ring-slate-200"
        placeholder="What if we make sure women over 40 are not underrepresented in the high-income bracket?"
      />

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 transition shadow-lg shadow-slate-900/20"
          onClick={() => instruction.trim() && onApply(instruction)}
        >
          Apply AI Constraint
        </button>
        <button
          className="rounded-xl bg-white/50 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-white transition shadow-[0_1px_8px_rgba(0,100,100,0.14)]"
          onClick={onTestConnection}
        >
          Test API Connection
        </button>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${apiStatus.connected ? "bg-emerald-100 text-emerald-700" : "bg-red-50 text-red-600"
            }`}
        >
          {apiStatus.connected ? "Gemini Connected" : "Not connected"} {apiStatus.message}
        </span>
      </div>

      {aiExplanation ? (
        <div className="mt-4 rounded-xl border-l-4 border-blue-400 bg-white/40 p-4 shadow-[0_2px_12px_rgba(66,133,244,0.10)]">
          <p className="text-sm font-bold text-blue-700">Gemini Explanation</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">{aiExplanation}</p>
        </div>
      ) : null}
    </section>
  );
}
