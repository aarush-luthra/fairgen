import { useState } from "react";

export default function AIPromptBox({ onApply, onTestConnection, apiStatus, aiExplanation }) {
  const [instruction, setInstruction] = useState("");

  return (
    <section className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-slate-900 p-5 shadow-2xl shadow-slate-950/20">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-100">AI Constraint Box</h2>
        <p className="mt-1 text-sm text-slate-300">
          Describe a fairness requirement in plain English and de.bias will translate it into a config change.
        </p>
      </div>

      <textarea
        value={instruction}
        onChange={(event) => setInstruction(event.target.value)}
        rows={5}
        className="w-full rounded-2xl border border-violet-400/20 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-500"
        placeholder="What if we make sure women over 40 are not underrepresented in the high-income bracket?"
      />

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          className="rounded-2xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-400"
          onClick={() => instruction.trim() && onApply(instruction)}
        >
          Apply AI Constraint
        </button>
        <button
          className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-200 hover:bg-slate-800"
          onClick={onTestConnection}
        >
          Test API Connection
        </button>
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${
            apiStatus.connected ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-rose-500/30 bg-rose-500/10 text-rose-200"
          }`}
        >
          {apiStatus.connected ? "Connected ✓" : "Connection failed ✗"} {apiStatus.message}
        </span>
      </div>

      {aiExplanation ? (
        <div className="mt-4 rounded-2xl border border-violet-500/20 bg-slate-950/60 p-4">
          <p className="text-sm font-medium text-violet-200">AI Explanation</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">{aiExplanation}</p>
        </div>
      ) : null}
    </section>
  );
}
