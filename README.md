# FairGen

FairGen is an open-source web application for generating synthetic credit datasets with configurable bias mitigation layers and fairness reporting.

Generate synthetic credit data. Remove bias. Build fairer AI.

## What It Does

- Generates synthetic credit applicant data for lending-model experiments
- Applies four fairness-oriented bias mitigation layers
- Computes before/after fairness metrics and an overall fairness score
- Lets users explore datasets through tables, charts, and plain-English reports
- Supports AI-assisted fairness constraints through `gpt-4o-mini`
- Exports CSV, fairness report JSON, and HuggingFace datasets

## Current Status

This repository is being built in phases. The backend foundation and the main frontend shell are implemented, and the remaining work is focused on polish, stronger demo behavior, and production hardening.

See:

- [Project Brief](./docs/PROJECT_BRIEF.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Implementation Status](./docs/IMPLEMENTATION_STATUS.md)
- [Phase 1](./docs/phases/PHASE_1_FOUNDATION.md)
- [Phase 2](./docs/phases/PHASE_2_BACKEND_PIPELINE.md)
- [Phase 3](./docs/phases/PHASE_3_FRONTEND_SHELL.md)
- [Phase 4](./docs/phases/PHASE_4_EXPERIENCE_EXPORTS.md)
- [Phase 5](./docs/phases/PHASE_5_DEMO_POLISH_RELEASE.md)

## Stack

- Frontend: React, Vite, Tailwind CSS, Recharts
- Backend: FastAPI, pandas, NumPy
- Synthetic data backbone: SDV `GaussianCopulaSynthesizer`
- AI layer: OpenAI `gpt-4o-mini`
- Export: CSV, JSON, HuggingFace Hub

## Local Development

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Environment Variables

Backend:

```bash
export OPENAI_API_KEY=your_key_here
```

Optional for HuggingFace export at runtime:

- supply token and repo name in the UI

## Structure

```
fairgen/
├── frontend/     # React + Vite app
├── backend/      # FastAPI backend
├── docs/         # Architecture and phase docs
├── notebooks/    # Jupyter walkthroughs
└── examples/     # Sample outputs
```

## Built On / Inspired By

| Project | Used For | License |
|---|---|---|
| [SDV](https://github.com/sdv-dev/SDV) | Statistical data generation backbone | Business Source |
| [MOSTLY AI](https://github.com/mostly-ai/mostlyai) | Seed-based conditional generation concept | Apache 2.0 |
| [LLM-Dataset-Builder](https://github.com/dmeldrum6/LLM-Dataset-Builder) | Save/load config + API test UX | MIT |

FairGen's bias mitigation engine, fairness metrics, GPT-4o mini integration, and visual fairness reporting are original contributions not present in the above projects.
