import { useMemo, useState } from "react";
import { GripVertical, Plus, Sparkles, Trash2, ChevronDown } from "lucide-react";
import { SCHEMA_CATEGORY_ORDER, SCHEMA_PRESETS, buildSchemaColumn } from "../constants";

function TypeBadge({ type }) {
  return <span className="rounded-md bg-slate-100 border border-slate-300 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">{type}</span>;
}

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function PresetPicker({ schema, onToggle, searchQuery, onSearchChange }) {
  const selectedNames = new Set(schema.map((column) => column.name));

  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return SCHEMA_CATEGORY_ORDER.map((category) => {
      const entries = Object.entries(SCHEMA_PRESETS).filter(([, preset]) => {
        if (preset.category !== category) {
          return false;
        }
        if (!query) {
          return true;
        }
        return preset.label.toLowerCase().includes(query);
      });
      return { category, entries };
    }).filter((section) => section.entries.length > 0);
  }, [searchQuery]);

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-bold text-slate-900">Preset Columns</h2>
        <p className="mt-0.5 text-xs text-slate-500">Toggle columns to add them to your schema.</p>
      </div>

      <input
        value={searchQuery}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search columns..."
        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition"
      />

      <div className="max-h-[45vh] overflow-y-auto scrollbar-minimal space-y-3">
        {filteredCategories.map(({ category, entries }) => (
          <section key={category}>
            <h3 className="sticky top-0 z-10 bg-slate-50 text-[11px] font-bold uppercase tracking-widest text-slate-400 py-1.5 px-1 mb-0.5">{category}</h3>
            <div className="space-y-px">
              {entries.map(([name, preset]) => (
                <label
                  key={name}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 transition text-sm ${
                    selectedNames.has(name) ? "bg-slate-200/60" : "hover:bg-slate-100/60"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedNames.has(name)}
                    disabled={preset.locked}
                    onChange={() => onToggle(name)}
                    className="accent-slate-800 shrink-0 w-4 h-4"
                  />
                  <span className="font-semibold truncate text-slate-800">{preset.label}</span>
                  <TypeBadge type={preset.type} />
                  {preset.fairness_sensitive && (
                    <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-white">Fair</span>
                  )}
                  {preset.locked && (
                    <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">Required</span>
                  )}
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function SuggestionPanel({ onSuggest, loading, suggestions, onAddSuggestion, onAddAllSuggestions, onDismissSuggestions }) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <button className="flex w-full items-center justify-between text-left" onClick={() => setOpen((value) => !value)}>
        <div>
          <p className="text-sm font-bold text-slate-800">🤖 Ask AI to suggest columns</p>
          <p className="mt-0.5 text-xs text-slate-500">GPT-4o mini for fairness-oriented schema ideas.</p>
        </div>
        <span className="text-xs font-bold text-slate-600 bg-slate-200 px-2 py-1 rounded-md">{open ? "Hide" : "Open"}</span>
      </button>

      {open ? (
        <div className="mt-4 space-y-3">
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            placeholder="Describe what you're building... e.g. A model to predict mortgage defaults"
          />
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition"
            disabled={!description.trim() || loading}
            onClick={() => onSuggest(description)}
          >
            <Sparkles size={14} />
            {loading ? "Suggesting..." : "Suggest Columns"}
          </button>

          {suggestions.length ? (
            <div className="space-y-2">
              {suggestions.map((suggestion) => (
                <div key={suggestion.name} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-sm text-slate-800">{suggestion.name}</p>
                    <TypeBadge type={suggestion.type} />
                    {suggestion.fairness_sensitive ? (
                      <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-white">Fair</span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-slate-500">{suggestion.reason}</p>
                  <button
                    className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                    onClick={() => onAddSuggestion(suggestion)}
                  >
                    <Plus size={12} />
                    Add
                  </button>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <button className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition" onClick={onAddAllSuggestions}>
                  Add All
                </button>
                <button className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition" onClick={onDismissSuggestions}>
                  Dismiss
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
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
      className={`rounded-lg border transition-all ${open ? 'border-slate-400 bg-slate-50 shadow-sm' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'}`}
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
      {/* Compact Header Row */}
      <div 
        className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer select-none"
        onClick={() => setOpen((v) => !v)}
      >
        <button className="text-slate-400 shrink-0 hover:text-slate-600 transition" disabled={locked} onClick={(e) => e.stopPropagation()}>
          <GripVertical size={14} />
        </button>
        <span className="font-bold text-sm text-slate-800 truncate">{column.name}</span>
        <TypeBadge type={column.type} />
        {column.fairness_sensitive && (
          <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-white">Fairness</span>
        )}
        {locked && <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">Locked</span>}
        <div className="flex-1" />
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        {!locked && (
          <button className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-red-500 transition" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Expanded Detail Panel */}
      {open && (
        <div className="border-t border-slate-200 px-3 py-3 space-y-3">
          {/* Row 1: Name + Type + Fairness */}
          <div className="grid grid-cols-[1fr_120px_auto] gap-2 items-end">
            <label className="block">
              <span className="mb-1 block text-[11px] uppercase tracking-wider text-slate-500 font-bold">Name</span>
              <input
                value={column.name}
                disabled={locked}
                onChange={(e) => onChange({ ...column, name: e.target.value.replace(/\s+/g, "_") })}
                className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-200"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] uppercase tracking-wider text-slate-500 font-bold">Type</span>
              <select
                value={column.type}
                disabled={locked}
                onChange={(e) => onChange({ ...column, type: e.target.value })}
                className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:border-slate-500"
              >
                <option value="numerical">numerical</option>
                <option value="categorical">categorical</option>
                <option value="boolean">boolean</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] text-slate-700 cursor-pointer whitespace-nowrap font-semibold">
              <input
                type="checkbox"
                checked={column.fairness_sensitive}
                onChange={(e) => onChange({ ...column, fairness_sensitive: e.target.checked })}
                className="accent-slate-800 w-3.5 h-3.5"
              />
              Fairness
            </label>
          </div>

          {/* Numerical: Min/Max/Distribution/Nullable */}
          {numerical && (
            <div className="grid grid-cols-4 gap-2 items-end">
              <label className="block">
                <span className="mb-1 block text-[11px] uppercase tracking-wider text-slate-500 font-bold">Min</span>
                <input
                  type="number"
                  value={column.config.min ?? ""}
                  onChange={(e) => updateConfig({ min: Number(e.target.value) })}
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-200"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] uppercase tracking-wider text-slate-500 font-bold">Max</span>
                <input
                  type="number"
                  value={column.config.max ?? ""}
                  onChange={(e) => updateConfig({ max: Number(e.target.value) })}
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-200"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] uppercase tracking-wider text-slate-500 font-bold">Dist.</span>
                <select
                  value={column.config.distribution || "uniform"}
                  onChange={(e) => updateConfig({ distribution: e.target.value })}
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:border-slate-500"
                >
                  <option value="normal">normal</option>
                  <option value="log-normal">log-normal</option>
                  <option value="uniform">uniform</option>
                </select>
              </label>
              <label className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] text-slate-700 cursor-pointer font-semibold">
                <input
                  type="checkbox"
                  checked={Boolean(column.config.nullable)}
                  onChange={(e) => updateConfig({ nullable: e.target.checked })}
                  className="accent-slate-800 w-3.5 h-3.5"
                />
                Nullable
              </label>
            </div>
          )}

          {/* Categorical: compact option rows */}
          {categorical && (
            <div className="space-y-1.5">
              <div className="grid grid-cols-[1fr_80px_auto] gap-1.5 text-[11px] uppercase tracking-wider text-slate-500 font-bold px-1">
                <span>Label</span>
                <span>Weight</span>
                <span></span>
              </div>
              {options.map((option, oi) => (
                <div key={`${column.name}-${oi}`} className="grid grid-cols-[1fr_80px_auto] gap-1.5">
                  <input
                    value={option}
                    onChange={(e) => {
                      const next = [...options]; next[oi] = e.target.value;
                      updateConfig({ options: next });
                    }}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:border-slate-500"
                  />
                  <input
                    type="number" step="0.01"
                    value={weights[oi] ?? ""}
                    onChange={(e) => {
                      const next = [...weights]; next[oi] = Number(e.target.value);
                      updateConfig({ weights: next });
                    }}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:border-slate-500"
                  />
                  <button
                    className="rounded-md px-2 py-1.5 text-xs text-slate-400 hover:bg-slate-200 hover:text-red-500 transition font-bold"
                    onClick={() => {
                      updateConfig({ options: options.filter((_, i) => i !== oi), weights: weights.filter((_, i) => i !== oi) });
                    }}
                  >✕</button>
                </div>
              ))}
              <button
                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                onClick={() => updateConfig({ options: [...options, `option_${options.length + 1}`], weights: [...weights, 1] })}
              >+ Add option</button>
            </div>
          )}

          {/* Boolean: compact base rate */}
          {boolean && column.name !== "loan_approved" && (
            <label className="block">
              <span className="mb-1 block text-[11px] uppercase tracking-wider text-slate-500 font-bold">Base rate</span>
              <input
                type="number" min="0" max="1" step="0.01"
                value={column.config.base_rate ?? 0.5}
                onChange={(e) => updateConfig({ base_rate: Number(e.target.value) })}
                className="w-full max-w-[140px] rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-200"
              />
            </label>
          )}
        </div>
      )}
    </article>
  );
}

export default function SchemaBuilder({
  schema,
  suggestions,
  suggestionLoading,
  validationError,
  agePromptPending,
  onTogglePreset,
  onUpdateColumn,
  onRemoveColumn,
  onReorder,
  onSuggest,
  onAddSuggestion,
  onAddAllSuggestions,
  onDismissSuggestions,
  onProceed,
  onEnableAgeMonitoring,
  onSkipAgeMonitoring,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [dragIndex, setDragIndex] = useState(null);

  return (
    <section className="space-y-6">
      {/* Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-500">Schema Builder</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">Build your dataset schema first</h2>
        <p className="mt-1.5 max-w-3xl text-sm text-slate-500">
          Choose the columns you want, tune each field's behavior, and lock in the protected attributes de.bias should monitor for bias.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        {/* Left Column */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <PresetPicker schema={schema} onToggle={onTogglePreset} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
          </div>
          <SuggestionPanel
            onSuggest={onSuggest}
            loading={suggestionLoading}
            suggestions={suggestions}
            onAddSuggestion={onAddSuggestion}
            onAddAllSuggestions={onAddAllSuggestions}
            onDismissSuggestions={onDismissSuggestions}
          />
        </div>

        {/* Right Column: Your Schema */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Your Schema</h3>
              <p className="mt-0.5 text-xs text-slate-500">Click a card to expand. Drag to reorder.</p>
            </div>
            <span className="rounded-md border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{schema.length} columns</span>
          </div>

          <div className="space-y-1.5 max-h-[55vh] overflow-y-auto scrollbar-minimal pr-0.5">
            {schema.map((column, index) => (
              <SchemaColumnCard
                key={`${column.name}-${index}`}
                column={cloneValue(column)}
                locked={column.name === "loan_approved"}
                index={index}
                onChange={(nextColumn) => onUpdateColumn(index, nextColumn)}
                onRemove={() => onRemoveColumn(index)}
                onDragStart={setDragIndex}
                onDragOver={() => {}}
                onDrop={(dropIndex) => {
                  if (dragIndex === null || dragIndex === dropIndex) {
                    return;
                  }
                  onReorder(dragIndex, dropIndex);
                  setDragIndex(null);
                }}
              />
            ))}
          </div>

          {validationError ? <p className="mt-3 rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">{validationError}</p> : null}

          {agePromptPending ? (
            <div className="mt-3 rounded-lg border border-slate-300 bg-slate-100 p-3">
              <p className="text-sm font-bold text-slate-800">Want to monitor age as a protected attribute too?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition" onClick={onEnableAgeMonitoring}>
                  Yes
                </button>
                <button className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition" onClick={onSkipAgeMonitoring}>
                  No thanks
                </button>
              </div>
            </div>
          ) : null}

          <button className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 transition active:scale-[0.98] shadow-lg" onClick={onProceed}>
            Build My Dataset →
          </button>
        </div>
      </div>
    </section>
  );
}
