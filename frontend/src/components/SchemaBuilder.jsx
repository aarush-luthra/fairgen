import { useMemo, useState } from "react";
import { GripVertical, Plus, Sparkles, Trash2 } from "lucide-react";
import { SCHEMA_CATEGORY_ORDER, SCHEMA_PRESETS, buildSchemaColumn } from "../constants";

function TypeBadge({ type }) {
  return <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-xs text-slate-300">{type}</span>;
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
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Preset Column Picker</h2>
        <p className="mt-1 text-sm text-slate-400">Search and add the columns your synthetic dataset should contain.</p>
      </div>

      <input
        value={searchQuery}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search columns..."
        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none"
      />

      <div className="space-y-4">
        {filteredCategories.map(({ category, entries }) => (
          <section key={category} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <h3 className="text-sm font-semibold text-slate-200">{category}</h3>
            <div className="mt-3 space-y-2">
              {entries.map(([name, preset]) => (
                <label
                  key={name}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 transition ${
                    selectedNames.has(name) ? "border-blue-500/30 bg-blue-500/10" : "border-slate-800 bg-slate-950/60 hover:bg-slate-900"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedNames.has(name)}
                    disabled={preset.locked}
                    onChange={() => onToggle(name)}
                    className="mt-1 accent-blue-500"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-100">{preset.label}</span>
                      <TypeBadge type={preset.type} />
                      {preset.fairness_sensitive ? (
                        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-100">Fairness</span>
                      ) : null}
                      {preset.locked ? (
                        <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-300">Required</span>
                      ) : null}
                    </div>
                  </div>
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
    <section className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-slate-900 p-4">
      <button className="flex w-full items-center justify-between text-left" onClick={() => setOpen((value) => !value)}>
        <div>
          <p className="text-sm font-semibold text-violet-100">🤖 Ask AI to suggest columns for your use case</p>
          <p className="mt-1 text-sm text-slate-300">Optional GPT-4o mini add-on for credit and fairness-oriented schema ideas.</p>
        </div>
        <span className="text-sm text-violet-200">{open ? "Hide" : "Open"}</span>
      </button>

      {open ? (
        <div className="mt-4 space-y-4">
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-violet-400/20 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500"
            placeholder="Describe what you're building... e.g. A model to predict mortgage defaults for first-time homebuyers in rural areas"
          />
          <button
            className="inline-flex items-center gap-2 rounded-2xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-50"
            disabled={!description.trim() || loading}
            onClick={() => onSuggest(description)}
          >
            <Sparkles size={16} />
            {loading ? "Suggesting..." : "Suggest Columns"}
          </button>

          {suggestions.length ? (
            <div className="space-y-3">
              {suggestions.map((suggestion) => (
                <div key={suggestion.name} className="rounded-2xl border border-violet-500/20 bg-slate-950/60 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-100">{suggestion.name}</p>
                    <TypeBadge type={suggestion.type} />
                    {suggestion.fairness_sensitive ? (
                      <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-100">Fairness</span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{suggestion.reason}</p>
                  <button
                    className="mt-3 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-100 hover:bg-violet-500/20"
                    onClick={() => onAddSuggestion(suggestion)}
                  >
                    <Plus size={14} />
                    Add
                  </button>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <button className="rounded-full bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-400" onClick={onAddAllSuggestions}>
                  Add All
                </button>
                <button className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" onClick={onDismissSuggestions}>
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
  const [open, setOpen] = useState(true);
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
      className="rounded-2xl border border-slate-800 bg-slate-950/50"
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
      <div className="flex items-start gap-3 px-4 py-4">
        <button className="mt-1 text-slate-500" disabled={locked}>
          <GripVertical size={16} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button className="font-medium text-slate-100" onClick={() => setOpen((value) => !value)}>
              {column.name}
            </button>
            <TypeBadge type={column.type} />
            {column.fairness_sensitive ? (
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-100">Monitored for fairness</span>
            ) : null}
            {locked ? <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-300">Locked</span> : null}
          </div>
        </div>
        {!locked ? (
          <button className="rounded-full border border-slate-700 p-2 text-slate-400 hover:bg-slate-800" onClick={onRemove}>
            <Trash2 size={14} />
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="space-y-4 border-t border-slate-800 px-4 py-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Column name</span>
              <input
                value={column.name}
                disabled={locked}
                onChange={(event) => onChange({ ...column, name: event.target.value.replace(/\s+/g, "_") })}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Data type</span>
              <select
                value={column.type}
                disabled={locked}
                onChange={(event) => onChange({ ...column, type: event.target.value })}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
              >
                <option value="numerical">numerical</option>
                <option value="categorical">categorical</option>
                <option value="boolean">boolean</option>
              </select>
            </label>
          </div>

          <label className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3 text-sm text-slate-200">
            <span>Monitor this column for fairness</span>
            <input
              type="checkbox"
              checked={column.fairness_sensitive}
              onChange={(event) => onChange({ ...column, fairness_sensitive: event.target.checked })}
              className="accent-blue-500"
            />
          </label>

          {numerical ? (
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Min</span>
                <input
                  type="number"
                  value={column.config.min ?? ""}
                  onChange={(event) => updateConfig({ min: Number(event.target.value) })}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Max</span>
                <input
                  type="number"
                  value={column.config.max ?? ""}
                  onChange={(event) => updateConfig({ max: Number(event.target.value) })}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Distribution</span>
                <select
                  value={column.config.distribution || "uniform"}
                  onChange={(event) => updateConfig({ distribution: event.target.value })}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                >
                  <option value="normal">normal</option>
                  <option value="log-normal">log-normal</option>
                  <option value="uniform">uniform</option>
                </select>
              </label>
              <label className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3 text-sm text-slate-200">
                <span>Nullable</span>
                <input
                  type="checkbox"
                  checked={Boolean(column.config.nullable)}
                  onChange={(event) => updateConfig({ nullable: event.target.checked })}
                  className="accent-blue-500"
                />
              </label>
            </div>
          ) : null}

          {categorical ? (
            <div className="space-y-3">
              {options.map((option, optionIndex) => (
                <div key={`${column.name}-${optionIndex}`} className="grid gap-3 md:grid-cols-[1fr_140px_auto]">
                  <input
                    value={option}
                    onChange={(event) => {
                      const nextOptions = [...options];
                      nextOptions[optionIndex] = event.target.value;
                      updateConfig({ options: nextOptions });
                    }}
                    className="rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={weights[optionIndex] ?? ""}
                    onChange={(event) => {
                      const nextWeights = [...weights];
                      nextWeights[optionIndex] = Number(event.target.value);
                      updateConfig({ weights: nextWeights });
                    }}
                    className="rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                  />
                  <button
                    className="rounded-2xl border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
                    onClick={() => {
                      const nextOptions = options.filter((_, idx) => idx !== optionIndex);
                      const nextWeights = weights.filter((_, idx) => idx !== optionIndex);
                      updateConfig({ options: nextOptions, weights: nextWeights });
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
                onClick={() =>
                  updateConfig({
                    options: [...options, `option_${options.length + 1}`],
                    weights: [...weights, 1],
                  })
                }
              >
                Add option
              </button>
            </div>
          ) : null}

          {boolean && column.name !== "loan_approved" ? (
            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Base rate</span>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={column.config.base_rate ?? 0.5}
                onChange={(event) => updateConfig({ base_rate: Number(event.target.value) })}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
              />
            </label>
          ) : null}
        </div>
      ) : null}
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
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/20">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-300">Schema Builder</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-100">Build your dataset schema first</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Choose the columns you want, tune each field’s behavior, and lock in the protected attributes de.bias should monitor for bias.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/20">
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

        <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/20">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Your Schema</h3>
              <p className="mt-1 text-sm text-slate-400">Drag cards to set CSV column order.</p>
            </div>
            <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-300">{schema.length} columns</span>
          </div>

          <div className="space-y-3">
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

          {validationError ? <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{validationError}</p> : null}

          {agePromptPending ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
              <p className="text-sm font-semibold text-amber-100">Want to monitor age as a protected attribute too?</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300" onClick={onEnableAgeMonitoring}>
                  Yes
                </button>
                <button className="rounded-full border border-amber-400/30 px-4 py-2 text-sm text-amber-100 hover:bg-amber-500/10" onClick={onSkipAgeMonitoring}>
                  No thanks
                </button>
              </div>
            </div>
          ) : null}

          <button className="rounded-2xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-400" onClick={onProceed}>
            Build My Dataset →
          </button>
        </div>
      </div>
    </section>
  );
}
