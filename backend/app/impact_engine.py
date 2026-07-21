from collections import deque
from .fixtures import EDGES, ISSUES
from .models import ImpactResponse

def analyze_impact(root: str, depth: int = 2) -> ImpactResponse:
    root = root.upper()
    if root not in ISSUES:
        raise KeyError(root)
    visited = {root}
    queue = deque([(root, 0)])
    selected_edges = []
    while queue:
        current, level = queue.popleft()
        if level >= depth:
            continue
        for relationship in EDGES:
            if current not in (relationship.source, relationship.target):
                continue
            neighbor = relationship.target if relationship.source == current else relationship.source
            if relationship not in selected_edges:
                selected_edges.append(relationship)
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, level + 1))
    return ImpactResponse(root_issue=root, depth=depth, nodes=[ISSUES[key] for key in sorted(visited)], edges=selected_edges, recommendations=["Review the idempotency contract.", "Test delayed and concurrent retries.", "Coordinate the webhook migration.", "Use SCRUM-8 as a release-blocking regression scenario."])
