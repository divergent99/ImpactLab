import os
import httpx

class JiraClient:
    def __init__(self):
        self.base_url = os.getenv("JIRA_BASE_URL", "").rstrip("/")
        self.auth = (os.getenv("JIRA_EMAIL", ""), os.getenv("JIRA_API_TOKEN", ""))

    async def get_issue(self, issue_key: str) -> dict:
        async with httpx.AsyncClient(auth=self.auth, timeout=20) as client:
            response = await client.get(f"{self.base_url}/rest/api/3/issue/{issue_key}", params={"expand": "names"})
            response.raise_for_status()
            return response.json()

    async def search_issues(self, jql: str, max_results: int = 50) -> dict:
        async with httpx.AsyncClient(auth=self.auth, timeout=20) as client:
            response = await client.get(f"{self.base_url}/rest/api/3/search/jql", params={"jql": jql, "maxResults": max_results})
            response.raise_for_status()
            return response.json()
