export type Urgency = "monitor" | "today" | "urgent" | "emergency";
const levels: Urgency[] = ["monitor", "today", "urgent", "emergency"];
export function normalizeAnswer(raw: string, question: string) {
  let answer = "", urgency: Urgency = "today";
  try {
    const data = JSON.parse(raw);
    if (typeof data.answer === "string") answer = data.answer.trim();
    if (levels.includes(data.urgency)) urgency = data.urgency;
  } catch { if (!raw.trim().startsWith("{")) answer = raw.trim(); }
  // Deterministic safety floor. Model output can escalate, never override these.
  const emergency = /(?:trouble|difficulty|struggling)\s+(?:(?:with|to)\s+)?breath|(?:can'?t|cannot|unable to)\s+breathe|collapse|seizure|major bleeding|bleeding heavily|suspected poisoning|(?:ate|eaten|swallowed)\s+(?:\w+\s+){0,3}(?:poison|rat poison|chocolate|grapes?|raisins?|xylitol)|bloat\w*.*retch|(?:cat|kitten).*(?:unable|can'?t|cannot|not passing).*(?:urinat|pee|urine)|severe pain/i.test(question);
  if (emergency) urgency = "emergency";
  if (!answer) {
    if (urgency === "monitor") urgency = "today";
    answer = "I couldn't assess this safely. Call a vet today for advice; if your pet seems very unwell or has emergency signs, go immediately.";
  }
  return { answer, urgency };
}