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
