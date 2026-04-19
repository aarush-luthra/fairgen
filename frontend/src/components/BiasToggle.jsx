import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import Tooltip from "./Tooltip";

export default function BiasToggle({
  title,
  description,
  tooltip,
  children,
  defaultOpen = false,
  enabled = true,
  onEnabledChange,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/50">
      <button
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
        onClick={() => setOpen((value) => !value)}
      >
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-slate-100">{title}</p>
            {tooltip ? <Tooltip text={tooltip} /> : null}
          </div>
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          {onEnabledChange ? (
            <span
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                enabled ? "bg-emerald-500/90" : "bg-slate-700"
              }`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onEnabledChange(!enabled);
              }}
              role="switch"
              aria-checked={enabled}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  onEnabledChange(!enabled);
                }
              }}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${enabled ? "translate-x-5" : "translate-x-1"}`}
              />
            </span>
          ) : null}
          <span className="text-slate-400">{open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</span>
        </div>
      </button>

      {open ? <div className="border-t border-slate-800 px-4 py-4">{children}</div> : null}
    </div>
  );
}
