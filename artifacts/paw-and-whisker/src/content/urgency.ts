export type Urgency = "monitor" | "today" | "urgent" | "emergency";

/** One shared definition of each urgency level, used by chat answers, the symptom check and How it works. */
export const urgencyLevels: Record<Urgency, { label: string; meaning: string; action: string }> = {
  monitor: {
    label: "Monitor at home",
    meaning: "Nothing in what you described suggests an urgent problem. This is not a guarantee: a pet can change quickly, and an AI cannot examine your pet.",
    action: "Watch closely, note changes, and call a vet if anything gets worse or you are unsure.",
  },
  today: {
    label: "Call a vet today",
    meaning: "Worth professional advice within the day. This is also the cautious default whenever we cannot tell.",
    action: "Phone your vet, describe the signs, and ask how soon your pet should be seen.",
  },
  urgent: {
    label: "Urgent: go now",
    meaning: "Signs that can worsen fast, or a pet that is young, old or small. Do not wait overnight.",
    action: "Contact a vet or emergency clinic now and go as directed.",
  },
  emergency: {
    label: "Emergency: go immediately",
    meaning: "Possible life-threatening signs, such as trouble breathing, collapse, seizures, heavy bleeding or suspected poisoning.",
    action: "Go to the nearest emergency vet immediately. Call ahead if you can, but do not delay travel.",
  },
};

export const urgencyOrder: Urgency[] = ["monitor", "today", "urgent", "emergency"];

/** Anything missing or unrecognised, including older saved history, is treated cautiously. */
export function normalizeUrgency(value: unknown): Urgency {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(urgencyLevels, value) ? (value as Urgency) : "today";
}
