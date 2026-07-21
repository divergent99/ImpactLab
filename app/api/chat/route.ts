import { edges, issues, type IssueKey } from "../../scenario";

type ChatPayload = {
  question: string;
  root_issue: IssueKey;
  selected_issue?: IssueKey;
  depth?: number;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  context?: unknown;
};

function graphContext(root: IssueKey, depth: number) {
  const visited = new Set<IssueKey>([root]);
  const queue: Array<[IssueKey, number]> = [[root, 0]];
  while (queue.length) {
    const [current, level] = queue.shift()!;
    if (level >= depth) continue;
    edges.forEach((edge) => {
      if (edge.source !== current && edge.target !== current) return;
      const neighbor = (edge.source === current ? edge.target : edge.source) as IssueKey;
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([neighbor, level + 1]);
      }
    });
  }
  return {
    root,
    issues: [...visited].map((key) => ({ key, ...issues[key] })),
    relationships: edges.filter((edge) => visited.has(edge.source) && visited.has(edge.target)),
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ detail: "Add OPENAI_API_KEY to .env.local, then restart localhost." }, { status: 503 });
  }

  const payload = await request.json() as ChatPayload;
  if (!payload.question?.trim() || !issues[payload.root_issue]) {
    return Response.json({ detail: "A valid question and Jira root issue are required." }, { status: 400 });
  }

  const context = payload.context || graphContext(payload.root_issue, payload.depth ?? 2);
  const prompt = `You are the read-only Change Impact Lab analyst.
Answer only from the supplied Jira impact context. Cite every material claim inline
with issue keys in square brackets, for example [SCRUM-2]. If evidence is insufficient,
say so. Never claim to have changed Jira. Keep the response concise and actionable.

Impact context:
${JSON.stringify(context)}

Selected issue: ${payload.selected_issue || payload.root_issue}
Question: ${payload.question}`;

  const openAIResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.6-terra",
      input: prompt,
      reasoning: { effort: "low" },
      text: { verbosity: "low" },
    }),
  });

  if (!openAIResponse.ok) {
    return Response.json({ detail: "The model request failed. Check the API key and model access." }, { status: 502 });
  }

  const result = await openAIResponse.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  const answer = result.output_text || result.output?.flatMap((item) => item.content || []).find((part) => part.type === "output_text")?.text || "The model returned no answer.";
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "meta", model: process.env.OPENAI_MODEL || "gpt-5.6-terra" })}\n\n`));
      answer.split(" ").forEach((word) => controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "delta", text: word + " " })}\n\n`)));
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
}

export function GET() {
  return Response.json({ configured: Boolean(process.env.OPENAI_API_KEY), model: process.env.OPENAI_MODEL || "gpt-5.6-terra" });
}
