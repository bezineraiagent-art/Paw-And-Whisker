import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sections = [
  ["Paw & Whisker | Free pet-parent checklist", "10 pet symptoms that usually aren't emergencies"],
  ["Read this first", "This is general information, not veterinary advice or an all-clear. These examples apply only when a pet is otherwise comfortable, alert, eating, drinking and behaving normally. Call your vet if a change repeats, persists, worsens or worries you. Puppies, kittens, seniors and pets with existing conditions need earlier advice. Never use this checklist to decide a possible poisoning is safe."],
  ["Emergency signs: do not wait", "Trouble breathing, collapse, seizures, major bleeding, suspected poisoning, severe pain, marked weakness, a swollen belly with retching, or a cat straining without passing urine mean emergency help now. Do not induce vomiting or give medication unless a veterinary professional directs you. No symptoms yet does not rule out poisoning."],
  ["1. A single brief sneeze", "One sneeze without other changes may be ordinary irritation. Repeated sneezing, discharge, bleeding, reduced appetite or any breathing effort needs advice. Breathing difficulty is an emergency."],
  ["2. A short bout of hiccups", "Brief hiccups in an otherwise comfortable animal may stop on their own. Do not assume coughing, retching or labored breathing is a hiccup. If uncertain, record what you saw and call your vet."],
  ["3. Light movements during sleep", "Small twitches during sleep may be ordinary dreaming when your pet wakes and behaves normally. Inability to wake normally, stiffness, prolonged movements, collapse or confusion needs urgent help. Do not restrain a pet during a possible seizure."],
  ["4. An ordinary stretch after a nap", "A comfortable stretch can be normal. Repeated unusual postures, a tense belly, guarding, restlessness or apparent pain should not be dismissed as stretching. Call for advice."],
  ["5. One mildly softer stool in a healthy adult", "A single softer stool without blood, vomiting, reduced appetite or other changes may not be an emergency. Contact your vet if it repeats or worsens. Young animals and pets with existing illness need earlier advice; do not wait overnight if they seem unwell."],
  ["6. A brief paw lick", "Occasional grooming can be ordinary. Persistent licking, swelling, wounds, limping or pain changes the situation. Avoid letting your pet chew or swallow a foreign object; seek advice if you suspect an injury."],
  ["7. One quick scratch", "An isolated scratch is not the same as constant itching. Repeated scratching, sores, hair loss, head shaking or discomfort deserves a vet call. Do not apply human creams or essential oils."],
  ["8. Seasonal shedding without skin changes", "Some loose hair may be normal when the skin looks comfortable and the pet is otherwise well. Bald patches, redness, odor, sores or marked itching need assessment. The amount alone does not identify a cause."],
  ["9. A brief familiar sound during sleep", "A familiar light snore in a relaxed sleeping pet may be unchanged from normal. New noises, pauses, breathing effort or a change while awake are different. Call your vet; breathing difficulty needs emergency help."],
  ["10. A single hairball followed by normal behavior", "A cat that produces a hairball and then returns fully to normal may not need emergency care for that one event. Repeated retching, vomiting, reduced appetite, discomfort or failure to recover needs advice. Do not assume every cough or gag is a hairball."],
  ["A useful symptom note", "Write down what happened, when it began, how often it occurred, food and water intake, toileting and behavior compared with normal. Keep the vet's out-of-hours number accessible. A short video may help describe a change, but never delay care to make one."],
  ["Poison contacts and sources", "US ASPCA Poison Control: (888) 426-4435. US Pet Poison Helpline: (855) 764-7661. Consultation fees may apply. Elsewhere, call your local emergency vet. Sources: AVMA pet first aid and emergency care; ASPCA Poison Control. pawandwhisker.net/medical-disclaimer"],
  ["About this checklist", "Written by Paul, a pet parent. Updated 3 October 2026. No diagnosis, dosing or assurance that waiting is safe is provided. If you cannot tell whether your pet fits the comfortable, otherwise-normal examples above, call a veterinary professional."],
];
const wrap = (text, width = 84) => {
  const lines = []; let line = "";
  for (const word of text.split(/\s+/)) { if ((line + " " + word).trim().length > width) { lines.push(line); line = word; } else line = (line + " " + word).trim(); }
  if (line) lines.push(line);
  return lines;
};
const pages = []; let current = [], y = 752;
for (const [heading, body] of sections) {
  const bodyLines = wrap(body);
  if (y - (bodyLines.length + 3) * 14 < 58) { pages.push(current); current = []; y = 752; }
  current.push({ text: heading, x: 48, y, bold: true }); y -= 22;
  bodyLines.forEach(text => { current.push({ text, x: 48, y, bold: false }); y -= 14; });
  y -= 18;
}
pages.push(current);
const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  `<< /Type /Pages /Kids [${pages.map((_, i) => `${5 + i * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`,
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
];
const escape = text => text.replace(/[\\()]/g, "\\$&").replace(/[^\x20-\x7e]/g, "-");
pages.forEach((lines, i) => {
  objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + i * 2} 0 R >>`);
  const stream = lines.map(line => `BT /${line.bold ? "F2" : "F1"} ${line.bold ? 12 : 10} Tf ${line.bold ? "0.12 0.30 0.23" : "0.16 0.21 0.18"} rg 1 0 0 1 ${line.x} ${line.y} Tm (${escape(line.text)}) Tj ET`).join("\n") +
    `\nBT /F1 9 Tf 1 0 0 1 48 30 Tm (Paw & Whisker - General information only - Page ${i + 1} of ${pages.length}) Tj ET`;
  objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
});
let output = "%PDF-1.4\n"; const offsets = [0];
objects.forEach((object, i) => { offsets.push(Buffer.byteLength(output)); output += `${i + 1} 0 obj\n${object}\nendobj\n`; });
const xref = Buffer.byteLength(output);
output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => String(offset).padStart(10, "0") + " 00000 n ").join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
const destination = fileURLToPath(new URL("../public/downloads/10-pet-symptoms.pdf", import.meta.url));
await mkdir(path.dirname(destination), { recursive: true });
await writeFile(destination, output);
console.log(`Generated ${pages.length}-page PDF checklist.`);