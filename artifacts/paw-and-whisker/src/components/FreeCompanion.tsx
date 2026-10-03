import { useEffect, useRef, useState, type FormEvent } from "react";
import { Camera, Pencil, Trash2, X } from "lucide-react";
import { preparePhoto } from "@/lib/image";
import ReactMarkdown from "react-markdown";
import { askCompanion, getCompanionUsage, type CompanionUsage, type CompanionInput } from "@workspace/api-client-react";
import UrgencyBadge from "@/components/UrgencyBadge";
import { normalizeUrgency, type Urgency } from "@/content/urgency";
import { emptyPet, loadPet, petLimits, petPayload, removePet, speciesLabel, storePet, type PetForm, type PetSpecies } from "@/content/profile";

type Turn = { question: string; answer: string; urgency: Urgency };

export default function FreeCompanion() {
  const [pet, setPet] = useState<PetForm | null>(null);
  const [draft, setDraft] = useState<PetForm>(emptyPet);
  const [editing, setEditing] = useState(true);
  const [storageNote, setStorageNote] = useState("");
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState<Turn[]>([]);
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
    const stored = loadPet();
    if (stored) { setPet(stored); setDraft(stored); setEditing(false); }
    try {
      const history = JSON.parse(sessionStorage.getItem("pw-free-history") ?? "[]");
      if (Array.isArray(history)) setChat(history.filter(x => x && typeof x.question === "string" && typeof x.answer === "string").map(x => ({ question: x.question, answer: x.answer, urgency: normalizeUrgency(x.urgency) })));
    } catch { /* The chat still works if browser storage is disabled. */ }
    getCompanionUsage().then(setAllowance).catch(() => setError("We couldn't check your allowance. Please try refreshing."));
  }, []);
  const set = <K extends keyof PetForm>(k: K, v: PetForm[K]) => setDraft(d => ({ ...d, [k]: v }));
  function savePet(e: FormEvent) {
    e.preventDefault();
    const clean: PetForm = { ...draft, name: draft.name.trim(), age: draft.age.trim(), weight: draft.weight.trim(), breed: draft.breed.trim(), allergies: draft.allergies.trim(), conditions: draft.conditions.trim() };
    if (!clean.name) return;
    setPet(clean); setDraft(clean); setEditing(false);
    try { storePet(clean); setStorageNote(""); } catch { setStorageNote("Browser storage is disabled. This profile works for now but won't be remembered after you close the page."); }
  }
  function clearPet() { removePet(); setPet(null); setDraft(emptyPet); setEditing(true); setStorageNote(""); }
  async function send(e: FormEvent) {
    e.preventDefault();
    if ((!question.trim() && !photo) || pending || allowance?.remaining === 0) return;
    setPending(true); setError("");
    try {
      const asked = question.trim() || "I've attached a photo. Does this look like something I should get a vet to see soon, and how urgently?";
      const body: CompanionInput = { question: asked, ...(pet ? { pet: petPayload(pet) } : {}), ...(photo ? { imageDataUrl: photo } : {}) };
      const result = await askCompanion(body);
      const next = [...chat, { question: photo ? `${asked} (photo attached)` : asked, answer: result.answer, urgency: normalizeUrgency(result.urgency) }];
      setChat(next); setAllowance(result); setQuestion(""); setPhoto(null);
      try { sessionStorage.setItem("pw-free-history", JSON.stringify(next)); } catch { /* State remains available in this tab. */ }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send. Please try again.");
      getCompanionUsage().then(setAllowance).catch(() => {});
    } finally { setPending(false); }
  }
  return <div className="free-companion">
    <section className="pw-mypet" aria-labelledby="mypet-h" data-testid="card-my-pet">
      <h3 id="mypet-h">My Pet</h3>
      {!editing && pet ? <div>
        <p className="pw-mypet-name" data-testid="text-pet-name">{pet.name}</p>
        <dl className="pw-mypet-facts">
          <div><dt>Type</dt><dd>{speciesLabel[pet.species]}</dd></div>
          {pet.age && <div><dt>Age</dt><dd>{pet.age}</dd></div>}
          {pet.weight && <div><dt>Weight</dt><dd>{pet.weight}</dd></div>}
          {pet.breed && <div><dt>Breed</dt><dd>{pet.breed}</dd></div>}
          {pet.allergies && <div><dt>Allergies</dt><dd>{pet.allergies}</dd></div>}
          {pet.conditions && <div><dt>Conditions</dt><dd>{pet.conditions}</dd></div>}
        </dl>
        <div className="pw-mypet-actions">
          <button type="button" className="content-secondary" onClick={() => { setDraft(pet); setEditing(true); }} data-testid="button-edit-pet"><Pencil size={16} aria-hidden="true" /> Edit</button>
          <button type="button" className="content-secondary" onClick={clearPet} data-testid="button-clear-pet"><Trash2 size={16} aria-hidden="true" /> Clear profile</button>
        </div>
      </div> : <form onSubmit={savePet} className="pet-profile-form">
        <p className="small-print">Tell us about your pet so every answer fits them. Optional except the name.</p>
        <label>Name<input required maxLength={petLimits.name} value={draft.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Lucky" data-testid="input-pet-name" /></label>
        <label>Type<select value={draft.species} onChange={e => set("species", e.target.value as PetSpecies)} data-testid="select-pet-species"><option value="puppy">Puppy</option><option value="dog">Dog</option><option value="cat">Cat / kitten</option><option value="other">Other pet</option></select></label>
        <label>Age<input maxLength={petLimits.age} value={draft.age} onChange={e => set("age", e.target.value)} placeholder="e.g. 12 weeks" /></label>
        <label>Weight<input maxLength={petLimits.weight} value={draft.weight} onChange={e => set("weight", e.target.value)} placeholder="e.g. 4.2 kg" /></label>
        <label>Breed (optional)<input maxLength={petLimits.breed} value={draft.breed} onChange={e => set("breed", e.target.value)} placeholder="e.g. Golden retriever" /></label>
        <label>Allergies<textarea rows={2} maxLength={petLimits.allergies} value={draft.allergies} onChange={e => set("allergies", e.target.value)} placeholder="Food or medicine allergies, if any" /></label>
        <label>Health conditions<textarea rows={2} maxLength={petLimits.conditions} value={draft.conditions} onChange={e => set("conditions", e.target.value)} placeholder="Ongoing conditions or medicines, if any" /></label>
        <div className="pw-mypet-actions">
          <button className="content-button" type="submit" data-testid="button-save-pet">Save in this browser</button>
          {pet && <button type="button" className="content-secondary" onClick={() => { setDraft(pet); setEditing(false); }}>Cancel</button>}
        </div>
      </form>}
      <p className="small-print">Saved only in this browser, with no account. The whole profile is sent with each question so the answer fits your pet, and we do not store it. Avoid sharing personal details.</p>
      {storageNote && <p role="status" className="form-error">{storageNote}</p>}
    </section>
    <p className="small-print"><strong>A note from Paul, the founder:</strong> I uploaded a photo of a problem on my cat Lucky to an earlier version of this site. The AI suggested taking her to a vet quickly. I took her in; she had a bad infection and was treated. That is one owner's experience. AI cannot diagnose, results vary, and when in doubt, call a vet. <a href="/find-a-vet">Find a vet near you</a>.</p>
    <div aria-live="polite" className="chat-history">{chat.map((item, i) => <div key={i}><p className="chat-question">{item.question}</p><div className="chat-answer"><UrgencyBadge level={item.urgency} /><ReactMarkdown>{item.answer}</ReactMarkdown></div></div>)}{pending && <p>Thinking about your question…</p>}</div>
    <form onSubmit={send} className="chat-question-form"><label htmlFor="free-question">What's on your mind?</label><textarea id="free-question" required={!photo} maxLength={3000} value={question} onChange={e => setQuestion(e.target.value)} placeholder="How can I help my puppy settle at bedtime?" /><div className="pw-photo-box">
      <p className="small-print"><strong>Photo questions are free too</strong> (they count toward your two a day). Useful for skin issues, eyes, wounds and swelling. A photo can't rule out infection or an emergency, and AI cannot diagnose. Never wait for AI if your pet seems unwell: call a vet. The image is sent to our AI provider to answer, and is not saved by us. <a href="/find-a-vet">Find a vet</a></p>
      <input ref={fileRef} aria-label="Choose a photo of your pet to attach" type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => pick(e.target.files?.[0])} data-testid="input-free-photo" />
      {!photo && <button type="button" className="content-secondary" onClick={() => fileRef.current?.click()} disabled={photoBusy || pending} data-testid="button-free-photo"><Camera size={18} aria-hidden="true" /> {photoBusy ? "Preparing photo…" : "Add a photo"}</button>}
      {photo && <div className="pw-photo-preview"><img src={photo} alt="Your photo, ready to send" /><button type="button" className="content-secondary" onClick={() => { gen.current++; setPhoto(null); setPhotoBusy(false); }} disabled={pending} data-testid="button-remove-photo"><X size={16} aria-hidden="true" /> Remove photo</button></div>}
      {photoError && <p role="alert" className="form-error">{photoError}</p>}
    </div>
    <button type="submit" className="content-button" disabled={pending || photoBusy || !allowance || allowance.remaining === 0} data-testid="button-ask">{pending ? "Answering…" : "Ask a free question"}</button></form>
    {allowance && <p className="small-print">{allowance.remaining} of {allowance.limit} free questions left today. Resets at midnight UTC. Starting a new conversation doesn't reset this allowance. Shared networks and our overall safety limits can pause answers sooner.</p>}
    {allowance?.remaining === 0 && <p>That's today's free allowance. Come back tomorrow, or <a href="/pricing#plus-waitlist">join the Whisker Plus waitlist</a>. Our guides and tools stay free.</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
    <p className="small-print">General information, not veterinary advice, and a "Monitor at home" label is never a guarantee. For urgent signs or suspected poisoning, contact an emergency vet now. <a href="/how-it-works">How answers are made, and their limits</a>.</p>
  </div>;
}
