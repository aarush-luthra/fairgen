import { useState } from "react";

import { exportToHuggingFace } from "../api/export";

function downloadFile(name, contents, type) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function DownloadPanel({ config, result }) {
  const [hfToken, setHfToken] = useState("");
  const [repoName, setRepoName] = useState("");
  const [shareState, setShareState] = useState("");
  const [exportState, setExportState] = useState("");
  const dataset = result?.dataset || [];

  function handleCsv() {
    if (!dataset.length) {
      return;
    }
    const headers = Object.keys(dataset[0]);
    const rows = dataset.map((row) => headers.map((header) => JSON.stringify(row[header] ?? "")).join(","));
    downloadFile("fairgen_dataset.csv", [headers.join(","), ...rows].join("\n"), "text/csv");
  }

  function handleJson() {
    if (!result) {
      return;
    }
    downloadFile("fairgen_report.json", JSON.stringify(result, null, 2), "application/json");
  }

  function handleShare() {
    const encoded = btoa(JSON.stringify(config));
    navigator.clipboard.writeText(encoded);
    setShareState("Config copied to clipboard");
    window.setTimeout(() => setShareState(""), 2000);
  }

  async function handleExport() {
    if (!dataset.length || !hfToken || !repoName) {
      setExportState("Add a token, repo name, and generated dataset first.");
      return;
    }
    setExportState("Publishing dataset to HuggingFace Hub...");
    try {
      const response = await exportToHuggingFace(dataset, hfToken, repoName);
      setExportState(`Published: ${response.url}`);
    } catch (error) {
      setExportState(error.message);
    }
  }

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/20">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-100">Download and Export</h2>
        <p className="mt-1 text-sm text-slate-400">Export the dataset, share the config, or keep building toward HuggingFace publishing.</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <button className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-400" onClick={handleCsv}>
          Download CSV
        </button>
        <button className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-200 hover:bg-slate-800" onClick={handleJson}>
          Download Fairness Report
        </button>
        <button className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-200 hover:bg-slate-800" onClick={handleShare}>
          Share Config
        </button>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
        <input
          className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none"
          placeholder="HuggingFace token"
          value={hfToken}
          onChange={(event) => setHfToken(event.target.value)}
        />
        <input
          className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none"
          placeholder="Repo name, e.g. username/fairgen-demo"
          value={repoName}
          onChange={(event) => setRepoName(event.target.value)}
        />
        <button className="rounded-2xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-400" onClick={handleExport}>
          Push to HuggingFace Hub
        </button>
      </div>

      {shareState ? <p className="mt-3 text-sm text-emerald-300">{shareState}</p> : null}
      {exportState ? <p className="mt-2 break-all text-sm text-slate-300">{exportState}</p> : null}
    </section>
  );
}
