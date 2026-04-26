const METRIC_ORDER = ["DPD", "DIR", "LCS", "REI"];

export const METRIC_LABELS = {
  OFS: "Overall Fairness Score",
  DPD: "Demographic Parity Difference",
  DIR: "Disparate Impact Ratio",
  LCS: "Label Consistency Score",
  REI: "Representation Equity Index",
};

export function getFairnessStatus(score = 0) {
  if (score >= 90) {
    return {
      label: "Highly Compliant",
      summaryLabel: "Strong fairness posture",
      accent: "emerald",
      description: "Mitigation is preserving balanced outcomes across the monitored groups.",
    };
  }
  if (score >= 75) {
    return {
      label: "Compliant with Observations",
      summaryLabel: "Healthy but watchlist",
      accent: "sky",
      description: "The dataset is materially improved, with a few fairness signals still worth monitoring.",
    };
  }
  if (score >= 60) {
    return {
      label: "Needs Monitoring",
      summaryLabel: "Partial mitigation",
      accent: "amber",
      description: "Mitigation is helping, but at least one fairness metric remains outside the ideal zone.",
    };
  }
  return {
    label: "Needs Intervention",
    summaryLabel: "Bias risk remains",
    accent: "rose",
    description: "Fairness gaps remain meaningful enough to warrant additional mitigation before downstream use.",
  };
}

export function formatMetricValue(metricKey, value) {
  if (value == null || Number.isNaN(Number(value))) {
    return "0";
  }
  if (metricKey === "OFS") {
    return `${Math.round(Number(value))}/100`;
  }
  if (metricKey === "DPD") {
    return Number(value).toFixed(3);
  }
  return Number(value).toFixed(2);
}

function isImprovement(metricKey, before = 0, after = 0) {
  if (metricKey === "DPD") {
    return after < before;
  }
  return after > before;
}

export function buildMetricComparisons(beforeMetrics = {}, afterMetrics = {}) {
  return METRIC_ORDER.map((metricKey) => {
    const before = Number(beforeMetrics?.[metricKey] ?? 0);
    const after = Number(afterMetrics?.[metricKey] ?? 0);
    const delta = after - before;
    return {
      key: metricKey,
      label: METRIC_LABELS[metricKey],
      before,
      after,
      delta,
      improved: isImprovement(metricKey, before, after),
    };
  });
}

export function buildExecutiveSummary(result) {
  const score = Number(result?.metrics?.OFS ?? 0);
  const status = getFairnessStatus(score);
  const comparisons = buildMetricComparisons(result?.beforeMetrics, result?.metrics);
  const improvedCount = comparisons.filter((item) => item.improved).length;
  const monitored = result?.monitoredColumns || [];
  const groupText = monitored.length ? monitored.join(", ").replaceAll("_", " ") : "the monitored attributes";

  return `FairGen analyzed the generated dataset against ${groupText}. The mitigated dataset reached ${Math.round(score)}/100 overall fairness, with ${improvedCount} of ${comparisons.length} core fairness metrics improving versus the biased baseline. ${status.description}`;
}

export function buildRecommendations(result) {
  const metrics = result?.metrics || {};
  const monitored = result?.monitoredColumns || [];
  const suggestions = [];

  if ((metrics.REI ?? 0) < 0.9) {
    suggestions.push(`Increase representation targets for ${monitored[0]?.replaceAll("_", " ") || "underrepresented groups"} so coverage is more balanced.`);
  }
  if ((metrics.DIR ?? 0) < 0.9) {
    suggestions.push("Tune approval calibration and label correction to close the remaining opportunity gap between the lowest- and highest-approved groups.");
  }
  if ((metrics.DPD ?? 0) > 0.08) {
    suggestions.push("Review demographic parity gaps across protected segments before using this dataset for model training.");
  }
  if ((metrics.LCS ?? 0) < 0.95) {
    suggestions.push("Audit borderline decision regions to ensure similar applicants receive consistent labels regardless of protected-group membership.");
  }

  suggestions.push("Export this report and re-run the fairness audit whenever the schema, representation targets, or mitigation settings change.");

  return suggestions.slice(0, 4);
}

export function getDatasetPreviewRows(dataset = [], count = 8) {
  return dataset.slice(0, count);
}

export function buildMetricChartData(beforeMetrics = {}, afterMetrics = {}) {
  return buildMetricComparisons(beforeMetrics, afterMetrics).map((item) => ({
    metric: item.key,
    label: item.key,
    baseline: Number(item.before.toFixed(3)),
    mitigated: Number(item.after.toFixed(3)),
  }));
}

export function buildProtectedGroupComparisons(charts = {}) {
  const beforeCharts = charts?.before || {};
  const afterCharts = charts?.after || {};

  return (afterCharts.approvalRateByProtected || []).map((afterItem) => {
    const beforeItem = (beforeCharts.approvalRateByProtected || []).find((candidate) => candidate.column === afterItem.column);
    const beforeGroups = new Map((beforeItem?.groups || []).map((group) => [group.name, group.approvalRate]));

    return {
      column: afterItem.column,
      groups: (afterItem.groups || []).map((group) => ({
        name: group.name,
        baseline: Number(beforeGroups.get(group.name) ?? 0),
        mitigated: Number(group.approvalRate ?? 0),
      })),
    };
  });
}
