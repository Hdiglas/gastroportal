import { prisma } from "@/lib/db/prisma";

export interface OllamaSettings {
  host: string;
  port: string;
  model: string;
  thinkingBudget: number;
  thinkingEnabled: boolean;
}

export async function getOllamaSettings(): Promise<OllamaSettings> {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          "ollama_host",
          "ollama_port",
          "ollama_model",
          "ollama_thinking_budget",
          "ollama_thinking_enabled",
        ],
      },
    },
  });
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;
  return {
    host: map["ollama_host"] || "localhost",
    port: map["ollama_port"] || "11434",
    model: map["ollama_model"] || "llama3",
    thinkingBudget: parseInt(map["ollama_thinking_budget"] || "2048", 10),
    thinkingEnabled: map["ollama_thinking_enabled"] !== "false",
  };
}

export function stripThinkingTokens(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

export type ThinkingEffort = "minimal" | "low" | "normal" | "high";

const EFFORT_MULTIPLIERS: Record<ThinkingEffort, number> = {
  minimal: 0,
  low: 0.25,
  normal: 1,
  high: 2,
};

const EFFORT_HINTS: Record<ThinkingEffort, string> = {
  minimal:
    "\n\n[WICHTIG: Denke NICHT lange nach. Komm sofort zum Ergebnis. Maximal 2-3 Stichpunkte intern.]",
  low: "\n\n[Denke kurz und effizient nach. Nur die wichtigsten Punkte, dann sofort antworten.]",
  normal: "",
  high: "",
};

export interface ChatOptions {
  messages: { role: string; content: string }[];
  format?: "json";
  maxTokens?: number;
  thinkingEffort?: ThinkingEffort;
}

export async function chatCompletion(
  opts: ChatOptions
): Promise<{ content: string; raw: string; thinkingContent: string }> {
  const { host, port, model, thinkingBudget, thinkingEnabled } =
    await getOllamaSettings();

  const effort = opts.thinkingEffort ?? "normal";

  // For strict JSON outputs we disable thinking to avoid any <think> tags
  // or non-JSON pre/postfix that could break JSON.parse on the caller side.
  const wantsThinking = thinkingEnabled && effort !== "minimal";
  const shouldThink = wantsThinking && !opts.format;
  const thinkTokens = shouldThink
    ? Math.round(thinkingBudget * EFFORT_MULTIPLIERS[effort])
    : 0;
  const outputTokens = opts.maxTokens ?? 2048;
  const numPredict = thinkTokens + outputTokens;

  const messages = [...opts.messages];

  if (shouldThink) {
    const hint = EFFORT_HINTS[effort];
    if (hint && messages.length > 0 && messages[0].role === "system") {
      messages[0] = {
        ...messages[0],
        content: messages[0].content + hint,
      };
    }
  }

  const body: Record<string, unknown> = {
    model,
    messages,
    stream: false,
    think: shouldThink,
    options: {
      num_predict: numPredict,
    },
  };

  if (opts.format) {
    body.format = opts.format;
  }

  const response = await fetch(`http://${host}:${port}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Ollama request failed (${response.status}): ${errorText.slice(0, 200)}`
    );
  }

  const result = await response.json();

  const messageContent = result.message?.content ?? "";
  const rawContent =
    typeof messageContent === "string"
      ? messageContent
      : JSON.stringify(messageContent);
  const thinkingRaw = result.message?.thinking ?? "";
  const thinkingContent =
    typeof thinkingRaw === "string" ? thinkingRaw : JSON.stringify(thinkingRaw);
  const content = stripThinkingTokens(rawContent);

  return { content, raw: rawContent, thinkingContent };
}
