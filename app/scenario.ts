export type IssueKey = "SCRUM-1" | "SCRUM-2" | "SCRUM-3" | "SCRUM-4" | "SCRUM-5" | "SCRUM-6" | "SCRUM-7" | "SCRUM-8";

export const issues: Record<IssueKey, { summary: string; type: "Task" | "Subtask"; status: string; priority: string; description: string }> = {
  "SCRUM-1": { summary: "Checkout Reliability Upgrade", type: "Task", status: "To Do", priority: "Medium", description: "Umbrella initiative for payment, checkout, webhook, fraud, and test reliability work." },
  "SCRUM-2": { summary: "Add idempotency protection to Payment API", type: "Task", status: "To Do", priority: "High", description: "Prevents repeated payment requests from creating duplicate customer charges." },
  "SCRUM-3": { summary: "Update checkout retry behavior", type: "Task", status: "To Do", priority: "Medium", description: "Reuses the original idempotency key across checkout retries and delayed responses." },
  "SCRUM-4": { summary: "Persist idempotency keys", type: "Subtask", status: "To Do", priority: "Medium", description: "Stores idempotency keys and canonical payment results atomically for 24 hours." },
  "SCRUM-5": { summary: "Add duplicate-payment regression tests", type: "Subtask", status: "To Do", priority: "Medium", description: "Covers concurrent retries, webhook replays, and duplicate customer actions." },
  "SCRUM-6": { summary: "Update payment webhook contract", type: "Task", status: "To Do", priority: "Medium", description: "Versions payment webhook events while preserving downstream compatibility." },
  "SCRUM-7": { summary: "Migrate fraud service webhook consumer", type: "Task", status: "To Do", priority: "Medium", description: "Moves fraud detection onto the versioned webhook schema without losing replay safety." },
  "SCRUM-8": { summary: "Duplicate charge occurs after checkout retry", type: "Task", status: "To Do", priority: "Highest", description: "Customer-facing incident that motivates the idempotency and retry changes." },
};

export const edges = [
  { source: "SCRUM-1", target: "SCRUM-2", label: "Initiative scope", evidence: "SCRUM-2 contributes to the Checkout Reliability Upgrade initiative.", confidence: 0.95, explicit: true },
  { source: "SCRUM-6", target: "SCRUM-2", label: "Explicit Jira link", evidence: "SCRUM-6 blocks the central Payment API change.", confidence: 1, explicit: true },
  { source: "SCRUM-2", target: "SCRUM-3", label: "Explicit Jira link", evidence: "Checkout retry behavior is linked to the Payment API idempotency change.", confidence: 1, explicit: true },
  { source: "SCRUM-6", target: "SCRUM-7", label: "Explicit Jira link", evidence: "The webhook contract blocks the fraud consumer migration.", confidence: 1, explicit: true },
  { source: "SCRUM-2", target: "SCRUM-4", label: "Parent / child", evidence: "SCRUM-4 is an implementation child of SCRUM-2.", confidence: 1, explicit: true },
  { source: "SCRUM-2", target: "SCRUM-8", label: "Incident dependency", evidence: "The duplicate-charge incident is blocked by the idempotency fix.", confidence: 1, explicit: true },
  { source: "SCRUM-3", target: "SCRUM-5", label: "Parent / child", evidence: "SCRUM-5 validates the retry behavior implemented by SCRUM-3.", confidence: 1, explicit: true },
] as const;

export const recommendations = [
  { title: "Review the idempotency contract", detail: "Confirm key lifetime, atomic writes, and conflict behavior before API implementation.", team: "Payments" },
  { title: "Test delayed and concurrent retries", detail: "Cover timeouts, duplicate clicks, and two requests racing with the same key.", team: "Quality" },
  { title: "Coordinate the webhook migration", detail: "Agree on a compatibility window before the fraud consumer moves versions.", team: "Platform" },
  { title: "Add an incident regression", detail: "Use SCRUM-8 as the customer-facing scenario that must remain impossible.", team: "Checkout" },
];
