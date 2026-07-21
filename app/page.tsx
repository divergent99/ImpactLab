"use client";

import { FormEvent, useMemo, useState } from "react";
import { edges, issues, recommendations, type IssueKey } from "./scenario";

const nodes: Array<{ key: IssueKey; x: number; y: number; root?: boolean }> = [
  { key: "SCRUM-1", x: 44, y: 5 },
  { key: "SCRUM-6", x: 9, y: 29 },
  { key: "SCRUM-2", x: 43, y: 33, root: true },
  { key: "SCRUM-3", x: 75, y: 31 },
  { key: "SCRUM-7", x: 5, y: 68 },
  { key: "SCRUM-4", x: 39, y: 70 },
  { key: "SCRUM-8", x: 56, y: 68 },
  { key: "SCRUM-5", x: 79, y: 68 },
];

const lineLayout = [
  { left: 49, top: 18, width: 18, rotate: 90, kind: "hierarchy" },
  { left: 24, top: 42, width: 22, rotate: 8, kind: "explicit" },
  { left: 57, top: 42, width: 20, rotate: -4, kind: "explicit" },
  { left: 16, top: 58, width: 31, rotate: -31, kind: "explicit" },
  { left: 48, top: 59, width: 18, rotate: 86, kind: "hierarchy" },
  { left: 58, top: 58, width: 17, rotate: 66, kind: "explicit" },
  { left: 80, top: 58, width: 18, rotate: 93, kind: "hierarchy" },
];

export default function Home() {
  const [query, setQuery] = useState("SCRUM-2");
  const [activeRoot, setActiveRoot] = useState<IssueKey>("SCRUM-2");
  const [selected, setSelected] = useState<IssueKey>("SCRUM-2");
  const [depth, setDepth] = useState(2);
  const issue = issues[selected];

  const relatedEdges = useMemo(
    () => edges.filter((edge) => edge.source === selected || edge.target === selected),
    [selected],
  );

  function analyze(event: FormEvent) {
    event.preventDefault();
    const normalized = query.trim().toUpperCase() as IssueKey;
    if (issues[normalized]) {
      setActiveRoot(normalized);
      setSelected(normalized);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brandMark">CI</span>
          <div><strong>Change Impact Lab</strong><small>Evidence before implementation</small></div>
        </div>
        <div className="connection"><span /> Fixture data <b>SCRUM</b></div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">JIRA CHANGE INTELLIGENCE</p>
          <h1>Know what a change could break<br />before the sprint does.</h1>
          <p className="heroCopy">Trace direct and downstream dependencies, inspect the evidence, and leave with a review plan your team can act on.</p>
        </div>
        <form className="searchCard" onSubmit={analyze}>
          <label htmlFor="issue-key">Analyze a Jira work item</label>
          <div className="searchRow">
            <input id="issue-key" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Jira issue key" />
            <button type="submit">Analyze impact <span>→</span></button>
          </div>
          <div className="searchMeta"><span>Try SCRUM-2</span><span>Read-only analysis</span></div>
        </form>
      </section>

      <section className="summaryStrip">
        <div><span>ROOT CHANGE</span><strong>{activeRoot}</strong><small>{issues[activeRoot].summary}</small></div>
        <div><span>AFFECTED WORK</span><strong>7</strong><small>4 direct · 3 transitive</small></div>
        <div><span>RISK SIGNAL</span><strong className="risk">High</strong><small>Customer payment path</small></div>
        <div><span>CONFIDENCE</span><strong>92%</strong><small>5 explicit relationships</small></div>
      </section>

      <section className="workspace">
        <aside className="controls panel">
          <p className="panelLabel">GRAPH CONTROLS</p>
          <label>Traversal depth <b>{depth}</b></label>
          <input type="range" min="1" max="3" value={depth} onChange={(e) => setDepth(Number(e.target.value))} />
          <div className="legend">
            <span><i className="dot rootDot" /> Root change</span>
            <span><i className="dot directDot" /> Direct impact</span>
            <span><i className="dot transitiveDot" /> Transitive impact</span>
          </div>
          <hr />
          <p className="panelLabel">RELATIONSHIPS</p>
          <label className="check"><input type="checkbox" defaultChecked /> Explicit Jira links</label>
          <label className="check"><input type="checkbox" defaultChecked /> Parent / child</label>
          <label className="check"><input type="checkbox" defaultChecked /> Shared labels</label>
          <div className="trustNote"><b>Evidence rule</b><p>No issue appears without a traceable Jira relationship or shared signal.</p></div>
        </aside>

        <section className="graph panel" aria-label="Issue dependency graph">
          <div className="graphHeader"><div><p className="panelLabel">BLAST RADIUS</p><h2>Checkout reliability dependency map</h2></div><span>8 work items · depth {depth}</span></div>
          <div className="graphCanvas">
            {lineLayout.map((line, index) => <i key={index} className={`edge ${line.kind}`} style={{ left: `${line.left}%`, top: `${line.top}%`, width: `${line.width}%`, transform: `rotate(${line.rotate}deg)` }} />)}
            {nodes.map((node) => {
              const current = issues[node.key];
              return <button key={node.key} onClick={() => setSelected(node.key)} className={`issueNode ${node.root ? "rootNode" : ""} ${selected === node.key ? "selectedNode" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%` }}>
                <span className={`typeIcon ${current.type.toLowerCase()}`}>{current.type[0]}</span>
                <span><b>{node.key}</b><small>{current.summary}</small></span>
                {current.priority === "Highest" && <em>!</em>}
              </button>;
            })}
          </div>
          <div className="graphFooter"><span><i className="solidLine" /> Explicit relationship</span><span><i className="dashedLine" /> Inferred signal</span><span>Click any work item for evidence</span></div>
        </section>

        <aside className="evidence panel">
          <p className="panelLabel">EVIDENCE</p>
          <div className="issueHeading"><span className={`typeIcon ${issue.type.toLowerCase()}`}>{issue.type[0]}</span><div><b>{selected}</b><h3>{issue.summary}</h3></div></div>
          <div className="badges"><span>{issue.status}</span><span className={issue.priority === "Highest" ? "danger" : ""}>{issue.priority}</span></div>
          <p className="description">{issue.description}</p>
          <p className="panelLabel">WHY IT APPEARS</p>
          <div className="evidenceList">
            {relatedEdges.length ? relatedEdges.map((edge, i) => <div key={i}><i>{edge.explicit ? "✓" : "≈"}</i><p><b>{edge.label}</b><span>{edge.evidence}</span></p><em>{Math.round(edge.confidence * 100)}%</em></div>) : <div><i>◎</i><p><b>Analysis root</b><span>Selected by the user for impact traversal.</span></p><em>100%</em></div>}
          </div>
          <a className="jiraLink" href={`https://abhineetsharma77.atlassian.net/browse/${selected}`} target="_blank" rel="noreferrer">Open {selected} in Jira ↗</a>
        </aside>
      </section>

      <section className="review panel">
        <div className="reviewIntro"><p className="panelLabel">REVIEW PLAN</p><h2>Four actions before implementation</h2><p>Generated from visible relationships only. No autonomous changes.</p></div>
        <div className="actions">{recommendations.map((item, index) => <article key={item.title}><span>0{index + 1}</span><div><b>{item.title}</b><p>{item.detail}</p></div><em>{item.team}</em></article>)}</div>
      </section>
      <footer>Fixture-backed MVP · Last analyzed just now <span>Change Impact Lab does not modify Jira data.</span></footer>
    </main>
  );
}
