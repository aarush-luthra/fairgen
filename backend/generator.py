from __future__ import annotations

from dataclasses import dataclass
from math import exp, log

import numpy as np
import pandas as pd

from schema_catalog import CATEGORICAL_DEFAULTS
from schemas import ColumnConfig, DeBiasConfig, SchemaColumn

try:
    from sdv.metadata import SingleTableMetadata
    from sdv.single_table import GaussianCopulaSynthesizer

    SDV_AVAILABLE = True
except Exception:
    SingleTableMetadata = None
    GaussianCopulaSynthesizer = None
    SDV_AVAILABLE = False


SDV_VERSION = "unavailable"
if SDV_AVAILABLE:
    try:
        import sdv

        SDV_VERSION = sdv.__version__
    except Exception:
        SDV_VERSION = "installed"


EMPLOYMENT = ["Employed", "Self-employed", "Unemployed", "Retired"]
PURPOSES = ["Home", "Auto", "Education", "Business", "Personal"]


@dataclass
class GenerationArtifacts:
    base_dataset: pd.DataFrame
    source: str


def _normalize_weights(weights: list[float], size: int) -> np.ndarray:
    if len(weights) != size or sum(weights) <= 0:
        return np.repeat(1 / size, size)
    values = np.array(weights, dtype=float)
    total = values.sum()
    return values / total if total > 0 else np.repeat(1 / size, size)


def _categorical_options(column: SchemaColumn) -> tuple[list[str], np.ndarray]:
    options = column.config.options or CATEGORICAL_DEFAULTS.get(column.name, ["Yes", "No"])
    weights = _normalize_weights(column.config.weights, len(options))
    return options, weights


def _safe_nullable(value, column: SchemaColumn, rng: np.random.Generator):
    if column.config.nullable and rng.random() < 0.05:
        return None
    return value


def _sample_generic_numerical(config: ColumnConfig, rng: np.random.Generator) -> float:
    lower = config.min if config.min is not None else 0
    upper = config.max if config.max is not None else 100
    distribution = config.distribution or "uniform"
    if distribution == "normal":
        value = rng.normal((lower + upper) / 2, max((upper - lower) / 6, 1))
    elif distribution == "log-normal":
        midpoint = max((lower + upper) / 2, 1)
        sigma = 0.45
        value = exp(rng.normal(log(midpoint), sigma))
    else:
        value = rng.uniform(lower, upper)
    return float(np.clip(value, lower, upper))


def _employment_for_age(age: int, rng: np.random.Generator) -> str:
    if age > 63 and rng.random() < 0.45:
        return "Retired"
    if age < 24 and rng.random() < 0.18:
        return "Unemployed"
    return rng.choice(EMPLOYMENT, p=[0.62, 0.18, 0.12, 0.08])


def _purpose_for_income(income: float, rng: np.random.Generator) -> str:
    if income > 120_000:
        return rng.choice(PURPOSES, p=[0.35, 0.15, 0.08, 0.22, 0.20])
    return rng.choice(PURPOSES, p=[0.20, 0.26, 0.16, 0.10, 0.28])


def _compute_internal_approval_score(row: dict[str, object], schema: list[SchemaColumn]) -> float:
    signal_specs: list[tuple[str, float, callable]] = []

    if any(column.name == "credit_score" for column in schema):
        signal_specs.append(("credit_score", 0.45, lambda value: (float(value) - 300) / 550))
    if any(column.name == "debt_to_income" for column in schema):
        signal_specs.append(("debt_to_income", 0.30, lambda value: 1 - float(value)))
    if any(column.name == "prior_defaults" for column in schema):
        signal_specs.append(("prior_defaults", 0.15, lambda value: 1 - min(float(value), 5) / 5))
    if any(column.name == "annual_income" for column in schema):
        signal_specs.append(("annual_income", 0.10, lambda value: min(float(value), 250_000) / 250_000))
    if any(column.name == "savings_balance" for column in schema):
        signal_specs.append(("savings_balance", 0.08, lambda value: min(float(value), 200_000) / 200_000))
    if any(column.name == "assets_value" for column in schema):
        signal_specs.append(("assets_value", 0.08, lambda value: min(float(value), 500_000) / 500_000))
    if any(column.name == "existing_loans" for column in schema):
        signal_specs.append(("existing_loans", 0.06, lambda value: 1 - min(float(value), 8) / 8))

    present = [(name, weight, fn) for name, weight, fn in signal_specs if row.get(name) is not None]
    if not present:
        return 0.5

    total_weight = sum(weight for _, weight, _ in present)
    score = 0.0
    for name, weight, transform in present:
        score += transform(row[name]) * (weight / total_weight)
    return float(np.clip(score, 0, 1))


def _latent_profile(rng: np.random.Generator) -> dict[str, object]:
    age = int(rng.integers(21, 72))
    gender = rng.choice(["Male", "Female", "Non-binary"], p=[0.47, 0.46, 0.07])
    race = rng.choice(["White", "Black", "Hispanic", "Asian", "Other"], p=[0.38, 0.20, 0.22, 0.12, 0.08])
    zip_code_tier = rng.choice(["Urban", "Suburban", "Rural"], p=[0.50, 0.32, 0.18])
    education_level = rng.choice(["High school", "Associate", "Bachelor", "Master", "Doctorate"], p=[0.20, 0.16, 0.36, 0.20, 0.08])
    marital_status = rng.choice(["Single", "Married", "Divorced", "Widowed"], p=[0.38, 0.44, 0.12, 0.06])
    citizenship_status = rng.choice(["Citizen", "Permanent Resident", "Visa Holder"], p=[0.76, 0.17, 0.07])
    dependents_count = int(np.clip(rng.poisson(1.2), 0, 6))
    employment_status = _employment_for_age(age, rng)

    education_bonus = {
        "High school": 0,
        "Associate": 8_000,
        "Bachelor": 18_000,
        "Master": 32_000,
        "Doctorate": 44_000,
    }[education_level]
    income_base = {
        "Employed": 62_000,
        "Self-employed": 84_000,
        "Unemployed": 24_000,
        "Retired": 48_000,
    }[employment_status]
    annual_income = float(np.clip(rng.normal(income_base + education_bonus, 22_000), 15_000, 250_000))
    monthly_expenses = float(np.clip(annual_income / 12 * rng.uniform(0.28, 0.62), 900, 14_000))
    savings_balance = float(np.clip(rng.normal(annual_income * 0.55, 18_000), 0, 220_000))
    assets_value = float(np.clip(rng.normal(annual_income * 1.4, 65_000), 0, 650_000))

    credit_base = {
        "Employed": 690,
        "Self-employed": 670,
        "Unemployed": 580,
        "Retired": 710,
    }[employment_status]
    credit_score = int(np.clip(rng.normal(credit_base + min(education_bonus / 3000, 20), 75), 300, 850))
    existing_loans = int(np.clip(rng.poisson(1.4 if annual_income > 50_000 else 0.8), 0, 8))
    prior_defaults = int(np.clip(rng.poisson(0.5 if credit_score > 650 else 1.2), 0, 5))
    debt_to_income = float(np.clip(rng.normal(0.32 if annual_income > 60_000 else 0.47, 0.12), 0.05, 0.95))
    loan_amount = float(np.clip(annual_income * rng.uniform(0.12, 0.75), 1_000, 100_000))
    loan_term_months = int(rng.choice([12, 24, 36, 48, 60, 72], p=[0.10, 0.16, 0.28, 0.18, 0.18, 0.10]))
    interest_rate = float(np.clip(rng.normal(7.2 if credit_score > 680 else 11.8, 2.2), 2.5, 28.0))
    collateral_type = rng.choice(["None", "Vehicle", "Property", "Savings"], p=[0.45, 0.20, 0.20, 0.15])
    co_applicant = bool(rng.random() < 0.22)

    return {
        "age": age,
        "gender": gender,
        "race": race,
        "zip_code_tier": zip_code_tier,
        "marital_status": marital_status,
        "education_level": education_level,
        "dependents_count": dependents_count,
        "citizenship_status": citizenship_status,
        "annual_income": round(annual_income, 2),
        "employment_status": employment_status,
        "credit_score": credit_score,
        "debt_to_income": round(debt_to_income, 4),
        "prior_defaults": prior_defaults,
        "savings_balance": round(savings_balance, 2),
        "monthly_expenses": round(monthly_expenses, 2),
        "existing_loans": existing_loans,
        "assets_value": round(assets_value, 2),
        "loan_amount": round(loan_amount, 2),
        "loan_purpose": _purpose_for_income(annual_income, rng),
        "loan_term_months": loan_term_months,
        "interest_rate": round(interest_rate, 2),
        "collateral_type": collateral_type,
        "co_applicant": co_applicant,
    }


def _value_for_column(column: SchemaColumn, latent: dict[str, object], rng: np.random.Generator):
    if column.name in latent:
        return _safe_nullable(latent[column.name], column, rng)

    if column.type == "categorical":
        options, weights = _categorical_options(column)
        return _safe_nullable(str(rng.choice(options, p=weights)), column, rng)
    if column.type == "boolean":
        base_rate = column.config.base_rate if column.config.base_rate is not None else 0.5
        return _safe_nullable(bool(rng.random() < base_rate), column, rng)

    value = _sample_generic_numerical(column.config, rng)
    if column.config.max is not None and column.config.max <= 10 and float(value).is_integer():
        value = int(round(value))
    return _safe_nullable(round(float(value), 4), column, rng)


def create_seed_dataframe(schema: list[SchemaColumn], rows: int = 120) -> pd.DataFrame:
    rng = np.random.default_rng(42)
    data: list[dict[str, object]] = []
    outcome_column = next((column for column in schema if column.name == "loan_approved"), None)

    for _ in range(rows):
        latent = _latent_profile(rng)
        row = {column.name: _value_for_column(column, latent, rng) for column in schema if column.name != "loan_approved"}
        approval_score = _compute_internal_approval_score(row | latent, schema)
        base_rate = outcome_column.config.base_rate if outcome_column and outcome_column.config.base_rate is not None else 0.52
        row["loan_approved"] = bool(approval_score >= base_rate)
        row["approval_score"] = round(float(approval_score), 4)
        data.append(row)

    return pd.DataFrame(data)


def create_metadata(schema: list[SchemaColumn]):
    if not SDV_AVAILABLE or SingleTableMetadata is None:
        return None

    metadata = SingleTableMetadata()
    seed_df = create_seed_dataframe(schema).drop(columns=["approval_score"], errors="ignore")
    metadata.detect_from_dataframe(data=seed_df)
    return metadata


def _perturb_numeric(series: pd.Series, column: SchemaColumn, rng: np.random.Generator) -> pd.Series:
    numeric_series = pd.to_numeric(series, errors="coerce").dropna()
    lower = float(column.config.min) if column.config.min is not None else (float(numeric_series.min()) if not numeric_series.empty else 0.0)
    upper = float(column.config.max) if column.config.max is not None else (float(numeric_series.max()) if not numeric_series.empty else 100.0)
    
    if np.isnan(lower): lower = 0.0
    if np.isnan(upper): upper = 100.0
    if lower >= upper: upper = lower + 1.0
    
    spread = max((upper - lower) * 0.05, 0.1)
    
    # Fill NaNs before perturbing to avoid errors
    filled_series = series.fillna((lower + upper) / 2).astype(float)
    
    perturbed = np.clip(filled_series + rng.normal(0, spread, len(series)), lower, upper)
    
    if pd.api.types.is_integer_dtype(series):
        return perturbed.round().astype(int)
    return perturbed.round(4)


def _fallback_sample(seed_df: pd.DataFrame, schema: list[SchemaColumn], size: int) -> pd.DataFrame:
    rng = np.random.default_rng(7)
    sampled = seed_df.sample(n=size, replace=True, random_state=7).reset_index(drop=True).copy()

    for column in schema:
        if column.name == "loan_approved":
            continue
        if column.type == "numerical" and column.name in sampled:
            sampled[column.name] = _perturb_numeric(sampled[column.name], column, rng)
        elif column.type == "categorical" and column.name in sampled and rng.random() < 0.15:
            options, weights = _categorical_options(column)
            replacement_mask = rng.random(len(sampled)) < 0.08
            sampled.loc[replacement_mask, column.name] = rng.choice(options, size=int(replacement_mask.sum()), p=weights)
        elif column.type == "boolean" and column.name in sampled and column.name != "loan_approved":
            base_rate = column.config.base_rate if column.config.base_rate is not None else float(sampled[column.name].mean())
            sampled[column.name] = rng.random(len(sampled)) < base_rate

    return sampled


def sample_base_dataset(config: DeBiasConfig, schema: list[SchemaColumn]) -> GenerationArtifacts:
    seed_df = create_seed_dataframe(schema)
    fit_df = seed_df.drop(columns=["approval_score"], errors="ignore")

    if SDV_AVAILABLE and GaussianCopulaSynthesizer is not None:
        try:
            metadata = create_metadata(schema)
            synthesizer = GaussianCopulaSynthesizer(metadata)
            synthesizer.fit(fit_df)
            sampled = synthesizer.sample(num_rows=config.datasetSize)
            sampled["approval_score"] = 0.5
            return GenerationArtifacts(base_dataset=sampled, source="sdv")
        except Exception:
            pass

    sampled = _fallback_sample(seed_df, schema, config.datasetSize)
    return GenerationArtifacts(base_dataset=sampled, source="seed-fallback")
