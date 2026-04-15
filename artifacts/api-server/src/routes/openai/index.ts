import { Router } from "express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { eq, asc, and } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  CreateOpenaiConversationBody,
  GetOpenaiConversationParams,
  DeleteOpenaiConversationParams,
  ListOpenaiMessagesParams,
  SendOpenaiMessageParams,
  SendOpenaiMessageBody,
} from "@workspace/api-zod";

const router = Router();

const SYSTEM_PROMPT = `You are Paw & Whisker AI, a specialized pet care assistant.

Your job is to give clear, empathetic, and structured advice for pet owners who are often worried about their animals.

If the user's message includes a [Pet profile] note, always personalize your answer using that information (age, species, concern).

If the user shares an image note, acknowledge it warmly and give your best structured advice based on the context provided.

## Tone and empathy

- When a pet owner sounds worried or describes something upsetting, briefly acknowledge their concern before answering. Use natural phrases like:
  - "I understand this can be worrying."
  - "It's understandable to be concerned about this."
  - "This is stressful — let's figure it out together."
- Keep the acknowledgment to one short sentence. Then move immediately into the answer.
- Be direct and calm. Never cause panic, but never minimize serious symptoms either.
- Always guide toward action — the owner should finish reading knowing exactly what to do next.
- Sound like a trusted friend who happens to know a lot about animals: warm, knowledgeable, honest.

## Response format

For any health concern, symptom, or behavior problem, use exactly these 3 sections with bold headers:

**What it could be**
1–2 sentences. Give the most likely reason, specific to the pet's species/age if known. Say "this is likely" or "in most cases" — never state certainty.

**What to do now**
2–4 concrete bullet points starting with action verbs. Steps the owner can take at home immediately. Use - for bullets.

**When to see a vet**
1–2 sentences. Name specific warning signs or a clear timeframe. Be direct — if it sounds serious, say so calmly.

For general questions (diet, training, enrichment), answer in 2–3 short paragraphs with **bold headers** where helpful. Skip the 3-section format but keep the warm, direct tone.

## Rules

- Never open with filler like "Great question!" — start with the acknowledgment (if warranted) or the answer
- Use simple everyday language — explain medical terms immediately
- Keep total response under 220 words unless the question genuinely requires more
- If it would genuinely help, end with 1 short follow-up question`;

function getSessionId(req: Parameters<Router>[0]): string {
  const sessionId = req.headers["x-session-id"];
  return typeof sessionId === "string" && sessionId.length > 0 ? sessionId : "";
}

router.get("/conversations", async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    if (!sessionId) {
      res.json([]);
      return;
    }
    const allConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.sessionId, sessionId))
      .orderBy(asc(conversations.createdAt));
    res.json(allConversations);
  } catch (err) {
    req.log.error({ err }, "Failed to list conversations");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/conversations", async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    if (!sessionId) {
      res.status(400).json({ error: "Missing session ID" });
      return;
    }
    const parsed = CreateOpenaiConversationBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }
    const [conversation] = await db
      .insert(conversations)
      .values({ title: parsed.data.title, sessionId })
      .returning();
    res.status(201).json(conversation);
  } catch (err) {
    req.log.error({ err }, "Failed to create conversation");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/conversations/:id", async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const parsed = GetOpenaiConversationParams.safeParse({ id: Number(req.params.id) });
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(
        sessionId
          ? and(eq(conversations.id, parsed.data.id), eq(conversations.sessionId, sessionId))
          : eq(conversations.id, parsed.data.id)
      );
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, parsed.data.id))
      .orderBy(asc(messages.createdAt));
    res.json({ ...conversation, messages: msgs });
  } catch (err) {
    req.log.error({ err }, "Failed to get conversation");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/conversations/:id", async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const parsed = DeleteOpenaiConversationParams.safeParse({ id: Number(req.params.id) });
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [deleted] = await db
      .delete(conversations)
      .where(
        sessionId
          ? and(eq(conversations.id, parsed.data.id), eq(conversations.sessionId, sessionId))
          : eq(conversations.id, parsed.data.id)
      )
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete conversation");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const parsed = ListOpenaiMessagesParams.safeParse({ id: Number(req.params.id) });
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, parsed.data.id))
      .orderBy(asc(messages.createdAt));
    res.json(msgs);
  } catch (err) {
    req.log.error({ err }, "Failed to list messages");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/conversations/:id/messages", async (req, res) => {
  try {
    const parsedParams = SendOpenaiMessageParams.safeParse({ id: Number(req.params.id) });
    const parsedBody = SendOpenaiMessageBody.safeParse(req.body);
    if (!parsedParams.success || !parsedBody.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }

    const conversationId = parsedParams.data.id;
    const userContent = parsedBody.data.content;

    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));

    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const existingMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));

    await db.insert(messages).values({
      conversationId,
      role: "user",
      content: userContent,
    });

    const chatHistory = existingMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
    chatHistory.push({ role: "user", content: userContent });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullResponse = "";

    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...chatHistory,
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    await db.insert(messages).values({
      conversationId,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Failed to send message");
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

export default router;
