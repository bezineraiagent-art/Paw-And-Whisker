import { ArrowRight, MessageCircleHeart, ShieldCheck, Sparkles } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import FreeCompanion from "@/components/FreeCompanion";
import EmailCapture from "@/components/EmailCapture";
import FoodSearch from "@/components/FoodSearch";
import Faq from "@/components/Faq";
import { Bowl, Cat, Doorframe, Moon, Paw, Puppy, Stars } from "@/components/Art";
import SceneIllustration from "@/components/SceneIllustration";
import WaitlistForm from "@/components/WaitlistForm";

const steps = [
  { when: "Day 1", t: "One quiet room", d: "Water, a bed, a place to settle. Keep the first day boring on purpose." },
  { when: "Days 2 to 3", t: "Learn the rhythm", d: "Jot down meals, sleep and toilet trips. Notes make a vet call easier." },
  { when: "Week 1", t: "Book the vet", d: "Ask which vaccines and parasite prevention suit your pet, and when." },
  { when: "Weeks 2 to 3", t: "Gentle practice", d: "Short, kind handling of paws and ears. Short stretches of being alone." },
  { when: "Day 30", t: "Look how far you came", d: "Mark the doorframe, keep your notes, and breathe." },
];

export default function PublicHome() {
  return (
    <div className="pw">
      <SiteHeader />
      <main id="main">
        <section className="pw-sky">
          <Stars />
          <Moon className="pw-moon" />
          <div className="pw-wrap pw-sky-grid">
            <div className="pw-reveal">
              <p className="pw-eyebrow onDark">For new puppy parents and cat families</p>
              <h1>Worried at 2am? Start with free help.</h1>
              <p className="pw-lede onDark">Paw &amp; Whisker is a calm companion for the first weeks with a dog or cat. Ask two AI questions a day, run a symptom check, look up a food. None of it needs a card.</p>
              <div className="pw-actions">
                <a className="pw-btn" href="#free-chat">Ask a free question</a>
                <a className="pw-btn onDark" href="/tools/symptom-check">Run the symptom check</a>
                <a className="pw-btn onDark" href="/find-a-vet">Find a vet near you</a>
              </div>
            </div>
            <div className="pw-tagwrap pw-reveal">
              <div className="pw-tagframe">
                <span className="pw-tagloop" aria-hidden="true" />
                <div className="pw-tag">
                  <span className="pw-taghole" aria-hidden="true" />
                  <img src="/cats.jpg" alt="Two cats resting side by side: Lucky, a black cat with green eyes, and Sugar, a brown tabby" width="816" height="1024" fetchPriority="high" />
                  <span className="pw-tagname">Lucky &amp; Sugar</span>
                </div>
              </div>
            </div>
          </div>
          <div className="pw-wrap"><p className="pw-note onDark">General information only, not veterinary advice. If your pet struggles to breathe, collapses, or may have eaten poison, go to an emergency vet now.</p></div>
        </section>

        <div className="pw-wrap pw-overlap"><FoodSearch /></div>

        <section className="pw-section">
          <div className="pw-wrap">
            <p className="pw-eyebrow">Free, start anywhere</p>
            <h2>Four ways in, all free</h2>
            <div className="pw-bento">
              <a href="/tools/symptom-check" className="bt b-sym"><Cat className="bt-art" /><span className="pw-tag">Free</span><h3>Five-question symptom check</h3><p>Five short questions, general guidance on how urgent it may be. No email needed.</p><ol className="bt-qs"><li>What kind of pet?</li><li>What is the main symptom?</li><li>How long has it lasted?</li><li>Still eating and drinking?</li><li>How old is your pet?</li></ol><span className="go">Start the check <ArrowRight size={18} aria-hidden="true" /></span></a>
              <a href="/tools/toxic-food-checker" className="bt b-food"><Bowl className="bt-art" /><h3>Toxic food checker</h3><p>Check ingredients before sharing food.</p><span className="go">Search foods <ArrowRight size={18} aria-hidden="true" /></span></a>
              <a href="#free-chat" className="bt b-chat"><Moon className="bt-art" /><h3>Two free questions a day</h3><p>Text or photo, at any hour. Resets at midnight UTC.</p><span className="go">Ask now <ArrowRight size={18} aria-hidden="true" /></span></a>
              <a href="/guides" className="bt b-guide"><Paw className="bt-paw" /><h3>Puppy guides</h3><p>Checklists and first-30-days plans for nervous, trying-hard people.</p><span className="go">Read free <ArrowRight size={18} aria-hidden="true" /></span></a>
              <a href="/compare" className="bt b-cmp"><Puppy className="bt-art small" /><h3>Comparisons</h3><p>Pet-care choices side by side, no sales pressure.</p><span className="go">Compare <ArrowRight size={18} aria-hidden="true" /></span></a>
            </div>
          </div>
        </section>

        <section className="pw-section peach">
          <div className="pw-wrap pw-timeline-wrap">
            <div>
              <p className="pw-eyebrow">The first 30 days</p>
              <h2>Mark the doorframe as you go</h2>
              <p className="pw-lede" style={{ marginTop: 0 }}>Nobody feels ready on day one. A small plan, one step at a time, gets you to day 30.</p>
              <Doorframe className="pw-door-art" />
              <a className="pw-btn ghost" href="/guides/puppy-first-30-days">Read the full 30-day guide</a>
            </div>
            <ol className="pw-timeline">
              {steps.map(s => (
                <li key={s.when}><span className="pw-tick" aria-hidden="true" /><small>{s.when}</small><h3>{s.t}</h3><p>{s.d}</p></li>
              ))}
            </ol>
          </div>
        </section>

        <section className="pw-section alt" id="free-chat">
          <div className="pw-wrap">
            <div className="pw-chat-explain">
              <div>
                <p className="pw-eyebrow">Free chat</p>
                <h2>Ask your question</h2>
                <ol className="pw-steps">
                  <li><Sparkles aria-hidden="true" /><span><strong>Tell us a little.</strong> Name, type, age and weight make the question clearer.</span></li>
                  <li><MessageCircleHeart aria-hidden="true" /><span><strong>Ask in your own words.</strong> Every answer starts with an urgency label.</span></li>
                  <li><ShieldCheck aria-hidden="true" /><span><strong>Know the limit.</strong> Two free questions each day, resetting at midnight UTC. It is not a vet. <a href="/how-it-works">How it works</a>.</span></li>
                </ol>
                <div className="pw-pips" aria-hidden="true"><i /><i /><span>2 a day, free</span></div>
              </div>
              <FreeCompanion />
            </div>
          </div>
        </section>

        <section className="pw-trust">
          <div className="pw-wrap pw-trust-in">
            <p><strong>Made by a pet parent</strong>Paul, who lives with Lucky (black, aged 1) and Sugar (brown tabby, aged 7). Not a vet, and it says so everywhere.</p>
            <p><strong>Free tools stay free</strong>No card for the symptom check, food checker or guides.</p>
            <p><strong>Sources linked</strong>Food pages cite ASPCA, Pet Poison Helpline and AKC pages.</p>
            <p><strong>A note from Paul</strong>I sent a photo of Lucky to an earlier version of this site. It suggested a prompt vet visit; she had a bad infection and was treated. One owner's experience: AI cannot diagnose, results vary, and when in doubt, call a vet.</p>
            <p><strong>Not a diagnosis</strong>Educational information to help you decide whom to call. <a href="/how-it-works">How answers are made</a>.</p>
          </div>
        </section>

        <section className="pw-section">
          <div className="pw-wrap">
            <p className="pw-eyebrow">Pricing</p>
            <h2>Free now. Whisker Plus is coming soon.</h2>
            <div className="pw-plans">
              <div className="pw-card">
                <span className="pw-tag">Free today</span><div className="pw-price">$0</div>
                <ul className="pw-list"><li>One pet profile, saved in your browser</li><li>2 AI questions a day, text or photo</li><li>Symptom check, food checker, all guides</li></ul>
                <a className="pw-btn ghost" href="#free-chat">Try the free chat</a>
              </div>
              <WaitlistForm id="plus-waitlist" />
            </div>
            <p className="pw-disc">Whisker Plus is not for sale and has no price. The Puppy Survival Kit is a separate $12 purchase. Multiple pets, reminders and vet summaries are only ideas. <a href="/pricing">Full details</a> · <a href="/puppy-kit/">Puppy Kit</a></p>
          </div>
        </section>

        <section className="pw-section alt">
          <div className="pw-wrap pw-faq-wrap">
            <div><p className="pw-eyebrow">Good questions</p><h2>Before you ask</h2></div>
            <Faq />
          </div>
        </section>

        <section className="pw-section">
          <div className="pw-wrap pw-narrow">
            <p className="pw-eyebrow">Why it exists</p>
            <h2>Built by a pet parent, not a vet</h2>
            <p>I'm Paul. I made this after living with my cats, Lucky and Sugar, and learning how fast small worries turn big when you have no one to ask. <a href="/about">Read more about Paul and the cats</a>.</p><p>An earlier version of this site helped once. I sent it a photo of a problem on Lucky, it told me to see a vet quickly, and I took her in. She had a bad infection and was treated. That is one owner's experience, not a diagnosis or a promise. AI cannot diagnose, results vary, and when in doubt, call a vet.</p>
            <SceneIllustration scene="home" />
            <EmailCapture />
          </div>
        </section>
      </main>
    </div>
  );
}
