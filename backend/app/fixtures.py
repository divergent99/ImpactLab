from .models import Evidence, ImpactEdge, Issue

ISSUES = {
    "SCRUM-1": Issue(key="SCRUM-1", summary="Checkout Reliability Upgrade", issue_type="Task", description="Umbrella reliability initiative."),
    "SCRUM-2": Issue(key="SCRUM-2", summary="Add idempotency protection to Payment API", issue_type="Task", priority="High", description="Prevents duplicate customer charges."),
    "SCRUM-3": Issue(key="SCRUM-3", summary="Update checkout retry behavior", issue_type="Task", description="Reuses idempotency keys across retries."),
    "SCRUM-4": Issue(key="SCRUM-4", summary="Persist idempotency keys", issue_type="Subtask", description="Atomically stores canonical payment results."),
    "SCRUM-5": Issue(key="SCRUM-5", summary="Add duplicate-payment regression tests", issue_type="Subtask", description="Tests retries and webhook replays."),
    "SCRUM-6": Issue(key="SCRUM-6", summary="Update payment webhook contract", issue_type="Task", description="Versions payment webhook events."),
    "SCRUM-7": Issue(key="SCRUM-7", summary="Migrate fraud service webhook consumer", issue_type="Task", description="Migrates the fraud consumer safely."),
    "SCRUM-8": Issue(key="SCRUM-8", summary="Duplicate charge occurs after checkout retry", issue_type="Task", priority="Highest", description="Customer-facing incident evidence."),
}

def edge(source: str, target: str, relationship: str, detail: str) -> ImpactEdge:
    return ImpactEdge(source=source, target=target, relationship=relationship, confidence=1, explicit=True, evidence=[Evidence(label="Jira relationship", detail=detail)])

EDGES = [
    edge("SCRUM-1", "SCRUM-2", "initiative", "SCRUM-2 contributes to the checkout reliability initiative."),
    edge("SCRUM-6", "SCRUM-2", "blocks", "The webhook contract blocks the Payment API change."),
    edge("SCRUM-2", "SCRUM-3", "linked", "The Payment API and checkout retry behavior are linked."),
    edge("SCRUM-2", "SCRUM-4", "parent", "SCRUM-4 is a child of SCRUM-2."),
    edge("SCRUM-3", "SCRUM-5", "parent", "SCRUM-5 is a child of SCRUM-3."),
    edge("SCRUM-6", "SCRUM-7", "blocks", "The contract blocks the fraud consumer migration."),
    edge("SCRUM-2", "SCRUM-8", "incident", "The incident is blocked by the idempotency fix."),
]
