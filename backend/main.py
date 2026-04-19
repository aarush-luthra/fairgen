from __future__ import annotations

import io
import os
import time

import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

load_dotenv()

from bias_layers import apply_bias_pipeline, create_biased_baseline
from fairness import build_distribution_summary, build_metric_cards, compute_fairness_metrics, monitored_columns
from generator import SDV_AVAILABLE, SDV_VERSION, sample_base_dataset
from openai_client import interpret_fairness_prompt, suggest_schema_columns, test_connection
from schemas import (
    ExportHuggingFaceRequest,
    GenerateRequest,
    PromptRequest,
    SchemaColumn,
    SuggestColumnsRequest,
    SuggestColumnsResponse,
)

app = FastAPI(title="FairGen API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    # Print traceback to server logs for debugging
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal Server Error",
            "message": str(exc),
        },
        headers={
            "Access-Control-Allow-Origin": request.headers.get("Origin", "*"),
            "Access-Control-Allow-Credentials": "true",
        }
    )


LOADING_MESSAGES = [
    "Fitting SDV synthesizer...",
    "Sampling base records...",
    "Applying historical bias correction...",
    "Enforcing representation constraints...",
    "Correcting label bias...",
    "Injecting measurement noise parity...",
    "Computing fairness metrics...",
]


def _validate_schema(schema: list[SchemaColumn]) -> None:
    names = [column.name for column in schema]
    if len(set(names)) != len(names):
        raise HTTPException(status_code=400, detail="Schema column names must be unique.")
    if "loan_approved" not in names:
        raise HTTPException(status_code=400, detail="Schema must include the required loan_approved outcome column.")
    if not any(column.fairness_sensitive for column in schema):
        raise HTTPException(
            status_code=400,
            detail="FairGen needs at least one protected attribute column (e.g. race, gender, age) to compute fairness metrics.",
        )


def _build_generation_response(payload: GenerateRequest) -> dict:
    _validate_schema(payload.schema)
    started = time.perf_counter()
    artifacts = sample_base_dataset(payload.config, payload.schema)
    base_df = artifacts.base_dataset.copy()

    if "approval_score" not in base_df.columns:
        base_df["approval_score"] = 0.5
    if "loan_approved" not in base_df.columns:
        base_df["loan_approved"] = False

    before_df = create_biased_baseline(base_df, payload.schema)
    after_df = apply_bias_pipeline(base_df, payload.config, payload.schema)

    before_metrics = compute_fairness_metrics(before_df, payload.schema)
    after_metrics = compute_fairness_metrics(after_df, payload.schema)
    generation_time_ms = round((time.perf_counter() - started) * 1000, 1)
    output_columns = [column.name for column in payload.schema]
    monitored = [column.name for column in monitored_columns(payload.schema)]

    # Sanitize dataset for JSON serialization (remove NaN/Inf)
    clean_df = after_df.reindex(columns=output_columns).copy()
    clean_df = clean_df.replace([float('inf'), float('-inf')], 0).fillna(0)
    
    return {
        "dataset": clean_df.to_dict(orient="records"),
        "metrics": after_metrics,
        "beforeMetrics": before_metrics,
        "fairnessReport": {
            "overallScore": after_metrics["OFS"],
            "metricCards": build_metric_cards(after_metrics),
            "beforeCards": build_metric_cards(before_metrics),
        },
        "charts": {
            "before": build_distribution_summary(before_df, payload.schema),
            "after": build_distribution_summary(after_df, payload.schema),
        },
        "generationTimeMs": generation_time_ms,
        "generationTimeSeconds": round(generation_time_ms / 1000, 2),
        "sdvVersion": SDV_VERSION,
        "generatorSource": artifacts.source,
        "loadingMessages": LOADING_MESSAGES + [f"Done ✓ — Generated in {round(generation_time_ms / 1000, 2)}s"],
        "monitoredColumns": monitored,
        "schema": [column.model_dump() for column in payload.schema],
    }


@app.get("/health")
def health():
    connected, message = test_connection() if os.getenv("OPENAI_API_KEY") else (False, "OPENAI_API_KEY not configured")
    return {
        "status": "ok",
        "sdvVersion": SDV_VERSION,
        "sdvAvailable": SDV_AVAILABLE,
        "openaiConnected": connected,
        "openaiMessage": message,
    }


@app.post("/generate")
def generate(payload: GenerateRequest):
    return _build_generation_response(payload)


@app.post("/suggest-columns", response_model=SuggestColumnsResponse)
def suggest_columns(payload: SuggestColumnsRequest):
    try:
        result = suggest_schema_columns(payload.description, payload.alreadySelected)
        return SuggestColumnsResponse.model_validate(result)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Column suggestion failed: {exc}") from exc


@app.post("/prompt")
def prompt(payload: PromptRequest):
    try:
        result = interpret_fairness_prompt(payload.instruction, payload.currentConfig)
        explanation = result.pop("explanation", "Applied the requested fairness constraint changes.")
        return {"configDelta": result, "explanation": explanation}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prompt interpretation failed: {exc}") from exc


@app.post("/export/huggingface")
def export_huggingface(payload: ExportHuggingFaceRequest):
    try:
        from datasets import Dataset
        from huggingface_hub import HfApi
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"HuggingFace dependencies unavailable: {exc}") from exc

    try:
        df = pd.DataFrame(payload.dataset)
        dataset = Dataset.from_pandas(df)
        api = HfApi(token=payload.hfToken)
        api.create_repo(repo_id=payload.repoName, repo_type="dataset", exist_ok=True)

        with io.BytesIO() as buffer:
            df.to_csv(buffer, index=False)
            buffer.seek(0)
            api.upload_file(
                repo_id=payload.repoName,
                repo_type="dataset",
                path_in_repo="fairgen_dataset.csv",
                path_or_fileobj=buffer,
            )

        dataset.push_to_hub(payload.repoName, token=payload.hfToken)
        return {"url": f"https://huggingface.co/datasets/{payload.repoName}"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Export failed: {exc}") from exc


@app.get("/")
def root():
    return {"name": "FairGen API", "status": "running"}
