import { useEffect, useRef, useState, type FormEvent } from "react";
import { Camera, X } from "lucide-react";
import { preparePhoto } from "@/lib/image";
import ReactMarkdown from "react-markdown";
import { askCompanion, getCompanionUsage, type CompanionUsage, type CompanionInput } from "@workspace/api-client-react";

type Pet = { petName: string; species: "puppy" | "dog" | "cat"; age: string };
const emptyPet: Pet = { petName: "", species: "puppy", age: "" };
export default function FreeCompanion() {
  const [pet, setPet] = useState<Pet>(emptyPet);
  const [saved, setSaved] = useState(false);
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState<{ question: string; answer: string }[]>([]);
  const [allowance, setAllowance] = useState<CompanionUsage | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const gen = useRef(0);
  async function pick(file?: File) {
    if (!file) return;
    const mine = ++gen.current;
    setPhotoError(""); setPhotoBusy(true);
    try { const url = await preparePhoto(file); if (mine === gen.current) setPhoto(url); } catch (e) { if (mine === gen.current) { setPhoto(null); setPhotoError(e instanceof Error ? e.message : "That photo couldn't be used."); } }
    finally { if (mine === gen.current) setPhotoBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  }
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("pw-free-pet") ?? "null");
      if (stored && typeof stored.petName === "string" && ["puppy", "dog", "cat"].includes(stored.species) && typeof stored.age === "string") { setPet(stored); setSaved(true); }
      const history = JSON.parse(sessionStorage.getItem("pw-free-history") ?? "[]");
      if (Array.isArray(history)) setChat(history.filter(x => typeof x.question === "string" && typeof x.answer === "string"));
    } catch { /* The chat still works if browser storage is disabled. */ }
    getCompanionUsage().then(setAllowance).catch(() => setError("We couldn't check your allowance. Please try refreshing."));
  }, []);
  function savePet(e: FormEvent) {
    e.preventDefault();
    try { localStorage.setItem("pw-free-pet", JSON.stringify(pet)); setSaved(true); setError(""); }
    catch { setError("Browser storage is disabled. Your profile can be used now, but won't be saved after closing this page."); }
  }
  async function send(e: FormEvent) {
    e.preventDefault();
    if ((!question.trim() && !photo) || pending || allowance?.remaining === 0) return;
    setPending(true); setError("");
    try {
      const asked = question.trim() || "I've attached a photo. Does this look like something I should get a vet to see soon, and how urgently?";
      const body: CompanionInput = { question: asked, ...pet, ...(photo ? { imageDataUrl: photo } : {}) };
      const result = await askCompanion(body);
      const next = [...chat, { question: photo ? `${asked} (photo attached)` : asked, answer: result.answer }];
      setChat(next); setAllowance(result); setQuestion(""); setPhoto(null);
      try { sessionStorage.setItem("pw-free-history", JSON.stringify(next)); } catch { /* State remains available in this tab. */ }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send. Please try again.");
      getCompanionUsage().then(setAllowance).catch(() => {});
    } finally { setPending(false); }
  }
  return <div className="free-companion">
    <h3>A little context makes a better question.</h3>
    <p className="small-print"><strong>A note from Paul, the founder:</strong> I uploaded a photo of a problem on my cat Lucky to an earlier version of this site. The AI suggested taking her to a vet quickly. I took her in; she had a bad infection and was treated. That is one owner's experience. AI cannot diagnose, results vary, and when in doubt, call a vet. <a href="/find-a-vet">Find a vet near you</a>.</p>
    <form onSubmit={savePet} className="pet-profile-form">
      <label>Pet's name<input maxLength={60} value={pet.petName} onChange={e => { setPet({ ...pet, petName: e.target.value }); setSaved(false); }} placeholder="e.g. Lucky" /></label>
      <label>Life stage<select value={pet.species} onChange={e => { setPet({ ...pet, species: e.target.value as Pet["species"] }); setSaved(false); }}><option value="puppy">Puppy</option><option value="dog">Dog</option><option value="cat">Cat / kitten</option></select></label>
      <label>Age<input maxLength={40} value={pet.age} onChange={e => { setPet({ ...pet, age: e.target.value }); setSaved(false); }} placeholder="e.g. 12 weeks" /></label>
      <button className="content-secondary" type="submit">{saved ? "Profile saved" : "Save one pet profile"}</button>
    </form>
    <p className="small-print">Your profile is saved in this browser, not synced to an account. Questions are sent to our AI provider. Avoid sharing personal information.</p>
    <div aria-live="polite" className="chat-history">{chat.map((item, i) => <div key={i}><p className="chat-question">{item.question}</p><div className="chat-answer"><ReactMarkdown>{item.answer}</ReactMarkdown></div></div>)}{pending && <p>Thinking about your question…</p>}</div>
    <form onSubmit={send} className="chat-question-form"><label htmlFor="free-question">What's on your mind?</label><textarea id="free-question" required={!photo} maxLength={3000} value={question} onChange={e => setQuestion(e.target.value)} placeholder="How can I help my puppy settle at bedtime?" /><div className="pw-photo-box">
      <p className="small-print"><strong>Photo questions are free too</strong> (they count toward your two a day). Useful for skin issues, eyes, wounds and swelling. A photo can't rule out infection or an emergency, and AI cannot diagnose. Never wait for AI if your pet seems unwell: call a vet. The image is sent to our AI provider to answer, and is not saved by us. <a href="/find-a-vet">Find a vet</a></p>
      <input ref={fileRef} aria-label="Choose a photo of your pet to attach" type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => pick(e.target.files?.[0])} data-testid="input-free-photo" />
      {!photo && <button type="button" className="content-secondary" onClick={() => fileRef.current?.click()} disabled={photoBusy || pending} data-testid="button-free-photo"><Camera size={18} aria-hidden="true" /> {photoBusy ? "Preparing photo…" : "Add a photo"}</button>}
      {photo && <div className="pw-photo-preview"><img src={photo} alt="Your photo, ready to send" /><button type="button" className="content-secondary" onClick={() => { gen.current++; setPhoto(null); setPhotoBusy(false); }} disabled={pending} data-testid="button-remove-photo"><X size={16} aria-hidden="true" /> Remove photo</button></div>}
      {photoError && <p role="alert" className="form-error">{photoError}</p>}
    </div>
    <button type="submit" className="content-button" disabled={pending || photoBusy || !allowance || allowance.remaining === 0}>{pending ? "Answering…" : "Ask a free question"}</button></form>
    {allowance && <p className="small-print">{allowance.remaining} of {allowance.limit} free questions left today. Resets at midnight UTC. Starting a new conversation doesn't reset this allowance.</p>}
    {allowance?.remaining === 0 && <p>That's today's free allowance. Come back tomorrow or <a href="/pricing">explore Plus</a>. Our guides and tools stay free.</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
    <p className="small-print">General information, not veterinary advice. For urgent signs or suspected poisoning, contact an emergency vet now.</p>
  </div>;
}