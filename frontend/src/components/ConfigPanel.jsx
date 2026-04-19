import { Check } from "lucide-react";
import BiasToggle from "./BiasToggle";
import Tooltip from "./Tooltip";
import { DEFAULT_CONFIG, TOOLTIP_COPY } from "../constants";

function sliderFill(value, min, max) {
  const percentage = ((value - min) / (max - min)) * 100;
  return `linear-gradient(90deg, rgba(59,130,246,0.95) 0%, rgba(59,130,246,0.95) ${percentage}%, rgba(51,65,85,0.95) ${percentage}%, rgba(51,65,85,0.95) 100%)`;
}

function Slider({ label, value, min, max, step = 1, onChange, helper, disabled = false }) {
  return (
    <label className={`block ${disabled ? "opacity-50" : ""}`}>
      <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
        <span>{label}</span>
        <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-xs">{value}</span>
      </div>
      <input
        className="h-2 w-full cursor-pointer appearance-none rounded-full"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        style={{ background: sliderFill(value, min, max) }}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {helper ? <p className="mt-2 text-xs leading-5 text-slate-400">{helper}</p> : null}
    </label>
  );
}

function datasetSizeHint(datasetSize) {
  if (datasetSize <= 200) {
    return `${datasetSize} rows. Good for quick testing. Use 1,000+ rows for model training or stronger comparisons.`;
  }
  if (datasetSize < 1000) {
    return `${datasetSize} rows. Solid for prototypes and chart checks. Use 1,000+ rows when you want more training-ready volume.`;
  }
  return `${datasetSize} rows. Strong enough for richer analysis and model training experiments.`;
}

function representationEnabled(representation) {
  return representation.femalePct > 0 || representation.minorityPct > 0 || representation.ruralPct > 0;
}

export default function ConfigPanel({
  config,
  schema,
  onChange,
  onGenerate,
  onReset,
  onSaveConfig,
  onLoadConfig,
  onEditSchema,
  busy,
  generateLabel,
  showGenerateSuccess,
}) {
  const representationIsEnabled = representationEnabled(config.representation);
  const schemaNames = new Set(schema.map((column) => column.name));
  const monitoredNames = new Set(schema.filter((column) => column.fairness_sensitive).map((column) => column.name));
  const showGenderSlider = schemaNames.has("gender") && monitoredNames.has("gender");
  const showRaceSlider = schemaNames.has("race") && monitoredNames.has("race");
  const showRuralSlider = schemaNames.has("zip_code_tier") && monitoredNames.has("zip_code_tier");
  const hasRepresentationControls = showGenderSlider || showRaceSlider || showRuralSlider;

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/20">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Configuration</h2>
          <p className="mt-1 text-sm text-slate-400">Tune the fairness controls, then generate a synthetic credit dataset.</p>
        </div>
        <button className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800" onClick={onEditSchema}>
          Edit Schema
        </button>
      </div>

      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-medium text-slate-200">Dataset size</span>
            <Tooltip text="Choose how many synthetic applicants to generate. Larger datasets take longer but provide stronger analysis and export value." />
          </div>
          <Slider
            label="Rows to generate"
            min={100}
            max={10000}
            step={100}
            value={config.datasetSize}
            helper={datasetSizeHint(config.datasetSize)}
            onChange={(value) => onChange({ datasetSize: value })}
          />
        </div>

        <BiasToggle
          title="Historical Bias"
          description="Corrects discriminatory approval patterns inherited from past lending decisions."
          tooltip={TOOLTIP_COPY.historicalBias}
          defaultOpen
          accentClassName="border-l-amber-400"
          enabled={config.historicalCorrection > 0}
          onEnabledChange={(enabled) =>
            onChange({
              historicalCorrection: enabled ? DEFAULT_CONFIG.historicalCorrection : 0,
            })
          }
        >
          <Slider
            label="Historical bias correction"
            min={0}
            max={100}
            value={config.historicalCorrection}
            disabled={config.historicalCorrection === 0}
            helper="Higher values remove more inherited bias from prior lending decisions."
            onChange={(value) => onChange({ historicalCorrection: value })}
          />
        </BiasToggle>

        <BiasToggle
          title="Representation Bias"
          description="Improves the presence of women, minorities, and rural applicants in the generated sample."
          tooltip={TOOLTIP_COPY.representationBias}
          accentClassName="border-l-sky-400"
          enabled={representationIsEnabled}
          onEnabledChange={(enabled) =>
            onChange({
              representation: enabled
                ? { ...DEFAULT_CONFIG.representation }
                : { femalePct: 0, minorityPct: 0, ruralPct: 0 },
            })
          }
        >
          {hasRepresentationControls ? (
            <div className={`space-y-4 ${representationIsEnabled ? "" : "opacity-50"}`}>
              {showGenderSlider ? (
                <Slider
                  label="Female and non-binary minimum %"
                  min={0}
                  max={100}
                  value={config.representation.femalePct}
                  disabled={!representationIsEnabled}
                  onChange={(value) => onChange({ representation: { femalePct: value } })}
                />
              ) : null}
              {showRaceSlider ? (
                <Slider
                  label="Minority minimum %"
                  min={0}
                  max={100}
                  value={config.representation.minorityPct}
                  disabled={!representationIsEnabled}
                  onChange={(value) => onChange({ representation: { minorityPct: value } })}
                />
              ) : null}
              {showRuralSlider ? (
                <Slider
                  label="Rural minimum %"
                  min={0}
                  max={100}
                  value={config.representation.ruralPct}
                  disabled={!representationIsEnabled}
                  onChange={(value) => onChange({ representation: { ruralPct: value } })}
                />
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No monitored demographic columns in this schema currently drive representation balancing.</p>
          )}
        </BiasToggle>

        <BiasToggle
          title="Label Bias"
          description="Corrects unfair borderline approval outcomes where protected groups are treated differently."
          tooltip={TOOLTIP_COPY.labelBias}
          accentClassName="border-l-violet-400"
          enabled={config.labelCorrection > 0}
          onEnabledChange={(enabled) =>
            onChange({
              labelCorrection: enabled ? DEFAULT_CONFIG.labelCorrection : 0,
            })
          }
        >
          <Slider
            label="Label correction ratio"
            min={0}
            max={100}
            value={config.labelCorrection}
            disabled={config.labelCorrection === 0}
            helper="Use this to repair unfair borderline labels where similar applicants are treated differently."
            onChange={(value) => onChange({ labelCorrection: value })}
          />
        </BiasToggle>

        <BiasToggle
          title="Measurement Noise"
          description="Applies equal measurement noise across groups so data quality inconsistencies are not group-specific."
          tooltip={TOOLTIP_COPY.measurementBias}
          accentClassName="border-l-teal-400"
          enabled={config.measurementNoise.enabled}
          onEnabledChange={(enabled) => onChange({ measurementNoise: { enabled } })}
        >
          <div className={`space-y-4 ${config.measurementNoise.enabled ? "" : "opacity-50"}`}>
            <Slider
              label="Credit score sigma"
              min={0}
              max={40}
              value={config.measurementNoise.creditScoreSigma}
              disabled={!config.measurementNoise.enabled}
              helper="Keeps score volatility consistent across groups instead of letting one segment get noisier data."
              onChange={(value) => onChange({ measurementNoise: { creditScoreSigma: value } })}
            />
            <Slider
              label="Income sigma"
              min={0}
              max={10000}
              step={100}
              value={config.measurementNoise.incomeSigma}
              disabled={!config.measurementNoise.enabled}
              onChange={(value) => onChange({ measurementNoise: { incomeSigma: value } })}
            />
          </div>
        </BiasToggle>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onGenerate}
          disabled={busy}
        >
          {showGenerateSuccess ? <Check size={16} /> : null}
          {generateLabel}
        </button>
        <button className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-200 hover:bg-slate-800" onClick={onReset}>
          Reset to Defaults
        </button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <button className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-200 hover:bg-slate-800" onClick={onSaveConfig}>
          Save Config
        </button>
        <button className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-200 hover:bg-slate-800" onClick={onLoadConfig}>
          Load Config
        </button>
      </div>
    </section>
  );
}
