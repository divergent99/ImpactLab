# Change Impact Lab

Evidence-backed Jira blast-radius analysis. This MVP uses deterministic fixtures matching the `SCRUM-1` through `SCRUM-8` scenario, so graph traversal is testable before credentials are introduced.

## Run the interface

```powershell
npm install
npm run dev
```

## Run the API

```powershell
python -m venv .venv
.venv\Scripts\pip install -r backend\requirements.txt
.venv\Scripts\uvicorn backend.app.main:app --reload --port 8000
```

Enter `SCRUM-2` and select **Analyze impact**. Copy `.env.example` to `.env` only when you are ready to connect the live Jira account. Never commit `.env`.
