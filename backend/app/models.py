from typing import Literal
from pydantic import BaseModel, Field

class Issue(BaseModel):
    key: str
    summary: str
    issue_type: Literal["Task", "Subtask"]
    status: str = "To Do"
    priority: str = "Medium"
    description: str

class Evidence(BaseModel):
    label: str
    detail: str

class ImpactEdge(BaseModel):
    source: str
    target: str
    relationship: str
    confidence: float = Field(ge=0, le=1)
    explicit: bool
    evidence: list[Evidence]

class ImpactResponse(BaseModel):
    root_issue: str
    depth: int
    nodes: list[Issue]
    edges: list[ImpactEdge]
    recommendations: list[str]
    warnings: list[str] = []

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str

class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    root_issue: str
    depth: int = Field(default=2, ge=1, le=3)
    selected_issue: str | None = None
    history: list[ChatMessage] = []
