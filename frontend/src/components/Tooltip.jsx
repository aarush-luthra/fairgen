import { Info } from "lucide-react";

export default function Tooltip({ text }) {
  return (
    <span className="group relative inline-flex">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-400">
        <Info size={12} />
      </span>
      <span className="pointer-events-none absolute left-1/2 top-7 z-20 hidden w-64 -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs leading-5 text-slate-300 shadow-2xl group-hover:block">
        {text}
      </span>
    </span>
  );
}
