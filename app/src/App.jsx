import { useMemo, useRef, useState } from "react";
import { ArrowRight, Check, CircleHelp, Sparkles } from "lucide-react";
import AIPromptBox from "./components/AIPromptBox";
import ConfigPanel from "./components/ConfigPanel";
import DataTable from "./components/DataTable";
import DistributionCharts from "./components/DistributionCharts";
import DownloadPanel from "./components/DownloadPanel";
import FairnessReport from "./components/FairnessReport";
import SchemaBuilder from "./components/SchemaBuilder";
import { generateDataset } from "./api/generate";
import { applyAIConstraint, suggestColumns, testApiConnection } from "./api/openai";
import { DEFAULT_CONFIG, DEFAULT_SCHEMA, DEMO_SCHEMA, FAIRNESS_BADGES, TABS, buildSchemaColumn } from "./constants";

const GENERATION_STEPS = [
  "Fitting SDV synthesizer...",
  "Sampling base records...",
  "Applying historical bias correction...",
  "Enforcing representation constraints...",
  "Correcting label bias...",
  "Injecting measurement noise parity...",
  "Computing fairness metrics...",
];

const DEMOGRAPHIC_COLUMNS = new Set([
  "age",
  "gender",
  "race",
  "zip_code_tier",
  "marital_status",
  "education_level",
  "dependents_count",
  "citizenship_status",
]);

const FINANCIAL_COLUMNS = new Set([
  "annual_income",
  "employment_status",
  "credit_score",
  "debt_to_income",
  "prior_defaults",
  "savings_balance",
  "monthly_expenses",
  "existing_loans",
  "assets_value",
]);

function fairnessTone(score) {
  if (score >= 80) {
    return {
      label: "Strong",
      chipClassName: "text-emerald-200 border-emerald-500/30 bg-emerald-500/10",
      accentClassName: "from-emerald-400 via-emerald-300 to-lime-300",
      message: "You are in a strong range. Keep pushing toward a consistently fair dataset.",
    };
  }
  if (score >= 60) {
    return {
      label: "Improving",
      chipClassName: "text-amber-100 border-amber-500/30 bg-amber-500/10",
      accentClassName: "from-amber-400 via-amber-300 to-yellow-300",
      message: "You are partway there. A few adjustments can still reduce approval gaps.",
    };
  }
  return {
    label: "Needs attention",
    chipClassName: "text-rose-100 border-rose-500/30 bg-rose-500/10",
    accentClassName: "from-rose-400 via-orange-300 to-amber-300",
    message: "There is visible bias left in the dataset. Use the controls below to raise this score.",
  };
}

function serializeConfig(config) {
  return JSON.stringify(config);
}

function serializeSchema(schema) {
  return JSON.stringify(schema);
}

function getProgressFromStatus(statusMessage, loading) {
  if (!loading) {
    return 100;
  }
  const stepIndex = GENERATION_STEPS.indexOf(statusMessage);
  if (stepIndex === -1) {
    return 10;
  }
  return Math.round(((stepIndex + 1) / GENERATION_STEPS.length) * 100);
}

function removeSchemaColumnAt(schema, index) {
  return schema.filter((_, currentIndex) => currentIndex !== index);
}

function reorderSchema(schema, fromIndex, toIndex) {
  const next = [...schema];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export default function App() {
  const [schema, setSchema] = useState(DEFAULT_SCHEMA);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [step, setStep] = useState("schema");
  const [activeTab, setActiveTab] = useState("table");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Build a schema to get started");
  const [aiExplanation, setAiExplanation] = useState("");
  const [apiStatus, setApiStatus] = useState({ connected: false, message: "Not tested" });
  const [resumeReady, setResumeReady] = useState(false);
  const [persistState, setPersistState] = useState("");
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showGenerateSuccess, setShowGenerateSuccess] = useState(false);
  const [lastGeneratedConfig, setLastGeneratedConfig] = useState(DEFAULT_CONFIG);
  const [lastGeneratedSchema, setLastGeneratedSchema] = useState(DEFAULT_SCHEMA);
  const [schemaValidationError, setSchemaValidationError] = useState("");
  const [agePromptPending, setAgePromptPending] = useState(false);
  const [agePromptDismissed, setAgePromptDismissed] = useState(false);
  const [schemaSuggestions, setSchemaSuggestions] = useState([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const controllerRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastRequestedConfigRef = useRef(DEFAULT_CONFIG);
  const successTimeoutRef = useRef(null);

  const score = result?.metrics?.OFS ?? 0;
  const scoreTone = fairnessTone(score);
  const statusProgress = getProgressFromStatus(statusMessage, loading);
  const configDirty = serializeConfig(config) !== serializeConfig(lastGeneratedConfig);
  const schemaDirty = serializeSchema(schema) !== serializeSchema(lastGeneratedSchema);
  const monitoredColumns = schema.filter((column) => column.fairness_sensitive);

  function triggerSuccessState() {
    setShowGenerateSuccess(true);
    if (successTimeoutRef.current) {
      window.clearTimeout(successTimeoutRef.current);
    }
    successTimeoutRef.current = window.setTimeout(() => setShowGenerateSuccess(false), 1800);
  }

  async function handleGenerate(nextConfig = config, nextSchema = schema) {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    const controller = new AbortController();
    controllerRef.current = controller;
    lastRequestedConfigRef.current = nextConfig;
    setLoading(true);
    setResumeReady(false);
    setShowGenerateSuccess(false);
    setStatusMessage(GENERATION_STEPS[0]);
    try {
      const response = await generateDataset(nextSchema, nextConfig, (message) => setStatusMessage(message), controller.signal);
      setConfig(nextConfig);
      setSchema(nextSchema);
      setResult(response);
      setLastGeneratedConfig(nextConfig);
      setLastGeneratedSchema(nextSchema);
      setStatusMessage("Dataset ready. Check your Fairness Report.");
      triggerSuccessState();
    } catch (error) {
      if (error.name === "AbortError") {
        setStatusMessage("Generation paused");
        setResumeReady(true);
      } else {
        setStatusMessage(error.message || "Generation failed");
      }
    } finally {
      setLoading(false);
      controllerRef.current = null;
    }
  }

  async function handleApplyAIConstraint(instruction) {
    setLoading(true);
    setStatusMessage("Interpreting fairness instruction...");
    try {
      const response = await applyAIConstraint(instruction, config);
      const merged = {
        ...config,
        ...response.configDelta,
        representation: {
          ...config.representation,
          ...(response.configDelta.representation || {}),
        },
        measurementNoise: {
          ...config.measurementNoise,
          ...(response.configDelta.measurementNoise || {}),
        },
      };
      setAiExplanation(response.explanation);
      await handleGenerate(merged, schema);
    } catch (error) {
      setStatusMessage(error.message || "AI constraint failed");
      setLoading(false);
    }
  }

  async function handleApiTest() {
    setApiStatus({ connected: false, message: "Testing..." });
    try {
      const response = await testApiConnection();
      setApiStatus({
        connected: response.openaiConnected,
        message: response.openaiMessage || (response.openaiConnected ? "Connected" : "Connection failed"),
      });
    } catch (error) {
      setApiStatus({ connected: false, message: error.message || "Connection failed" });
    }
  }

  function handleConfigChange(partial) {
    setConfig((current) => ({
      ...current,
      ...partial,
      representation: {
        ...current.representation,
        ...(partial.representation || {}),
      },
      measurementNoise: {
        ...current.measurementNoise,
        ...(partial.measurementNoise || {}),
      },
    }));
  }

  function handleDemoScenario() {
    setSchema(DEMO_SCHEMA);
    setStep("config");
    setSchemaValidationError("");
    setAgePromptPending(false);
    setAgePromptDismissed(false);
    setAiExplanation("Loaded a ready-to-generate schema for a biased credit-risk demo scenario.");
  }

  function handleSaveConfig() {
    const payload = JSON.stringify({ config, schema }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "fairgen-config.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setPersistState("Config and schema saved as JSON");
    window.setTimeout(() => setPersistState(""), 2000);
  }

  function handleLoadConfigClick() {
    fileInputRef.current?.click();
  }

  async function handleLoadConfigFile(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const contents = await file.text();
      const parsed = JSON.parse(contents);
      const mergedConfig = {
        ...DEFAULT_CONFIG,
        ...(parsed.config || parsed),
        representation: { ...DEFAULT_CONFIG.representation, ...((parsed.config || parsed).representation || {}) },
        measurementNoise: { ...DEFAULT_CONFIG.measurementNoise, ...((parsed.config || parsed).measurementNoise || {}) },
      };
      const loadedSchema = Array.isArray(parsed.schema) && parsed.schema.length ? parsed.schema : DEFAULT_SCHEMA;
      setConfig(mergedConfig);
      setSchema(loadedSchema);
      setStep("config");
      setPersistState("Config and schema loaded");
      window.setTimeout(() => setPersistState(""), 2000);
    } catch {
      setPersistState("Could not read that config file");
      window.setTimeout(() => setPersistState(""), 2500);
    } finally {
      event.target.value = "";
    }
  }

  function handleStopGeneration() {
    controllerRef.current?.abort();
  }

  function handleTogglePreset(name) {
    setSchemaValidationError("");
    setAgePromptPending(false);
    setSchemaSuggestions((current) => current.filter((suggestion) => suggestion.name !== name));
    setSchema((current) => {
      const exists = current.some((column) => column.name === name);
      if (exists) {
        return current.filter((column) => column.name !== name || column.name === "loan_approved");
      }
      return [...current, buildSchemaColumn(name)];
    });
  }

  function handleUpdateSchemaColumn(index, nextColumn) {
    setSchema((current) => current.map((column, currentIndex) => (currentIndex === index ? nextColumn : column)));
  }

  function handleRemoveSchemaColumn(index) {
    setSchema((current) => removeSchemaColumnAt(current, index));
  }

  function validateSchema(nextSchema) {
    const hasOutcome = nextSchema.some((column) => column.name === "loan_approved");
    const hasSensitiveDemographic = nextSchema.some((column) => column.fairness_sensitive && DEMOGRAPHIC_COLUMNS.has(column.name));
    const hasFinancial = nextSchema.some((column) => FINANCIAL_COLUMNS.has(column.name));
    const hasSensitive = nextSchema.some((column) => column.fairness_sensitive);

    if (!hasSensitiveDemographic || !hasFinancial || !hasOutcome) {
      return "Select at least one monitored demographic column, one financial column, and the required loan_approved outcome before continuing.";
    }
    if (!hasSensitive) {
      return "FairGen needs at least one protected attribute column (e.g. race, gender, age) to compute fairness metrics.";
    }
    return "";
  }

  function proceedToConfig(nextSchema = schema) {
    const validationMessage = validateSchema(nextSchema);
    if (validationMessage) {
      setSchemaValidationError(validationMessage);
      return;
    }

    const ageColumn = nextSchema.find((column) => column.name === "age");
    if (ageColumn && !ageColumn.fairness_sensitive && !agePromptDismissed) {
      setAgePromptPending(true);
      setSchemaValidationError("");
      return;
    }

    setSchemaValidationError("");
    setAgePromptPending(false);
    setStep("config");
    setStatusMessage("Schema ready. Tune your fairness controls.");
  }

  function handleEnableAgeMonitoring() {
    const nextSchema = schema.map((column) => (column.name === "age" ? { ...column, fairness_sensitive: true } : column));
    setSchema(nextSchema);
    setAgePromptPending(false);
    proceedToConfig(nextSchema);
  }

  function handleSkipAgeMonitoring() {
    setAgePromptDismissed(true);
    setAgePromptPending(false);
    proceedToConfig(schema);
  }

  async function handleSuggestColumns(description) {
    setSuggestionLoading(true);
    try {
      const response = await suggestColumns(
        description,
        schema.map((column) => column.name),
      );
      setSchemaSuggestions(response.suggestions || []);
    } catch (error) {
      setSchemaValidationError(error.message || "Could not fetch AI schema suggestions.");
    } finally {
      setSuggestionLoading(false);
    }
  }

  function handleAddSuggestion(suggestion) {
    setSchema((current) => {
      if (current.some((column) => column.name === suggestion.name)) {
        return current;
      }
      return [...current, suggestion];
    });
    setSchemaSuggestions((current) => current.filter((item) => item.name !== suggestion.name));
  }

  function handleAddAllSuggestions() {
    setSchema((current) => {
      const names = new Set(current.map((column) => column.name));
      const additions = schemaSuggestions.filter((suggestion) => !names.has(suggestion.name));
      return [...current, ...additions];
    });
    setSchemaSuggestions([]);
  }

  const tabs = useMemo(
    () => ({
      table: <DataTable rows={result?.dataset || []} schema={schema} />,
      charts: <DistributionCharts charts={result?.charts} />,
      report: <FairnessReport metrics={result?.metrics} fairnessReport={result?.fairnessReport} beforeMetrics={result?.beforeMetrics} />,
    }),
    [result, schema],
  );

  const generateButtonLabel = loading
    ? "Generating dataset..."
    : showGenerateSuccess
      ? "Dataset generated"
      : result
        ? configDirty || schemaDirty
          ? "Regenerate with new settings"
          : "Generate dataset again"
        : "Generate dataset";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_30%),linear-gradient(180deg,_#020617,_#0f172a_45%,_#020617)] text-slate-100">
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-300">FairGen</p>
              <p className="mt-1 truncate text-sm text-slate-300">Schema Builder → Configuration → Generate → Preview + Report</p>
            </div>
            {result ? (
              <button
                className={`hidden rounded-full border px-3 py-1 text-xs font-medium md:inline-flex ${scoreTone.chipClassName}`}
                onClick={() => setActiveTab("report")}
              >
                Score {score}
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            <button
              className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 transition hover:border-slate-600 hover:bg-slate-800"
              onClick={() => setShowHelpModal(true)}
            >
              <CircleHelp size={16} />
              How it works?
            </button>
            <button
              className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 transition hover:border-slate-600 hover:bg-slate-800"
              onClick={handleDemoScenario}
            >
              Load Demo Scenario
            </button>
            {step === "config" ? (
              <button
                className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => handleGenerate(config, schema)}
                disabled={loading}
              >
                {showGenerateSuccess ? <Check size={16} /> : <Sparkles size={16} />}
                {generateButtonLabel}
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 pb-2 pt-6">
        <div className="max-w-4xl">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Build the exact credit dataset schema you need, then stress-test it for bias.
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            Choose your own columns, monitor protected attributes, and let FairGen generate a synthetic dataset with fairness metrics that adapt to your schema.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {FAIRNESS_BADGES.map((badge) => (
              <span key={badge} className="rounded-full border border-slate-700 bg-slate-900/90 px-3 py-1 text-xs text-slate-300">
                {badge}
              </span>
            ))}
          </div>
        </div>

        {step === "config" ? (
          <button
            className="mt-6 grid w-full gap-4 rounded-[2rem] border border-slate-800 bg-[linear-gradient(135deg,_rgba(15,23,42,0.95),_rgba(15,23,42,0.88)),radial-gradient(circle_at_right,_rgba(96,165,250,0.28),_transparent_35%)] p-5 text-left shadow-2xl shadow-slate-950/20 transition hover:border-slate-700"
            onClick={() => setActiveTab("report")}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-200/90">Your current score</p>
                <div className="mt-3 flex flex-wrap items-end gap-4">
                  <div className="text-5xl font-semibold tracking-tight sm:text-6xl">{score}</div>
                  <div className={`mb-2 rounded-full border px-3 py-1 text-sm font-medium ${scoreTone.chipClassName}`}>{scoreTone.label}</div>
                </div>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{scoreTone.message}</p>
              </div>

              <div className="min-w-[240px] max-w-sm">
                <div className="mb-2 flex items-center justify-between gap-4 text-xs uppercase tracking-[0.25em] text-slate-400">
                  <span>Improve toward 100</span>
                  <span className="shrink-0">{Math.min(score, 100)} / 100</span>
                </div>
                <div className="h-3 rounded-full bg-slate-800">
                  <div className={`h-full rounded-full bg-gradient-to-r ${scoreTone.accentClassName}`} style={{ width: `${Math.min(score, 100)}%` }} />
                </div>
                <div className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-blue-200">
                  Open Fairness Report
                  <ArrowRight size={16} />
                </div>
              </div>
            </div>
          </button>
        ) : null}
      </section>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {step === "schema" ? (
          <SchemaBuilder
            schema={schema}
            suggestions={schemaSuggestions}
            suggestionLoading={suggestionLoading}
            validationError={schemaValidationError}
            agePromptPending={agePromptPending}
            onTogglePreset={handleTogglePreset}
            onUpdateColumn={handleUpdateSchemaColumn}
            onRemoveColumn={handleRemoveSchemaColumn}
            onReorder={(fromIndex, toIndex) => setSchema((current) => reorderSchema(current, fromIndex, toIndex))}
            onSuggest={handleSuggestColumns}
            onAddSuggestion={handleAddSuggestion}
            onAddAllSuggestions={handleAddAllSuggestions}
            onDismissSuggestions={() => setSchemaSuggestions([])}
            onProceed={() => proceedToConfig(schema)}
            onEnableAgeMonitoring={handleEnableAgeMonitoring}
            onSkipAgeMonitoring={handleSkipAgeMonitoring}
          />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[330px_minmax(0,1fr)]">
            <div className="space-y-6">
              <ConfigPanel
                config={config}
                schema={schema}
                onChange={handleConfigChange}
                onGenerate={() => handleGenerate(config, schema)}
                onReset={() => setConfig(DEFAULT_CONFIG)}
                onSaveConfig={handleSaveConfig}
                onLoadConfig={handleLoadConfigClick}
                onEditSchema={() => setStep("schema")}
                busy={loading}
                generateLabel={generateButtonLabel}
                showGenerateSuccess={showGenerateSuccess}
              />
              <AIPromptBox
                apiStatus={apiStatus}
                aiExplanation={aiExplanation}
                onApply={handleApplyAIConstraint}
                onTestConnection={handleApiTest}
              />
              {persistState ? <p className="px-2 text-sm text-blue-300">{persistState}</p> : null}
            </div>

            <section className="space-y-6">
              <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-4">
                <p className="text-sm font-semibold text-amber-100">⚠️ FairGen will monitor these columns for bias:</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {monitoredColumns.map((column) => (
                    <span key={column.name} className="rounded-full border border-amber-400/30 bg-slate-950/40 px-3 py-1 text-xs text-amber-100">
                      {column.name}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-sm text-amber-50/80">These power your Demographic Parity, Disparate Impact, and Representation metrics.</p>
              </div>

              {result && !loading && activeTab !== "report" ? (
                <div className="flex flex-col gap-3 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-emerald-100">Dataset ready.</p>
                    <p className="mt-1 text-sm text-emerald-50/80">Check your Fairness Score and metric breakdown to see what improved.</p>
                  </div>
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-slate-950/40 px-4 py-2 text-sm font-medium text-emerald-100 hover:bg-slate-950/70"
                    onClick={() => setActiveTab("report")}
                  >
                    Check your Fairness Score
                    <ArrowRight size={16} />
                  </button>
                </div>
              ) : null}

              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/20">
                <div className="mb-5 grid gap-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-3 md:grid-cols-3">
                  {TABS.map((tab, index) => {
                    const active = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        className={`flex items-center justify-between rounded-2xl px-4 py-3 text-left transition ${
                          active ? "bg-blue-500/15 text-white ring-1 ring-blue-400/30" : "bg-slate-900/60 text-slate-300 hover:bg-slate-800"
                        }`}
                        onClick={() => setActiveTab(tab.id)}
                      >
                        <div>
                          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{`0${index + 1}`}</p>
                          <p className="mt-1 text-sm font-medium">{tab.label}</p>
                        </div>
                        <ArrowRight size={16} className={active ? "text-blue-200" : "text-slate-500"} />
                      </button>
                    );
                  })}
                </div>

                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-slate-400">① View Data</span>
                  <span className="text-slate-600">→</span>
                  <span className="text-sm text-slate-400">② Explore Charts</span>
                  <span className="text-slate-600">→</span>
                  <span className="text-sm text-slate-400">③ Read Report</span>
                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    <div className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-300">{statusMessage}</div>
                    {resumeReady ? (
                      <button
                        className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-200"
                        onClick={() => handleGenerate(lastRequestedConfigRef.current, schema)}
                      >
                        Resume Generation
                      </button>
                    ) : null}
                  </div>
                </div>

                {tabs[activeTab]}
              </div>

              <DownloadPanel config={{ ...config, schema }} result={result} />
            </section>
          </div>
        )}
      </div>

      {loading ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-400/30 border-t-blue-400" />
            <p className="text-lg font-semibold text-slate-100">{statusMessage}</p>
            <div className="mt-4 overflow-hidden rounded-full bg-slate-800">
              <div className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-cyan-300" style={{ width: `${statusProgress}%` }} />
            </div>
            <p className="mt-3 text-sm text-slate-400">FairGen is generating, correcting, and scoring the dataset.</p>
            <button
              className="mt-5 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
              onClick={handleStopGeneration}
            >
              Stop for now
            </button>
          </div>
        </div>
      ) : null}

      {showHelpModal ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-2xl rounded-[2rem] border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-slate-950/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-300">How FairGen works</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-100">Three quick steps</h2>
              </div>
              <button className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-300 hover:bg-slate-800" onClick={() => setShowHelpModal(false)}>
                Close
              </button>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <p className="text-sm font-semibold text-slate-100">1. Build your schema</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">Pick the columns your use case needs and mark the protected attributes FairGen should monitor.</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <p className="text-sm font-semibold text-slate-100">2. Tune the bias controls</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">Adjust mitigation layers that adapt to the financial and demographic columns present in your schema.</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <p className="text-sm font-semibold text-slate-100">3. Generate and review</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">Use the fairness score, charts, and report to see how your chosen schema behaves after mitigation.</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleLoadConfigFile} />
    </main>
  );
}
