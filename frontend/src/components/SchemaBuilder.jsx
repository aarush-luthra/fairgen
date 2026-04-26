import { useMemo, useState, useEffect, useRef } from "react";
import { GripVertical, Plus, Sparkles, Trash2, ChevronDown } from "lucide-react";
import { SCHEMA_CATEGORY_ORDER, SCHEMA_PRESETS, buildSchemaColumn } from "../constants";
import geminiLogo from "../assets/gemini.webp";

const CARD = "rounded-3xl bg-gradient-to-br from-white/70 to-emerald-50/40 backdrop-blur-sm border border-white/60 shadow-[0_2px_8px_rgba(0,100,100,0.08),0_8px_24px_rgba(0,100,100,0.12)]";
const INPUT = "w-full rounded-lg border border-slate-200/60 bg-white/60 px-2.5 py-1.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-1 focus:ring-slate-200 transition";
const LABEL = "mb-1 block text-[11px] uppercase tracking-wider text-slate-500 font-bold";

const QUICK_START_PRESETS = [
  { name: "Minimal", columnCount: 5, columns: ["gender", "race", "annual_income", "credit_score", "loan_approved"] },
  { name: "Standard", columnCount: 11, columns: ["age", "gender", "race", "zip_code_tier", "annual_income", "employment_status", "credit_score", "loan_amount", "debt_to_income", "marital_status", "loan_approved"] },
  { name: "Full", columnCount: 18, columns: Object.keys(SCHEMA_PRESETS) }
];

function TypeBadge({ type }) {
  return <span className="rounded-md border border-slate-300/60 bg-white/50 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">{type}</span>;
}

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function formatColumnName(name) {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function AIPromptBox({ onSuggest, loading, onAddAllSuggestions, suggestions, onDismissSuggestions, onAddSuggestion }) {
  const [description, setDescription] = useState("");
  const textareaRef = useRef(null);

  const handleTextChange = (e) => {
    setDescription(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  };

  return (
    <section className={CARD + " p-6"}>
      <div className="flex items-start gap-3 mb-4">
        <img src={geminiLogo} alt="Gemini" className="w-5 h-5 shrink-0 mt-1" />
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-800">Describe your lending scenario</h2>
          <p className="mt-0.5 text-sm text-slate-500">Gemini 1.5 Flash will suggest fairness-relevant columns instantly</p>
        </div>
      </div>

      <textarea
        ref={textareaRef}
        value={description}
        onChange={handleTextChange}
        placeholder="e.g. A model to predict mortgage defaults for first-time homebuyers..."
        className="w-full rounded-lg border border-slate-200/60 bg-white/60 px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-1 focus:ring-slate-200 transition resize-none overflow-hidden min-h-[60px]"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => onSuggest(description)}
          disabled={!description.trim() || loading}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? "Suggesting..." : "Suggest"}
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="mt-4 rounded-lg border border-emerald-200/60 bg-emerald-50/40 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-3">
            ✓ Suggested columns have been highlighted below
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onAddAllSuggestions}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
            >
              Add All Suggestions
            </button>
            <button
              onClick={onDismissSuggestions}
              className="rounded-md border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-white/50 transition"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function ColumnPicker({ schema, onToggle, onQuickStart, searchQuery, onSearchChange, selectedCategory, onCategoryChange, suggestions }) {
  const selectedNames = new Set(schema.map((column) => column.name));
  const suggestionNames = new Set(suggestions.map((s) => s.name));

  const filteredColumns = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let entries = Object.entries(SCHEMA_PRESETS);

    // Filter by category
    if (selectedCategory !== "All") {
      entries = entries.filter(([, preset]) => preset.category === selectedCategory);
    }

    // Filter by search query
    if (query) {
      entries = entries.filter(([, preset]) => preset.label.toLowerCase().includes(query));
    }

    return entries;
  }, [searchQuery, selectedCategory]);

  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-5">
      {/* Quick Start Section */}
      <div className={CARD + " p-6 flex-shrink-0"}>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Quick Start</p>
        <div className="flex flex-wrap gap-2.5">
          {QUICK_START_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => onQuickStart(preset.columns)}
              className="rounded-lg border border-slate-300/40 bg-white/70 px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-white hover:shadow-sm transition"
            >
              {preset.name}
              <span className="ml-1 text-slate-400">·{preset.columnCount}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className={CARD + " p-6 flex-shrink-0"}>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Filter by Category</p>
        <div className="flex flex-wrap gap-2.5">
          {["All", ...SCHEMA_CATEGORY_ORDER].map((category) => (
            <button
              key={category}
              onClick={() => onCategoryChange(category)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${selectedCategory === category
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                : "bg-white/60 border border-slate-200/50 text-slate-700 hover:bg-white/80 hover:border-slate-300/60"
                }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Column List */}
      <div className={CARD + " p-6 flex-1 flex flex-col min-h-0"}>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Columns</p>
        <div className="mb-4">
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search columns..."
            className={INPUT}
          />
        </div>

        <div className="flex-1 pr-2 pb-4" style={{ overflowY: "auto", overflowX: "visible" }}>
          <div className="space-y-1 scrollbar-minimal">
            {filteredColumns.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No columns match your search.</p>
            ) : (
              filteredColumns.map(([name, preset]) => {
                const isSuggested = suggestionNames.has(name);
                const isSelected = selectedNames.has(name);
                return (
                  <label
                    key={name}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 transition text-sm border ${isSelected
                      ? "bg-teal-50/60 border-teal-200/40 shadow-sm shadow-teal-100/30"
                      : isSuggested
                        ? "bg-emerald-50/40 border-emerald-200/30 hover:bg-emerald-50/60 hover:border-emerald-200/40"
                        : "border-slate-200/20 hover:bg-white/50 hover:border-slate-200/40"
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={preset.locked}
                      onChange={() => onToggle(name)}
                      className="accent-emerald-600 shrink-0 w-4 h-4"
                    />
                    <span
                      className={`font-semibold truncate flex-1 ${isSelected ? "text-slate-900" : isSuggested ? "text-emerald-700" : "text-slate-700"
                        }`}
                    >
                      {formatColumnName(name)}
                    </span>
                    {isSuggested && <span className="text-[10px] font-bold text-emerald-600">✓ suggested</span>}
                    <TypeBadge type={preset.type} />
                    {preset.fairness_sensitive && (
                      <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-white">Fair</span>
                    )}
                    {preset.locked && (
                      <span className="rounded-md bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                        Required
                      </span>
                    )}
                  </label>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SchemaColumnCard({ column, onChange, onRemove, locked, index, onDragStart, onDragOver, onDrop }) {
  const [open, setOpen] = useState(false);
  const categorical = column.type === "categorical";
  const numerical = column.type === "numerical";
  const boolean = column.type === "boolean";

  const options = column.config.options || [];
  const weights = column.config.weights || [];

  function updateConfig(partial) {
    onChange({
      ...column,
      config: {
        ...column.config,
        ...partial,
      },
    });
  }

  return (
    <article
      className={`rounded-xl transition-all ${open ? 'bg-teal-50/30 shadow-[0_2px_16px_rgba(0,100,100,0.22)]' : 'bg-white/30 hover:bg-white/50 shadow-[0_1px_8px_rgba(0,100,100,0.14)]'}`}
      draggable={!locked}
      onDragStart={() => onDragStart(index)}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver(index);
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(index);
      }}
    >
      <div
        className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer select-none"
        onClick={() => setOpen((v) => !v)}
      >
        <button className="text-slate-300 shrink-0 hover:text-slate-500 transition" disabled={locked} onClick={(e) => e.stopPropagation()}>
          <GripVertical size={14} />
        </button>
        <span className="font-bold text-sm text-slate-800 truncate">{formatColumnName(column.name)}</span>
        <TypeBadge type={column.type} />
        {column.fairness_sensitive && (
          <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-white">Fairness</span>
        )}
        {locked && <span className="rounded-md bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">Locked</span>}
        <div className="flex-1" />
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        {!locked && (
          <button className="rounded-md p-1 text-slate-300 hover:bg-red-50 hover:text-red-400 transition" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {open && (
        <div className="border-t border-slate-200/60 px-3 py-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_auto] gap-3 sm:gap-2 sm:items-end">
            <label className="block">
              <span className={LABEL}>Name</span>
              <input value={column.name} disabled={locked} onChange={(e) => onChange({ ...column, name: e.target.value.replace(/\s+/g, "_") })} className={INPUT} />
            </label>
            <label className="block">
              <span className={LABEL}>Type</span>
              <select value={column.type} disabled={locked} onChange={(e) => onChange({ ...column, type: e.target.value })} className={INPUT}>
                <option value="numerical">numerical</option>
                <option value="categorical">categorical</option>
                <option value="boolean">boolean</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white/60 px-2.5 py-1.5 text-[11px] text-slate-600 cursor-pointer whitespace-nowrap font-semibold">
              <input type="checkbox" checked={column.fairness_sensitive} onChange={(e) => onChange({ ...column, fairness_sensitive: e.target.checked })} className="accent-emerald-600 w-3.5 h-3.5" />
              Fairness
            </label>
          </div>

          {numerical && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-2 items-end">
              <label className="block"><span className={LABEL}>Min</span><input type="number" value={column.config.min ?? ""} onChange={(e) => updateConfig({ min: Number(e.target.value) })} className={INPUT} /></label>
              <label className="block"><span className={LABEL}>Max</span><input type="number" value={column.config.max ?? ""} onChange={(e) => updateConfig({ max: Number(e.target.value) })} className={INPUT} /></label>
              <label className="block"><span className={LABEL}>Dist.</span>
                <select value={column.config.distribution || "uniform"} onChange={(e) => updateConfig({ distribution: e.target.value })} className={INPUT}>
                  <option value="normal">normal</option><option value="log-normal">log-normal</option><option value="uniform">uniform</option>
                </select>
              </label>
              <label className="flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white/60 px-2.5 py-1.5 text-[11px] text-slate-600 cursor-pointer font-semibold">
                <input type="checkbox" checked={Boolean(column.config.nullable)} onChange={(e) => updateConfig({ nullable: e.target.checked })} className="accent-emerald-600 w-3.5 h-3.5" />
                Nullable
              </label>
            </div>
          )}

          {categorical && (
            <div className="space-y-1.5">
              <div className="grid grid-cols-[1fr_80px_auto] gap-1.5 text-[11px] uppercase tracking-wider text-slate-400 font-bold px-1">
                <span>Label</span><span>Weight</span><span></span>
              </div>
              {options.map((option, oi) => (
                <div key={`${column.name}-${oi}`} className="grid grid-cols-[1fr_80px_auto] gap-1.5">
                  <input value={option} onChange={(e) => { const next = [...options]; next[oi] = e.target.value; updateConfig({ options: next }); }} className={INPUT} />
                  <input type="number" step="0.01" value={weights[oi] ?? ""} onChange={(e) => { const next = [...weights]; next[oi] = Number(e.target.value); updateConfig({ weights: next }); }} className={INPUT} />
                  <button className="rounded-md px-2 py-1.5 text-xs text-slate-400 hover:bg-red-50 hover:text-red-400 transition font-bold" onClick={() => { updateConfig({ options: options.filter((_, i) => i !== oi), weights: weights.filter((_, i) => i !== oi) }); }}>x</button>
                </div>
              ))}
              <button className="rounded-md border border-slate-200/80 bg-white/50 px-2.5 py-1 text-xs font-semibold text-slate-500 hover:bg-white transition" onClick={() => updateConfig({ options: [...options, `option_${options.length + 1}`], weights: [...weights, 1] })}>+ Add option</button>
            </div>
          )}

          {boolean && column.name !== "loan_approved" && (
            <label className="block">
              <span className={LABEL}>Base rate</span>
              <input type="number" min="0" max="1" step="0.01" value={column.config.base_rate ?? 0.5} onChange={(e) => updateConfig({ base_rate: Number(e.target.value) })} className={INPUT + " max-w-[140px]"} />
            </label>
          )}
        </div>
      )}
    </article>
  );
}

export default function SchemaBuilder({
  schema, suggestions, suggestionLoading, validationError, agePromptPending,
  onTogglePreset, onUpdateColumn, onRemoveColumn, onReorder, onSuggest,
  onAddSuggestion, onAddAllSuggestions, onDismissSuggestions, onProceed,
  onEnableAgeMonitoring, onSkipAgeMonitoring,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [dragIndex, setDragIndex] = useState(null);

  // Handle quick start preset selection
  const handleQuickStart = (columnNames) => {
    const selectedNames = new Set(schema.map((col) => col.name));
    // Remove columns not in preset
    schema.forEach((col, idx) => {
      if (!columnNames.includes(col.name) && col.name !== "loan_approved") {
        onRemoveColumn(idx);
      }
    });
    // Add missing columns from preset
    columnNames.forEach((name) => {
      if (!selectedNames.has(name) && SCHEMA_PRESETS[name]) {
        onTogglePreset(name);
      }
    });
  };

  return (
    <section className="space-y-6">
      {/* Intro */}
      <div className={CARD + " p-6"}>
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-emerald-600">Schema Builder</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-800">Build your dataset schema first</h2>
        <p className="mt-1.5 max-w-3xl text-sm text-slate-500">
          Choose the columns you want, tune each field's behavior, and lock in the protected attributes de.bias should monitor for bias.
        </p>
      </div>

      {/* Top: Prominent AI Prompt Box */}
      <AIPromptBox
        onSuggest={onSuggest}
        loading={suggestionLoading}
        suggestions={suggestions}
        onAddAllSuggestions={onAddAllSuggestions}
        onDismissSuggestions={onDismissSuggestions}
        onAddSuggestion={onAddSuggestion}
      />

      {/* Middle: Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Column Picker */}
        <div className="flex flex-col min-h-[850px] max-h-[850px] overflow-y-auto scrollbar-minimal space-y-4">
          <ColumnPicker
            schema={schema}
            onToggle={onTogglePreset}
            onQuickStart={handleQuickStart}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            suggestions={suggestions}
          />
        </div>

        {/* Right: Your Schema Panel */}
        <div className={CARD + " p-5 flex flex-col min-h-[850px] max-h-[850px] overflow-hidden"}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">Your Schema</h3>
              <p className="mt-0.5 text-xs text-slate-500">Click to expand. Drag to reorder.</p>
            </div>
            <span className="rounded-md border border-slate-200/60 bg-white/50 px-3 py-1 text-xs font-bold text-slate-500">
              {schema.length} columns
            </span>
          </div>

          <div className="space-y-1.5 flex-1 overflow-y-auto scrollbar-minimal pr-0.5">
            {schema.map((column, index) => (
              <SchemaColumnCard
                key={`${column.name}-${index}`}
                column={cloneValue(column)}
                locked={column.name === "loan_approved"}
                index={index}
                onChange={(nextColumn) => onUpdateColumn(index, nextColumn)}
                onRemove={() => onRemoveColumn(index)}
                onDragStart={setDragIndex}
                onDragOver={() => { }}
                onDrop={(dropIndex) => {
                  if (dragIndex === null || dragIndex === dropIndex) return;
                  onReorder(dragIndex, dropIndex);
                  setDragIndex(null);
                }}
              />
            ))}
          </div>

          <div className="mt-3 space-y-3">
            {validationError && (
              <p className="rounded-lg border border-red-200 bg-red-50/50 px-4 py-2.5 text-sm font-medium text-red-600">
                {validationError}
              </p>
            )}

            {agePromptPending && (
              <div className="rounded-lg border border-slate-200/60 bg-white/40 p-3">
                <p className="text-sm font-bold text-slate-700">Want to monitor age as a protected attribute?</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition"
                    onClick={onEnableAgeMonitoring}
                  >
                    Yes
                  </button>
                  <button
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-white/60 transition"
                    onClick={onSkipAgeMonitoring}
                  >
                    No thanks
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={onProceed}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 transition active:scale-[0.98] shadow-lg shadow-slate-900/20"
            >
              Build My Dataset
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
