from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from .impact_engine import analyze_impact
from .models import ImpactResponse

app = FastAPI(title="Change Impact Lab API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"], allow_methods=["GET"], allow_headers=["*"])

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "mode": "fixture"}

@app.get("/api/issues/{issue_key}/impact", response_model=ImpactResponse)
def issue_impact(issue_key: str, depth: int = Query(default=2, ge=1, le=3)) -> ImpactResponse:
    try:
        return analyze_impact(issue_key, depth)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown fixture issue: {issue_key}")
