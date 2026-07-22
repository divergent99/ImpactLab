function adfText(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const node = value as { text?: string; content?: unknown[] };
  return [node.text || "", ...(node.content || []).map(adfText)].join(" ").replace(/\s+/g, " ").trim();
}

export async function GET(request: Request) {
  const baseUrl = process.env.JIRA_BASE_URL?.replace(/\/$/, "");
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  if (!baseUrl || !email || !token) {
    return Response.json({ configured: false, detail: "Jira credentials are not configured." }, { status: 503 });
  }

  const project = new URL(request.url).searchParams.get("project") || "SCRUM";
  if (!/^[A-Z][A-Z0-9_\-]{1,19}$/.test(project)) {
    return Response.json({ detail: "Invalid Jira project key." }, { status: 400 });
  }
  const fields = "summary,status,priority,issuetype,issuelinks,parent,subtasks,description,labels";
  const url = `${baseUrl}/rest/api/3/search/jql?jql=${encodeURIComponent(`project = ${project} ORDER BY key`)}&maxResults=50&fields=${fields}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${btoa(`${email}:${token}`)}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    return Response.json({ detail: `Jira returned HTTP ${response.status}.` }, { status: 502 });
  }

  const payload = await response.json() as { issues?: Array<any> };
  const jiraIssues = payload.issues || [];
  const nodes = Object.fromEntries(jiraIssues.map((issue) => [issue.key, {
    summary: issue.fields.summary,
    type: issue.fields.issuetype?.name === "Subtask" || issue.fields.issuetype?.subtask ? "Subtask" : "Task",
    status: issue.fields.status?.name || "Unknown",
    priority: issue.fields.priority?.name || "None",
    description: adfText(issue.fields.description) || "No Jira description provided.",
  }]));

  const edgeMap = new Map<string, any>();
  jiraIssues.forEach((issue) => {
    (issue.fields.issuelinks || []).forEach((link: any) => {
      const other = link.outwardIssue || link.inwardIssue;
      if (!other || !nodes[other.key]) return;
      const source = link.outwardIssue ? issue.key : other.key;
      const target = link.outwardIssue ? other.key : issue.key;
      const id = [source, target].sort().join("::");
      const label = link.outwardIssue ? link.type?.outward : link.type?.inward;
      edgeMap.set(id, { source, target, label: label || link.type?.name || "linked to", evidence: `Explicit Jira relationship: ${issue.key} ${label || "links to"} ${other.key}.`, confidence: 1, explicit: true });
    });
    const parent = issue.fields.parent?.key;
    if (parent && nodes[parent]) {
      edgeMap.set(`${parent}::${issue.key}`, { source: parent, target: issue.key, label: "Parent / child", evidence: `${issue.key} is a child of ${parent} in Jira.`, confidence: 1, explicit: true });
    }
  });

  const labelIndex = new Map<string, string[]>();
  jiraIssues.forEach((issue) => {
    (issue.fields.labels || []).forEach((label: string) => {
      labelIndex.set(label, [...(labelIndex.get(label) || []), issue.key]);
    });
  });
  labelIndex.forEach((keys, label) => {
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const id = [keys[i], keys[j]].sort().join("::");
        if (edgeMap.has(id)) continue;
        edgeMap.set(id, { source: keys[i], target: keys[j], label: "Shared label", evidence: `${keys[i]} and ${keys[j]} are both tagged "${label}" in Jira.`, confidence: 0.6, explicit: false });
      }
    }
  });

  return Response.json({ configured: true, mode: "live", project, siteUrl: baseUrl, issues: nodes, edges: [...edgeMap.values()] });
}
