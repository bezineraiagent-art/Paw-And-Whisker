import ReviewerStatus from "@/components/ReviewerStatus";
import SiteHeader from "@/components/SiteHeader";
import WrongAnswerForm from "@/components/WrongAnswerForm";
import UrgencyBadge from "@/components/UrgencyBadge";
import { urgencyLevels, urgencyOrder } from "@/content/urgency";

const references = [
  ["ASPCA Animal Poison Control", "https://www.aspca.org/pet-care/animal-poison-control"],
  ["Pet Poison Helpline", "https://www.petpoisonhelpline.com/"],
  ["American Kennel Club", "https://www.akc.org/expert-advice/health/"],
  ["AVMA: pet first aid and emergency care", "https://www.avma.org/resources-tools/pet-owners/emergencycare"],
];

export default function HowItWorks() {
  return (
    <div className="pw">
      <SiteHeader />
      <main id="main">
        <section className="pw-hero pw-sky small">
          <div className="pw-wrap pw-narrow pw-reveal">
            <p className="pw-eyebrow onDark">How it works</p>
            <h1>How Paw &amp; Whisker works, and where it stops.</h1>
            <p className="pw-lede onDark">A plain account of what happens when you ask a question, what the labels mean, and what this site will never do.</p>
          </div>
        </section>
        <section className="pw-section">
          <div className="pw-wrap pw-narrow content-copy">
            <h2>Where answers come from</h2>
            <p>The free chat uses an AI language model that writes each answer from your question, any photo you attach and the pet profile you saved. It generates text. It does not look anything up live, it is not reading a source as you wait, and there is no veterinarian on the other end. It can be wrong, and it can miss things a clinic would catch in seconds.</p>
            <p>Your question, photo and profile are sent through our server to our AI provider and are not stored by us. Nothing is stored in an account, because there are no accounts.</p>
            <h2>Reference pages are further reading</h2>
            <p>Our food articles and guides link to public references. They are there so you can read more. Linking to them is not an endorsement by, or a partnership with, any of these organisations, and the chat does not quote them live.</p>
            <ul>{references.map(([label, href]) => <li key={href}><a href={href} rel="noopener noreferrer">{label}</a></li>)}</ul>
          </div>
        </section>
        <section className="pw-section alt" aria-labelledby="levels-h">
          <div className="pw-wrap pw-narrow">
            <h2 id="levels-h">The four urgency labels</h2>
            <p>Every answer starts with one of these labels, in words, so you never have to guess from a colour. The symptom check uses the same meanings.</p>
            <div className="pw-levels">
              {urgencyOrder.map(level => (
                <div key={level} className="pw-level" data-testid={`level-${level}`}>
                  <UrgencyBadge level={level} />
                  <p>{urgencyLevels[level].meaning}</p>
                  <p><strong>What to do:</strong> {urgencyLevels[level].action}</p>
                </div>
              ))}
            </div>
            <p><strong>Monitor at home is not a guarantee.</strong> If we cannot tell, we choose the more cautious label.</p>
          </div>
        </section>
        <section className="pw-section">
          <div className="pw-wrap pw-narrow content-copy">
            <h2>When to go, whatever the label says</h2>
            <ul>
              <li>Trouble breathing, collapse, seizures, heavy bleeding or a swollen, retching belly: go to an emergency vet immediately.</li>
              <li>Anything your pet may have eaten that is poisonous: call an emergency vet or a poison helpline now, without waiting for signs.</li>
              <li>A cat straining without passing urine, or severe pain: emergency vet now.</li>
              <li>Puppies, kittens, older pets and small animals can worsen fast: do not wait overnight.</li>
              <li>You are worried and the answer sounds calm: trust your worry and call. <a href="/find-a-vet?urgent=1">Find a vet near you</a>.</li>
            </ul>
            <h2>What it never does</h2>
            <ul>
              <li>It does not diagnose.</li>
              <li>It does not give medicine doses or prescriptions.</li>
              <li>It does not tell you to induce vomiting or change a prescribed treatment.</li>
              <li>It does not replace an examination, tests or your own vet.</li>
            </ul>
            <h2>Review status</h2>
            <ReviewerStatus />
            <p>Reviewer credit applies only to educational content. Individual AI answers are not reviewed by a veterinarian and remain general information, not clinical advice.</p>
            <h2>Why I built it</h2>
            <p>I'm Paul, and I'm a pet parent, not a vet. I live with two cats: Lucky, a black female aged 1, and Sugar, a brown tabby female aged 7. I once uploaded a photo of a problem on Lucky to an earlier version of this site. It suggested taking her to a vet quickly. I did, and she had a bad infection and was treated. That is one owner's experience, not proof that it works: AI cannot diagnose, results vary, and when in doubt I call a vet. <a href="/about">More about Paul and the cats</a>.</p>
          </div>
        </section>
        <section className="pw-section alt">
          <div className="pw-wrap pw-narrow">
            <WrongAnswerForm />
            <p className="pw-disc">General information, not veterinary advice. For urgent signs, go to an emergency vet immediately. <a href="/#free-chat">Back to the free chat</a>.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
