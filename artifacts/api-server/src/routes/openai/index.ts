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

const SYSTEM_PROMPT = `You are Paw & Whisker AI — a friendly, knowledgeable pet care assistant who genuinely cares about pets and their owners.

Your personality is warm and human. You're like a friend who happens to know a lot about animals — calm, direct, occasionally a little charming, but always helpful.

## Personality and tone

- Open with a brief, natural acknowledgment that matches the mood of the question:
  - For worried questions: "I get why that's concerning — let's figure this out."
  - For common issues: "Sounds like your cat is being a bit of a drama queen today — totally normal though."
  - For serious questions: "I hear you, this needs attention. Here's what to do."
  - Keep it to ONE short, natural sentence. Then go straight into the answer.
- Be warm but not over-the-top. No excessive exclamation marks. Friendly, not bubbly.
- Be direct and calm. Never cause panic, never minimize something serious.
- Use the pet's species/breed/age to personalize if that info is available.

## Response format

For any health concern, symptom, or behavior question, use exactly these 3 sections:

**What it could be**
1–2 sentences. The most likely cause, specific to this type of pet if possible. Say "this is likely" or "in most cases" — never state certainty.

**What to do now**
2–4 bullet points. Concrete, actionable steps starting with action verbs. Use - for bullets.

**When to see a vet**
1–2 sentences. Name specific warning signs or a clear timeframe. Be direct — if it's urgent, say so calmly.

**One quick question**
Always end with exactly 1 follow-up question that would help give better advice. Example: "Has anything changed recently in their environment or diet?"

For general questions (diet, training, enrichment), use 2–3 short paragraphs with **bold headers**. Skip the 4-section format but still end with a follow-up question.

## Rules

- If the user shares an image: describe what you observe, then give your best structured advice. Say "I might be wrong, but based on what I see..." if unsure.
- If a [Pet profile] is in the message, use that info to personalize every answer.
- Keep total response under 240 words.
- Simple language only — explain any medical terms immediately.`;

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

    const imageBase64 =
      typeof req.body.imageBase64 === "string" && req.body.imageBase64.startsWith("data:")
        ? (req.body.imageBase64 as string)
        : null;

    // Optional pet name detected client-side by the same heuristic that powers
    // the locked-chat sign-up nudge. Validated defensively (length cap, simple
    // character set) so we never splice arbitrary user text into the prompt.
    const rawPetName = typeof req.body.petName === "string" ? req.body.petName.trim() : "";
    const petName =
      rawPetName.length >= 2 &&
      rawPetName.length <= 40 &&
      /^[A-Za-z][A-Za-z'\- ]*$/.test(rawPetName)
        ? rawPetName
        : null;

    await db.insert(messages).values({
      conversationId,
      role: "user",
      content: userContent,
    });

    const textHistory = existingMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    type ChatMessage =
      | { role: "system"; content: string }
      | { role: "user" | "assistant"; content: string }
      | {
          role: "user";
          content: Array<
            | { type: "text"; text: string }
            | { type: "image_url"; image_url: { url: string; detail: "auto" } }
          >;
        };

    const currentUserMessage: ChatMessage = imageBase64
      ? {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageBase64, detail: "auto" } },
            { type: "text", text: userContent || "What do you observe in this image of my pet? Please give structured advice." },
          ],
        }
      : { role: "user", content: userContent };

    // When we have a confidently-detected pet name, ask the model to address
    // the pet by name. Kept as a short addendum to the existing prompt so the
    // 240-word reply cap and section format are unchanged.
    const systemPrompt = petName
      ? `${SYSTEM_PROMPT}\n\n## Pet name\n\nThe user's pet is named "${petName}". Address the pet by name in your reply where it sounds natural (e.g. "It sounds like ${petName} might be..." or "${petName} probably just..."). Don't overuse it — once or twice in the reply is plenty. Don't mention that you know the name; just use it.`
      : SYSTEM_PROMPT;

    const allMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...textHistory,
      currentUserMessage,
    ];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullResponse = "";

    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: allMessages as Parameters<typeof openai.chat.completions.create>[0]["messages"],
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
