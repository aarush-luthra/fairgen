# de.bias

**Generate synthetic credit data. Remove bias. Prove it worked.**

de.bias is a Google Cloud-native fairness engineering platform for synthetic credit datasets. It generates realistic lending data, applies a four-layer bias mitigation pipeline, evaluates fairness at both the **data level** and the **model level**, and produces Gemini-authored compliance reports — all in a single pipeline.

Built for [Google × MLB Hackathon 2025](https://googlehackathon.devpost.com/).

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Firebase Hosting                       │
│                 React + Vite Frontend                    │
└──────────────────────┬──────────────────────────────────┘
                       │ REST
┌──────────────────────▼──────────────────────────────────┐
│                     Cloud Run                            │
│                   FastAPI Backend                        │
│                                                          │
│  ┌─────────────┐  ┌──────────────────┐  ┌────────────┐  │
│  │  SDV Engine │→ │ Mitigation Engine│→ │ Fairness   │  │
│  │ (synthetic  │  │  4 layers:       │  │ Metrics    │  │
│  │  data gen)  │  │  • Resampling    │  │ DPD/DIR/   │  │
│  └─────────────┘  │  • Feature Dis.  │  │ LCS/REI    │  │
│                   │  • Threshold Adj.│  └─────┬──────┘  │
│                   │  • Adversarial   │        │         │
│                   └──────────────────┘        │         │
│                                               │         │
│  ┌────────────────────────────────────────────▼───────┐ │
│  │                  Google AI Layer                    │ │
│  │  • Gemini 1.5 Flash — constraint parsing           │ │
│  │  • Gemini 1.5 Flash — schema suggestions           │ │
│  │  • Gemini 1.5 Flash — compliance report generation │ │
│  └─────────────────────────────────────────────────── ┘ │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │            Model-Level Fairness Evaluator            │ │
│  │  Trains classifiers on before/after datasets         │ │
│  │  Returns DIR + approval rate by protected group      │ │
│  │  (Upgrade path: Vertex AI AutoML + fairness slicing) │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                Google Cloud Services                     │
│  • Firestore    — experiment session persistence         │
│  • Cloud Storage — dataset exports (upgrade path)       │
│  • Artifact Registry — container images                  │
│  • ADC — keyless auth (no service account JSON)          │
└─────────────────────────────────────────────────────────┘
```

---

## What It Does

### Pipeline

```
Build Schema → Configure Bias → Generate Data → Mitigate → Evaluate → Report
```

1. **Schema Builder** — compose a credit dataset schema: choose protected attributes, financial features, and the `loan_approved` outcome column. Gemini suggests columns based on your use case.
2. **Bias Injection** — SDV `GaussianCopulaSynthesizer` generates a realistic baseline, then a configurable bias engine injects realistic historical lending disparities.
3. **Four Mitigation Layers**:

| Layer | What It Does |
|---|---|
| **Resampling** | Over-represents denied majority-group and approved minority-group applicants to balance the training distribution |
| **Feature Disentanglement** | Removes correlation between protected attributes and credit-relevant features via orthogonal projection |
| **Threshold Adjustment** | Sets group-specific approval thresholds that equalize selection rates across groups |
| **Adversarial Debiasing** | Adds a penalty that reduces the model's ability to predict the protected attribute from credit features |

4. **Data Fairness Metrics** — computed before and after mitigation:

| Metric | Description | Threshold |
|---|---|---|
| **DPD** (≈ SPD) | Approval rate gap between protected groups | < 0.05 = fair |
| **DIR** | Disparate Impact Ratio — min/max approval rate | ≥ 0.8 = EEOC compliant |
| **LCS** (≈ EOD) | Borderline label consistency across groups | > 0.95 = fair |
| **REI** | Representation equity across groups | > 0.9 = fair |
| **OFS** | Overall Fairness Score — weighted composite | ≥ 80 = strong |

5. **Model-Level Fairness** — classifiers trained on before/after datasets using *financial features only* (no protected attributes), revealing proxy bias. Returns DIR and approval rate by protected group per model.

6. **Gemini Compliance Report** — 4-paragraph plain-English report for risk officers:
   - Overall finding
   - Specific metric changes (SPD, DIR, EOD deltas)
   - Remaining concerns
   - Recommendation

7. **Gemini Constraint Parser** — type fairness requirements in plain English:
   > "Ensure approval rates are within 5 percentage points across all racial groups"
   
   Gemini translates this into config deltas that the mitigation engine executes.

---

## Google Cloud Stack

| Service | Role |
|---|---|
| **Gemini 1.5 Flash** | Constraint parsing, schema suggestions, compliance report generation |
| **Cloud Run** | Backend deployment — containerized FastAPI, auto-scales to zero |
| **Firebase Hosting** | Frontend deployment — CDN-backed, SPA rewrite rules |
| **Firestore** | Experiment session persistence — schema, config, metrics, narrative per run |
| **Application Default Credentials** | Keyless auth — no service account JSON required |
| **Vertex AI** | Upgrade path: AutoML tabular training + fairness slicing via `model.evaluate(slicing_specs=[...])` |

### Auth Modes

The backend auto-detects credentials:

| Env Var Set | Mode | Used When |
|---|---|---|
| `GOOGLE_API_KEY` | AI Studio key | Local development |
| `GOOGLE_CLOUD_PROJECT` | Application Default Credentials | Cloud Run / GCP |

On Cloud Run, ADC is automatic — no secrets to manage.

---

## Local Development

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Copy and fill in your API key
cp .env.example .env
# Edit .env: set GOOGLE_API_KEY=your_gemini_key

uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Get a Gemini API key at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`. Backend must be running at `http://localhost:8000`.

### Environment Variables

**Backend (`backend/.env`):**

```bash
# Local dev — AI Studio key
GOOGLE_API_KEY=your_gemini_api_key_here

# GCP deployment — ADC mode (replaces GOOGLE_API_KEY)
# GOOGLE_CLOUD_PROJECT=your-gcp-project-id
# GOOGLE_CLOUD_LOCATION=us-central1
```

---

## Cloud Deployment

### One-shot deploy (Cloud Run + Firebase Hosting)

```bash
# Authenticate
gcloud auth login
gcloud auth application-default login
firebase login

# Enable required APIs
gcloud services enable run.googleapis.com \
  artifactregistry.googleapis.com \
  firestore.googleapis.com \
  --project YOUR_PROJECT_ID

# Deploy backend (Cloud Run) + frontend (Firebase Hosting)
GCP_PROJECT=your-project-id ./deploy.sh
```

The script:
1. Builds and deploys the FastAPI backend to Cloud Run (via `gcloud run deploy --source`)
2. Reads the Cloud Run URL
3. Builds the Vite frontend with `VITE_API_BASE` set to the Cloud Run URL
4. Deploys the frontend to Firebase Hosting

### Manual Cloud Run Deploy

```bash
gcloud run deploy debias-api \
  --source ./backend \
  --project YOUR_PROJECT_ID \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID" \
  --memory 2Gi \
  --cpu 2
```

---

## Project Structure

```
de.bias/
├── backend/
│   ├── main.py              # FastAPI app — all routes
│   ├── gemini_client.py     # Gemini 1.5 Flash — constraint parser, schema advisor, report gen
│   ├── vertex_trainer.py    # Model-level fairness evaluator (sklearn fast-path / Vertex AI upgrade)
│   ├── firestore_client.py  # Session persistence via Firestore + ADC
│   ├── generator.py         # SDV synthetic data generation
│   ├── bias_layers.py       # Four mitigation layers
│   ├── fairness.py          # DPD / DIR / LCS / REI / OFS metrics
│   ├── schemas.py           # Pydantic request/response models
│   ├── Dockerfile           # Cloud Run container
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx                          # Main app shell + state
│   │   ├── components/
│   │   │   ├── VertexPanel.jsx              # Model-level fairness UI
│   │   │   ├── FairnessReport.jsx           # Metrics + Gemini narrative
│   │   │   ├── AIPromptBox.jsx              # Gemini constraint input
│   │   │   ├── SchemaBuilder.jsx            # Column selector + AI suggestions
│   │   │   ├── ConfigPanel.jsx              # Mitigation controls
│   │   │   ├── DistributionCharts.jsx       # Before/after approval charts
│   │   │   └── DownloadPanel.jsx            # CSV / JSON / Sheets export
│   │   └── api/
│   │       ├── generate.js                  # POST /generate
│   │       ├── openai.js                    # Gemini routes (prompt, suggest, health)
│   │       └── export.js                    # Export routes
│   └── firebase.json                        # Firebase Hosting config
├── deploy.sh                # One-shot Cloud Run + Firebase deploy
├── docs/                    # Architecture and phase docs
├── notebooks/               # Jupyter walkthroughs
└── examples/                # Sample outputs
```

---

## API Reference

| Method | Route | Description |
|---|---|---|
| `GET` | `/health` | Gemini connectivity + auth mode |
| `POST` | `/generate` | Generate dataset, run mitigation, get fairness metrics + Gemini narrative |
| `POST` | `/suggest-columns` | Gemini schema column suggestions |
| `POST` | `/prompt` | Gemini fairness constraint → config delta |
| `POST` | `/model/evaluate` | Train before/after classifiers, return model-level DIR |
| `GET` | `/sessions` | List recent experiment sessions (Firestore) |
| `GET` | `/sessions/{id}` | Retrieve a specific session |
| `POST` | `/export/googlesheets` | Push dataset to Google Sheets |
| `POST` | `/export/huggingface` | Push dataset to HuggingFace Hub |

---

## Vertex AI Upgrade Path

The model fairness evaluator currently uses a local sklearn `LogisticRegression` (fast, no billing, <5s response). Swapping to real Vertex AI AutoML + Google's native fairness slicing is a documented drop-in:

```python
# vertex_trainer.py — see generate_fairness_narrative() docstring
model.evaluate(
    slicing_specs=[aiplatform.slices.Slice(spec="race")],
    explanation_specs=[aiplatform.explain.ExplanationSpec()]
)
```

This gives two independent fairness evaluations on the same model — your metrics + Google's official slicing — which is a strong signal of thoroughness.

---

## Built On

| Project | Used For | License |
|---|---|---|
| [SDV](https://github.com/sdv-dev/SDV) | Statistical data generation backbone | Business Source |
| [MOSTLY AI](https://github.com/mostly-ai/mostlyai) | Seed-based conditional generation concept | Apache 2.0 |
| [LLM-Dataset-Builder](https://github.com/dmeldrum6/LLM-Dataset-Builder) | Save/load config + API test UX | MIT |

de.bias's bias mitigation engine, fairness metrics, Gemini integration, model-level fairness evaluator, and compliance report generation are original contributions not present in the above projects.
