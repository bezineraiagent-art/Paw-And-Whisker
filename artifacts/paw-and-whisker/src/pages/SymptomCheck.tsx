import { useEffect, useState, type FormEvent } from "react";
import SiteHeader from "@/components/SiteHeader";
import EmailCapture from "@/components/EmailCapture";
import { symptomQuestions, symptomResult, type SymptomAnswers } from "@/content/symptoms";

export default function SymptomCheck({ results = false }: { results?: boolean }) {
  const [answers, setAnswers] = useState<SymptomAnswers>({});
  const [error, setError] = useState("");
  useEffect(() => {
    if (results) setAnswers(Object.fromEntries(new URLSearchParams(window.location.search)));
  }, [results]);
  const result = results ? symptomResult(answers) : null;
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!symptomResult(answers)) { setError("Please answer all five questions."); return; }
    window.location.assign("/tools/symptom-check/results?" + new URLSearchParams(answers).toString());
  }
  return <div className="pw"><SiteHeader /><main className="tool-main symptom-main">
    <nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/tools">Free tools</a> / <a href="/tools/symptom-check">Symptom check</a>{results ? " / Results" : ""}</nav>
    <p className="content-eyebrow">Free educational guidance</p><h1>{results ? "Understanding your symptom-check results" : "What should you check when your pet acts differently?"}</h1>
    <p className="pw-byline">By Paul, pet parent and founder · Updated <time dateTime="2026-10-03">3 October 2026</time></p>
    <p>{results ? "Results help you organize a call to your vet. They cannot diagnose your pet or confirm that waiting is safe." : "Answer the original five quick questions to organize your next steps. No email or subscription required to see your result."}</p>
    <div className="emergency-notice"><strong>Stop here for emergency signs.</strong><p>Trouble breathing, collapse, seizures, major bleeding, suspected poisoning, a swollen abdomen with retching, severe pain or a cat straining without passing urine mean an emergency vet now. Do not finish the quiz first.</p></div>
    {!results ? <form className="symptom-form" onSubmit={submit}>
      {symptomQuestions.map((q, index) => <fieldset key={q.key}><legend><span>Question {index + 1} of 5</span>{q.title}</legend><div className="symptom-options">{q.options.map(([value, label]) => <label key={value} className={answers[q.key] === value ? "selected" : ""}><input type="radio" name={q.key} value={value} required checked={answers[q.key] === value} onChange={() => setAnswers({ ...answers, [q.key]: value })} />{label}</label>)}</div></fieldset>)}
      <button className="content-button" type="submit">See my guidance</button>{error && <p role="alert">{error}</p>}
    </form> : <>
      {result ? <section className={`symptom-result ${result.level}`} aria-live="polite"><p className="content-eyebrow">{result.level === "emergency" ? "Urgent next step" : "Veterinary advice needed"}</p><h2>{result.heading}</h2><p>{result.summary}</p><h3>Your answers</h3><dl>{symptomQuestions.map(q => <div key={q.key}><dt>{q.title}</dt><dd>{q.options.find(([v]) => v === answers[q.key])?.[1]}</dd></div>)}</dl></section> : <section className="symptom-result"><h2>What the results mean</h2><p>The check highlights emergency signs and when to call for prompt advice. It does not produce a diagnosis or an all-clear. Complete the five questions to see guidance based on your answers.</p><a className="content-button" href="/tools/symptom-check">Start the five-question check</a></section>}
      <section className="content-copy"><h2>What to tell your vet</h2><ul><li>Species, age and approximate weight.</li><li>When the change began, whether it is getting worse and any repeated episodes.</li><li>Food, water, urination, bowel movements and activity compared with normal.</li><li>Possible toxin, foreign-body, injury or medication exposure.</li></ul><p>Keep packaging and a brief symptom log. A short video can help the clinic understand behavior, but do not delay care to make one. Do not give medication, induce vomiting or force food or water based on this report.</p><h2>Important limits</h2><p>Five answers cannot assess breathing effort, hydration, pain, vital signs or internal illness. More than one problem may be present. If symptoms worsen, your pet seems very unwell or you're unsure, call the emergency clinic even if this report is less urgent.</p><p><a href="/tools/symptom-check">Start again</a> · <a href="/tools/toxic-food-checker">Check a food exposure</a></p></section>
      <EmailCapture />
    </>}
    <section className="content-copy"><h2>Does this replace my vet?</h2><p>No. This free check is general information, not veterinary advice, diagnosis or treatment. It does not use an AI diagnosis or offer medication doses.</p><h2>Why are young and older pets treated cautiously?</h2><p>Age and health history can change how quickly a pet becomes unwell. Puppies, kittens and small animals often need earlier assessment, and older animals may have conditions this check cannot see.</p><h2>Sources</h2><p><a href="https://www.avma.org/resources-tools/pet-owners/emergencycare">AVMA: Pet first aid and emergency care</a> · <a href="https://www.aspca.org/pet-care/animal-poison-control">ASPCA Poison Control</a>. The question wording was migrated from the owner's original quiz; escalation guidance was rewritten conservatively for this site.</p></section>
  </main></div>;
}