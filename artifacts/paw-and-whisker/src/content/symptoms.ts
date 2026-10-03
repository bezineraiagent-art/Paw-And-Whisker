import type { Urgency } from "./urgency";
export const symptomQuestions = [
  { key: "pet", title: "What kind of pet do you have?", options: [["cat", "Cat"], ["dog", "Dog"], ["other", "Other small animal"]] },
  { key: "symptom", title: "What is the main symptom?", options: [["not-eating", "Not eating or drinking"], ["vomiting", "Vomiting or diarrhea"], ["lethargic", "Very tired or not moving"], ["pain", "Limping or showing pain"], ["breathing", "Breathing problems"], ["behavior", "Strange behavior or confused"]] },
  { key: "duration", title: "How long has this been happening?", options: [["hours", "Just started, a few hours"], ["day", "About a day"], ["days", "2 to 3 days"], ["week", "More than a week"]] },
  { key: "eating", title: "Is your pet still eating or drinking?", options: [["yes", "Yes, eating and drinking normally"], ["less", "A little, much less than usual"], ["no", "No, refusing food and water"]] },
  { key: "age", title: "How old is your pet?", options: [["young", "Under 1 year, puppy or kitten"], ["adult", "1 to 7 years"], ["senior", "8 years or older, senior pet"]] },
] as const;
export type SymptomAnswers = Record<string, string>;
export function validAnswers(answers: SymptomAnswers) {
  return symptomQuestions.every(q => q.options.some(([value]) => value === answers[q.key]));
}
export function symptomResult(answers: SymptomAnswers) {
  if (!validAnswers(answers)) return null;
  const emergency = answers.symptom === "breathing" || answers.symptom === "lethargic";
  const vulnerable = answers.age !== "adult" || answers.pet === "other" || answers.eating === "no";
  const urgency: Urgency = emergency ? "emergency" : vulnerable ? "urgent" : "today";
  return {
    urgency,
    level: emergency ? "emergency" : "vet",
    heading: emergency ? "Contact an emergency vet now" : vulnerable ? "Arrange veterinary assessment now — don't wait overnight" : "Contact your vet for advice today",
    summary: emergency ? "Breathing problems or a pet that is very weak or not moving can be urgent, even if they still eat. Call the emergency clinic and arrange immediate assessment." : vulnerable ? "A young, senior or small animal, or a pet refusing food and water, can deteriorate quickly. Call the clinic while arranging prompt assessment now; do not wait overnight or for another AI answer." : "These answers do not establish a cause or show that waiting is safe. New vomiting, appetite changes, pain or unusual behavior deserve case-specific veterinary advice.",
  };
}