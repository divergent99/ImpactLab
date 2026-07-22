"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { edges, issues, recommendations, type IssueKey } from "./scenario";

type GraphIssue = (typeof issues)[IssueKey];
type GraphEdge = { source: IssueKey; target: IssueKey; label: string; evidence: string; confidence: number; explicit: boolean };

const nodes: Array<{ key: IssueKey; x: number; y: number; root?: boolean }> = [
  { key: "SCRUM-1", x: 50, y: 10 },
  { key: "SCRUM-6", x: 19, y: 35 },
  { key: "SCRUM-2", x: 50, y: 35, root: true },
  { key: "SCRUM-3", x: 80, y: 58 },
  { key: "SCRUM-4", x: 42, y: 62 },
  { key: "SCRUM-8", x: 61, y: 80 },
  { key: "SCRUM-7", x: 19, y: 82 },
  { key: "SCRUM-5", x: 81, y: 88 },
];

const nodePositions = Object.fromEntries(nodes.map((node) => [node.key, node])) as Record<IssueKey, (typeof nodes)[number]>;

function connectorPath(source: IssueKey, target: IssueKey) {
  const from = nodePositions[source];
  const to = nodePositions[target];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(Math.hypot(dx, dy), 1);
  const xOffset = (dx / length) * 10;
  const yOffset = (dy / length) * 6;
  const sx = from.x + xOffset;
  const sy = from.y + yOffset;
  const tx = to.x - xOffset;
  const ty = to.y - yOffset;
  const midY = sy + (ty - sy) / 2;
  return `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`;
}

function keysWithinDepth(root: IssueKey, depth: number, graphEdges: GraphEdge[]) {
  const visited = new Set<IssueKey>([root]);
  const queue: Array<[IssueKey, number]> = [[root, 0]];
  while (queue.length) {
    const [current, level] = queue.shift()!;
    if (level >= depth) continue;
    graphEdges.forEach((edge) => {
      if (edge.source !== current && edge.target !== current) return;
      const neighbor = (edge.source === current ? edge.target : edge.source) as IssueKey;
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([neighbor, level + 1]);
      }
    });
  }
  return visited;
}

export default function Home() {
  const [query, setQuery] = useState("SCRUM-2");
  const [activeRoot, setActiveRoot] = useState<IssueKey>("SCRUM-2");
  const [selected, setSelected] = useState<IssueKey>("SCRUM-2");
  const [depth, setDepth] = useState(2);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatReady, setChatReady] = useState<boolean | null>(null);
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [issueData, setIssueData] = useState<Record<IssueKey, GraphIssue>>(issues);
  const [edgeData, setEdgeData] = useState<GraphEdge[]>(edges.map((edge) => ({ ...edge })));
  const [jiraMode, setJiraMode] = useState<"loading" | "live" | "fixture">("loading");
  const [showExplicit, setShowExplicit] = useState(true);
  const [showParentChild, setShowParentChild] = useState(true);
  const [showShared, setShowShared] = useState(true);
  const [chat, setChat] = useState<Array<{ role: "user" | "assistant"; text: string }>>([
    { role: "assistant", text: "Ask about risk, ownership, dependencies, or why an issue appears. I’ll answer from the visible Jira evidence." },
  ]);
  const issue = issueData[selected];
  const filteredEdges = useMemo(() => edgeData.filter((edge) => {
    if (edge.label === "Parent / child") return showParentChild;
    if (edge.explicit) return showExplicit;
    return showShared;
  }), [edgeData, showExplicit, showParentChild, showShared]);
  const visibleKeys = useMemo(() => keysWithinDepth(activeRoot, depth, filteredEdges), [activeRoot, depth, filteredEdges]);
  const visibleNodes = useMemo(() => nodes.filter((node) => visibleKeys.has(node.key)), [visibleKeys]);
  const visibleEdges = useMemo(() => filteredEdges.filter((edge) => visibleKeys.has(edge.source) && visibleKeys.has(edge.target)), [visibleKeys, filteredEdges]);
  const blockingLinks = useMemo(() => visibleEdges.filter((edge) => edge.label.toLowerCase().includes("block")).length, [visibleEdges]);
  const childWork = useMemo(() => visibleNodes.filter((node) => issueData[node.key].type === "Subtask").length, [visibleNodes, issueData]);
  const elevatedRisk = useMemo(() => visibleNodes.filter((node) => ["High", "Highest"].includes(issueData[node.key].priority)).length, [visibleNodes, issueData]);

  const relatedEdges = useMemo(
    () => filteredEdges.filter((edge) => edge.source === selected || edge.target === selected),
    [selected, filteredEdges],
  );

  useEffect(() => {
    Promise.all([
      fetch("/api/chat").then((response) => response.json()),
      fetch("/api/jira/graph?project=SCRUM").then(async (response) => {
        if (!response.ok) throw new Error("Jira unavailable");
        return response.json();
      }),
    ]).then(([chatStatus, graph]) => {
      setChatReady(Boolean(chatStatus.configured));
      setIssueData(graph.issues);
      setEdgeData(graph.edges);
      setJiraMode("live");
    }).catch(() => {
      fetch("/api/chat").then((response) => response.json()).then((status) => setChatReady(Boolean(status.configured))).catch(() => setChatReady(false));
      setJiraMode("fixture");
    });
  }, []);

  async function analyze(event: FormEvent) {
    event.preventDefault();
    setAnalysisBusy(true);
    setAnalysisError("");
    const normalized = query.trim().toUpperCase() as IssueKey;
    if (issueData[normalized]) {
      await new Promise((resolve) => setTimeout(resolve, 180));
      setActiveRoot(normalized);
      setSelected(normalized);
    } else {
      setAnalysisError("Choose a valid work item.");
    }
    setAnalysisBusy(false);
  }

  async function askData(event: FormEvent) {
    event.preventDefault();
    const question = chatInput.trim();
    if (!question || chatBusy) return;
    const priorChat = chat;
    setChat((messages) => [...messages, { role: "user", text: question }, { role: "assistant", text: "" }]);
    setChatInput("");
    setChatBusy(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, root_issue: activeRoot, selected_issue: selected, depth, context: { root: activeRoot, issues: visibleNodes.map((node) => ({ key: node.key, ...issueData[node.key] })), relationships: visibleEdges }, history: priorChat.slice(-6).map((message) => ({ role: message.role, content: message.text })) }),
      });
      if (!response.ok || !response.body) {
        const error = await response.json().catch(() => ({ detail: "Chat backend is unavailable." }));
        throw new Error(error.detail || "Chat backend is unavailable.");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let answer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";
        for (const chunk of chunks) {
          const line = chunk.split("\n").find((item) => item.startsWith("data: "));
          if (!line) continue;
          const event = JSON.parse(line.slice(6));
          if (event.type === "delta") {
            answer += event.text;
            setChat((messages) => messages.map((message, index) => index === messages.length - 1 ? { ...message, text: answer } : message));
          }
        }
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Chat backend is unavailable.";
      setChat((messages) => messages.map((message, index) => index === messages.length - 1 ? { role: "assistant", text: `Chat request failed: ${detail}` } : message));
    } finally {
      setChatBusy(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><span className="brandMark">CI</span><div><strong>Change Impact Lab</strong><small>Evidence before implementation</small></div></div>
        <div className={`connection demoBadge ${jiraMode === "live" ? "liveBadge" : ""}`}><span /> {jiraMode === "loading" ? "CONNECTING" : jiraMode === "live" ? "JIRA CONNECTED" : "DEMO DATA"} <b>{jiraMode === "live" ? "SCRUM" : jiraMode === "loading" ? "…" : "NOT LIVE"}</b></div>
      </header>

      <section className="hero">
        <div><p className="eyebrow">JIRA CHANGE INTELLIGENCE</p><h1>Know what a change could break<br />before the sprint does.</h1><p className="heroCopy">Trace direct and downstream dependencies, inspect the evidence, and leave with a review plan your team can act on.</p></div>
        <form className="searchCard" onSubmit={analyze}>
          <div className="commandHeading"><label htmlFor="issue-key">Analyze impact</label><span><i /> Read-only</span></div>
          <div className="commandBar">
            <label className="commandField"><span>Project</span><select aria-label="Jira project" defaultValue="SCRUM"><option>SCRUM</option></select></label>
            <label className="commandField issueKeyField"><span>Issue</span><select id="issue-key" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Jira issue key">{Object.keys(issueData).map((key) => <option key={key}>{key}</option>)}</select></label>
            <div className="issueContext"><span>Selected work item</span><b>{issueData[query as IssueKey]?.summary}</b></div>
            <button className="analyzeButton" type="submit" disabled={analysisBusy}>{analysisBusy ? "Analyzing…" : <>Analyze <span>→</span></>}</button>
          </div>
          <div className="searchMeta"><span>{analysisError || `${Object.keys(issueData).length} work items · ${jiraMode === "live" ? "live Jira" : "fixture fallback"}`}</span><span>Depth {depth} · read-only</span></div>
        </form>
      </section>

      <section className="summaryStrip">
        <div><span>ROOT CHANGE</span><strong>{activeRoot}</strong><small>{issueData[activeRoot].summary}</small><div className="badges rootBadges"><span>{issueData[activeRoot].status}</span><span className={issueData[activeRoot].priority === "Highest" ? "danger" : ""}>{issueData[activeRoot].priority}</span></div><p className="rootDescription">{issueData[activeRoot].description}</p></div>
        <div><span>AFFECTED WORK</span><strong>{Math.max(visibleNodes.length - 1, 0)}</strong><small>{visibleEdges.length} visible relationships</small></div>
        <div><span>BLOCKING LINKS</span><strong>{blockingLinks}</strong><small>Explicit dependency blockers</small></div>
        <div><span>ELEVATED RISK</span><strong className="risk">{elevatedRisk}</strong><small>High or highest priority</small></div>
        <div><span>CHILD WORK</span><strong>{childWork}</strong><small>Implementation subtasks</small></div>
        <div><span>RISK SIGNAL</span><strong className="risk">{issueData[activeRoot].priority}</strong><small>Derived from selected root</small></div>
        <div><span>CONFIDENCE</span><strong>{Math.round((visibleEdges.reduce((sum, edge) => sum + edge.confidence, 0) / Math.max(visibleEdges.length, 1)) * 100)}%</strong><small>{visibleEdges.filter((edge) => edge.explicit).length} explicit relationships</small></div>
      </section>

      <section className="workspace">
        <aside className="controls panel">
          <p className="panelLabel">GRAPH CONTROLS</p><label>Traversal depth <b>{depth}</b></label><input type="range" min="1" max="3" value={depth} onChange={(e) => setDepth(Number(e.target.value))} />
          <div className="legend"><span><i className="dot rootDot" /> Root change</span><span><i className="dot directDot" /> Direct impact</span><span><i className="dot transitiveDot" /> Transitive impact</span></div><hr />
          <p className="panelLabel">RELATIONSHIPS</p><label className="check"><input type="checkbox" checked={showExplicit} onChange={(e) => setShowExplicit(e.target.checked)} /> Explicit Jira links</label><label className="check"><input type="checkbox" checked={showParentChild} onChange={(e) => setShowParentChild(e.target.checked)} /> Parent / child</label><label className="check"><input type="checkbox" checked={showShared} onChange={(e) => setShowShared(e.target.checked)} /> Shared labels</label>
          <div className="trustNote"><b>Evidence rule</b><p>No issue appears without a traceable Jira relationship or shared signal.</p></div>
        </aside>

        <section className="graph panel" aria-label="Issue dependency graph">
          <div className="graphHeader"><div><p className="panelLabel">BLAST RADIUS</p><h2>{activeRoot} dependency map</h2></div><span>{visibleNodes.length} work items · depth {depth}</span></div>
          <div className="graphCanvas">
            <svg className="edgeLayer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <defs><marker id="arrowhead" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" /></marker></defs>
              {visibleEdges.map((edge) => <path key={`${edge.source}-${edge.target}`} className={edge.explicit ? "edgePath" : "edgePath inferred"} d={connectorPath(edge.source, edge.target)} />)}
            </svg>
            {visibleEdges.map((edge) => {
              const from = nodePositions[edge.source];
              const to = nodePositions[edge.target];
              const relationship = edge.label === "Explicit Jira link" ? "linked to" : edge.label === "Parent / child" ? "parent of" : edge.label.toLowerCase();
              return <span key={`label-${edge.source}-${edge.target}`} className="edgeLabel" style={{ left: `${(from.x + to.x) / 2}%`, top: `${(from.y + to.y) / 2}%` }}>{relationship}</span>;
            })}
            {visibleNodes.map((node) => {
              const current = issueData[node.key];
              return <button key={node.key} onClick={() => setSelected(node.key)} className={`issueNode ${node.key === activeRoot ? "rootNode" : ""} ${selected === node.key ? "selectedNode" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%` }}><span className={`typeIcon ${current.type.toLowerCase()}`}>{current.type[0]}</span><span><b>{node.key}</b><small>{current.summary}</small></span>{current.priority === "Highest" && <em>!</em>}</button>;
            })}
          </div>
          <div className="graphFooter"><span><i className="solidLine" /> Explicit relationship</span><span><i className="dashedLine" /> Inferred signal</span><span>Click any work item for evidence</span></div>
        </section>

        <aside className="evidence panel">
          <p className="panelLabel">EVIDENCE</p><div className="issueHeading"><span className={`typeIcon ${issue.type.toLowerCase()}`}>{issue.type[0]}</span><div><b>{selected}</b><h3>{issue.summary}</h3></div></div>
          <div className="badges"><span>{issue.status}</span><span className={issue.priority === "Highest" ? "danger" : ""}>{issue.priority}</span></div><p className="description">{issue.description}</p><p className="panelLabel">WHY IT APPEARS</p>
          <div className="evidenceList">{relatedEdges.length ? relatedEdges.map((edge, i) => <div key={i}><i>{edge.explicit ? "✓" : "≈"}</i><p><b>{edge.label}</b><span>{edge.evidence}</span></p><em>{Math.round(edge.confidence * 100)}%</em></div>) : <div><i>◎</i><p><b>Analysis root</b><span>Selected by the user for impact traversal.</span></p><em>100%</em></div>}</div>
          <a className="jiraLink" href={`https://abhineetsharma77.atlassian.net/browse/${selected}`} target="_blank" rel="noreferrer">Open {selected} in Jira ↗</a>
        </aside>
      </section>

      <section className="chatPanel panel">
        <div className="chatIntro"><p className="panelLabel">ASK YOUR JIRA DATA</p><h2>Talk to the impact map</h2><p>Answers stay grounded in the issues, links, and evidence currently in view.</p><div className="promptChips"><button onClick={() => setChatInput("What could block this change?")}>What could block this?</button><button onClick={() => setChatInput("Which teams should review this?")}>Who should review?</button></div></div>
        <div className="chatBody"><div className="messages">{chat.map((message, index) => <div key={index} className={`message ${message.role}`}><span>{message.role === "assistant" ? "CI" : "You"}</span><p>{message.text || <span className="typingDots" role="status" aria-label="Change Impact Lab is thinking"><i /><i /><i /></span>}</p></div>)}</div><form className="chatComposer" onSubmit={askData}><input aria-label="Ask your Jira data" placeholder={chatReady ? "Ask about risk, dependencies, or ownership…" : "Add OPENAI_API_KEY to enable chat"} value={chatInput} disabled={!chatReady} onChange={(event) => setChatInput(event.target.value)} /><button type="submit" disabled={chatBusy || !chatReady}>{chatBusy ? "Thinking…" : chatReady ? "Ask →" : "Not configured"}</button></form><small className={chatReady ? "chatStatus ready" : "chatStatus"}>{chatReady === null ? "Checking model connection…" : chatReady ? "Model connected · evidence-only · citations required" : "Chat disabled · configure OPENAI_API_KEY before publishing"}</small></div>
      </section>

      <section className="review panel"><div className="reviewIntro"><p className="panelLabel">REVIEW PLAN</p><h2>Four actions before implementation</h2><p>Generated from visible relationships only. No autonomous changes.</p></div><div className="actions">{recommendations.map((item, index) => <article key={item.title}><span>0{index + 1}</span><div><b>{item.title}</b><p>{item.detail}</p></div><em>{item.team}</em></article>)}</div></section>
      <footer>Live-ready v2 · Fixture mode until Jira credentials are added <span>Change Impact Lab does not modify Jira data.</span></footer>
    </main>
  );
}
