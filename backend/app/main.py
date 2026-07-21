import json
import os
import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from .impact_engine import analyze_impact
from .models import ChatRequest, ImpactResponse
from .jira_client import JiraClient

app = FastAPI(title="Change Impact Lab API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"], allow_methods=["GET", "POST"], allow_headers=["*"])
jira = JiraClient()

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "jira_mode": "live" if jira.configured else "fixture", "chat_mode": "openai" if os.getenv("OPENAI_API_KEY") else "unconfigured"}

@app.get("/api/projects")
async def projects() -> dict:
    if not jira.configured:
        return {"mode": "fixture", "projects": [{"key": "SCRUM", "name": "Checkout Reliability Demo"}]}
    payload = await jira.list_projects()
    return {"mode": "live", "projects": [{"key": item["key"], "name": item["name"]} for item in payload.get("values", [])]}

@app.get("/api/issues/{issue_key}/impact", response_model=ImpactResponse)
def issue_impact(issue_key: str, depth: int = Query(default=2, ge=1, le=3)) -> ImpactResponse:
    try:
        return analyze_impact(issue_key, depth)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown fixture issue: {issue_key}")

def chat_context(request: ChatRequest) -> str:
    impact = analyze_impact(request.root_issue, request.depth)
    return impact.model_dump_json(indent=2)

@app.post("/api/chat")
async def chat(request: ChatRequest) -> StreamingResponse:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="Model chat is not configured. Add OPENAI_API_KEY to backend/.env.")

    prompt = f"""You are the read-only Change Impact Lab analyst.
Answer only from the supplied Jira impact context. Cite every material claim inline
with issue keys in square brackets, such as [SCRUM-2]. If the evidence is insufficient,
say so. Never imply that you changed Jira.

Impact context:
{chat_context(request)}

Selected issue: {request.selected_issue or request.root_issue}
Question: {request.question}
"""
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            "https://api.openai.com/v1/responses",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"model": os.getenv("OPENAI_MODEL", "gpt-5.6-terra"), "input": prompt, "reasoning": {"effort": "low"}, "text": {"verbosity": "low"}},
        )
    if response.is_error:
        raise HTTPException(status_code=502, detail="The model request failed. Check the API key and model access.")
    payload = response.json()
    answer = payload.get("output_text") or next((part.get("text", "") for item in payload.get("output", []) for part in item.get("content", []) if part.get("type") == "output_text"), "")

    async def events():
        yield f"data: {json.dumps({'type': 'meta', 'model': os.getenv('OPENAI_MODEL', 'gpt-5.6-terra')})}\n\n"
        for word in answer.split():
            yield f"data: {json.dumps({'type': 'delta', 'text': word + ' '})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(events(), media_type="text/event-stream")
