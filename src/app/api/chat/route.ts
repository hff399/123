import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { KNOWLEDGE_BASE } from "@/lib/knowledge";

export const maxDuration = 60;

const responseCache = new Map<string, string>();

async function hashMessages(messages: Array<{ role: string; content: unknown }>): Promise<string> {
  const text = JSON.stringify(messages.map(m => ({ role: m.role, content: m.content })));
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

const MAX_INPUT_MESSAGES = 20;
const MAX_OUTPUT_TOKENS = 2048;

const SYSTEM_PROMPT = `You are a helpful assistant on relocation.ge — a trusted resource for foreigners navigating immigration, work permits, residence permits, and legal compliance in Georgia.

You help users understand:
- Work permit requirements for foreign employees and individual entrepreneurs (IEs)
- Residence permit types and eligibility criteria
- D1 visa requirements and application process
- Transitional period rules and deadlines
- Legal obligations under Georgia's labour migration reform effective 1 March 2026
- Government fees and processing timelines

Guidelines:
- Be accurate and reference specific legal provisions when relevant
- Clearly distinguish between requirements for employees vs. individual entrepreneurs
- Note important deadlines and transitional periods
- If a question falls outside your knowledge base, say so honestly and suggest consulting a legal professional
- Keep responses clear, well-structured, and under 400 words unless the user asks for more detail
- Use plain language but maintain legal precision
- When citing amounts, include the currency (GEL or USD)
- Always note that this is informational content, not legal advice
- Respond in the same language the user writes in

You have access to the following knowledge base covering Georgian immigration and labour migration law as of February 2026:

<knowledge>
${KNOWLEDGE_BASE}
</knowledge>

Answer questions based on this knowledge. If the user asks about something not covered, let them know and suggest they consult a legal professional or visit the official resources (matsne.gov.ge, labourmigration.moh.gov.ge).`;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const trimmedMessages = messages.slice(-MAX_INPUT_MESSAGES);
  const hash = await hashMessages(trimmedMessages);

  const cachedText = responseCache.get(hash);
  if (cachedText) {
    return createUIMessageStreamResponse({
      stream: createUIMessageStream({
        execute: ({ writer }) => {
          const id = "cached";
          writer.write({ type: "text-start", id });
          writer.write({ type: "text-delta", id, delta: cachedText });
          writer.write({ type: "text-end", id });
        },
      }),
    });
  }

  const modelMessages = await convertToModelMessages(trimmedMessages);

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
  });

  result.text.then(text => responseCache.set(hash, text));

  return result.toUIMessageStreamResponse();
}
