import {
  buildExecutiveSummary,
  buildMetricComparisons,
  buildRecommendations,
  formatMetricValue,
  getDatasetPreviewRows,
  getFairnessStatus,
  METRIC_LABELS,
} from "./reporting";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildMetricBars(comparisons) {
  return comparisons
    .map((item) => {
      const beforeWidth = Math.max(4, Math.min(100, item.key === "DPD" ? (1 - item.before) * 100 : item.before * 100));
      const afterWidth = Math.max(4, Math.min(100, item.key === "DPD" ? (1 - item.after) * 100 : item.after * 100));

      return `
        <div class="metric-row">
          <div class="metric-row__header">
            <strong>${escapeHtml(METRIC_LABELS[item.key])}</strong>
            <span>${escapeHtml(formatMetricValue(item.key, item.before))} → ${escapeHtml(formatMetricValue(item.key, item.after))}</span>
          </div>
          <div class="bar-track"><div class="bar-fill baseline" style="width:${beforeWidth}%"></div></div>
          <div class="bar-track"><div class="bar-fill mitigated" style="width:${afterWidth}%"></div></div>
        </div>
      `;
    })
    .join("");
}

function buildPreviewTable(rows) {
  if (!rows.length) {
    return "<p class='muted'>No dataset rows available.</p>";
  }

  const headers = Object.keys(rows[0]).slice(0, 6);
  const headerHtml = headers.map((header) => `<th>${escapeHtml(header.replaceAll("_", " "))}</th>`).join("");
  const rowHtml = rows
    .map((row) => {
      const cells = headers.map((header) => `<td>${escapeHtml(row[header])}</td>`).join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  return `
    <table>
      <thead><tr>${headerHtml}</tr></thead>
      <tbody>${rowHtml}</tbody>
    </table>
  `;
}

export function downloadFairnessPdf(result) {
  if (!result) {
    return;
  }

  const score = Number(result?.metrics?.OFS ?? 0);
  const status = getFairnessStatus(score);
  const summary = buildExecutiveSummary(result);
  const recommendations = buildRecommendations(result);
  const comparisons = buildMetricComparisons(result?.beforeMetrics, result?.metrics);
  const previewRows = getDatasetPreviewRows(result?.dataset || [], 8);

  const popup = window.open("", "_blank", "width=1200,height=900");
  if (!popup) {
    window.alert("Allow pop-ups to export the report as PDF.");
    return;
  }

  popup.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>FairGen Fairness Report</title>
        <style>
          :root {
            --ink: #0f172a;
            --muted: #475569;
            --line: #dbe4ee;
            --panel: #f8fafc;
            --baseline: #f87171;
            --mitigated: #22c55e;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 32px;
            font-family: Inter, Arial, sans-serif;
            color: var(--ink);
            background: white;
          }
          h1, h2, h3, p { margin: 0; }
          .page { max-width: 1024px; margin: 0 auto; }
          .header {
            display: flex;
            justify-content: space-between;
            gap: 24px;
            align-items: flex-start;
            border-bottom: 1px solid var(--line);
            padding-bottom: 18px;
            margin-bottom: 24px;
          }
          .eyebrow {
            font-size: 12px;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            color: var(--muted);
            margin-bottom: 8px;
          }
          .grid {
            display: grid;
            grid-template-columns: 1.4fr 1fr;
            gap: 16px;
            margin-bottom: 16px;
          }
          .panel {
            border: 1px solid var(--line);
            border-radius: 18px;
            padding: 20px;
            background: var(--panel);
          }
          .status {
            display: inline-block;
            padding: 6px 10px;
            border-radius: 999px;
            background: #dcfce7;
            color: #166534;
            font-size: 12px;
            font-weight: 700;
            margin-top: 8px;
          }
          .score {
            font-size: 56px;
            font-weight: 800;
            line-height: 1;
            margin-top: 8px;
          }
          .metric-row { margin-top: 18px; }
          .metric-row__header {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            font-size: 13px;
            margin-bottom: 6px;
          }
          .bar-track {
            height: 12px;
            border-radius: 999px;
            background: #e2e8f0;
            overflow: hidden;
            margin-bottom: 8px;
          }
          .bar-fill { height: 100%; border-radius: 999px; }
          .baseline { background: linear-gradient(90deg, #fca5a5, var(--baseline)); }
          .mitigated { background: linear-gradient(90deg, #86efac, var(--mitigated)); }
          .list {
            padding-left: 20px;
            color: var(--muted);
            line-height: 1.6;
          }
          .list li + li { margin-top: 8px; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
            font-size: 12px;
          }
          th, td {
            border-bottom: 1px solid var(--line);
            padding: 10px 8px;
            text-align: left;
          }
          th { text-transform: uppercase; font-size: 11px; color: var(--muted); }
          .metrics-table td:last-child,
          .metrics-table th:last-child { text-align: right; }
          .muted { color: var(--muted); }
          .section-title { margin-bottom: 12px; font-size: 22px; }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <div>
              <div class="eyebrow">FairGen Compliance Report</div>
              <h1>Fairness Summary</h1>
              <p class="muted" style="margin-top: 10px; max-width: 720px; line-height: 1.7;">${escapeHtml(summary)}</p>
            </div>
            <div>
              <div class="eyebrow">Status</div>
              <div class="score">${Math.round(score)}/100</div>
              <div class="status">${escapeHtml(status.label)}</div>
            </div>
          </div>

          <div class="grid">
            <section class="panel">
              <h2 class="section-title">Baseline vs Mitigated</h2>
              <p class="muted">Each metric is shown twice: baseline first, then mitigated.</p>
              ${buildMetricBars(comparisons)}
            </section>
            <section class="panel">
              <h2 class="section-title">Key Recommendations</h2>
              <ol class="list">
                ${recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
              </ol>
            </section>
          </div>

          <section class="panel" style="margin-bottom: 16px;">
            <h2 class="section-title">Metric Comparison</h2>
            <table class="metrics-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Baseline</th>
                  <th>Mitigated</th>
                  <th>Delta</th>
                </tr>
              </thead>
              <tbody>
                ${comparisons
                  .map(
                    (item) => `
                      <tr>
                        <td>${escapeHtml(METRIC_LABELS[item.key])}</td>
                        <td>${escapeHtml(formatMetricValue(item.key, item.before))}</td>
                        <td>${escapeHtml(formatMetricValue(item.key, item.after))}</td>
                        <td>${escapeHtml(`${item.delta >= 0 ? "+" : ""}${item.delta.toFixed(3)}`)}</td>
                      </tr>
                    `,
                  )
                  .join("")}
              </tbody>
            </table>
          </section>

          <section class="panel">
            <h2 class="section-title">Dataset Preview</h2>
            <p class="muted">First ${previewRows.length} rows of the mitigated dataset preview.</p>
            ${buildPreviewTable(previewRows)}
          </section>
        </div>
        <script>
          window.onload = function () {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  popup.document.close();
}
