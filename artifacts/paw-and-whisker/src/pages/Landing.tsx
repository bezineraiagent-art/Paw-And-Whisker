const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/YOUR_STRIPE_LINK_HERE";

const features = [
  {
    icon: "🐾",
    title: "Any pet, any question",
    description: "Dogs, cats, birds, rabbits, fish, reptiles — we cover them all with expert-level knowledge.",
  },
  {
    icon: "💬",
    title: "Real conversation",
    description: "Chat back and forth like you're talking to a knowledgeable friend, not filling out a form.",
  },
  {
    icon: "⚡",
    title: "Instant answers",
    description: "No waiting rooms, no appointments. Get guidance in seconds, any time of day or night.",
  },
  {
    icon: "🏥",
    title: "Health & behavior",
    description: "From mysterious symptoms to tricky behaviors, travel tips to daily care routines.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐾</span>
          <span className="font-semibold text-lg tracking-tight">pawandwhisker.com</span>
        </div>
        <a
          href={STRIPE_PAYMENT_LINK}
          className="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Start for $4.99/mo
        </a>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-accent/20 pointer-events-none" />
          <div className="relative max-w-4xl mx-auto px-6 pt-20 pb-24 text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-6 border border-primary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              AI-powered pet care, available 24/7
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6">
              Your personal AI for your{" "}
              <span className="text-primary relative">
                pet's health and behavior
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Get instant answers for your cat's behavior, travel, and daily care in seconds
            </p>

            <a
              href={STRIPE_PAYMENT_LINK}
              className="inline-flex items-center gap-3 bg-primary text-primary-foreground font-semibold text-lg px-8 py-4 rounded-xl shadow-md hover:shadow-lg hover:bg-primary/90 transition-all duration-200 active:scale-[0.98]"
            >
              <span>Start for $4.99/month</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>

            <p className="mt-4 text-sm text-muted-foreground">
              Cancel anytime. No commitment.
            </p>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
              Everything your pet needs, in one conversation
            </h2>
            <p className="text-muted-foreground text-lg">
              Ask anything. Get thoughtful, helpful answers instantly.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-card border border-card-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-card border-y border-border py-16">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
                See it in action
              </h2>
              <p className="text-muted-foreground text-lg">
                Real conversations, real answers
              </p>
            </div>

            <div className="bg-background rounded-2xl border border-border shadow-sm overflow-hidden max-w-2xl mx-auto">
              <div className="border-b border-border px-4 py-3 flex items-center gap-2">
                <span className="text-lg">🐾</span>
                <span className="text-sm font-medium">pawandwhisker.com</span>
                <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Live demo</span>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-sm flex-shrink-0 mt-0.5">😊</div>
                  <div className="bg-secondary text-secondary-foreground rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm max-w-xs">
                    My cat has been hiding under the bed all day and won't eat. Should I be worried?
                  </div>
                </div>
                <div className="flex gap-3 flex-row-reverse">
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-sm flex-shrink-0 mt-0.5">🐾</div>
                  <div className="bg-primary/10 text-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm max-w-sm border border-primary/20">
                    That's definitely worth paying attention to. Hiding and not eating can be signs of stress, pain, or illness. A few questions: is this behavior new, or does your cat sometimes do this? Any recent changes at home — new people, furniture moved, new pet?
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-sm flex-shrink-0 mt-0.5">😊</div>
                  <div className="bg-secondary text-secondary-foreground rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm max-w-xs">
                    It's new. We had some guests over yesterday.
                  </div>
                </div>
                <div className="flex gap-3 flex-row-reverse">
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-sm flex-shrink-0 mt-0.5">🐾</div>
                  <div className="bg-primary/10 text-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm max-w-sm border border-primary/20">
                    That explains a lot! Cats are very sensitive to household changes. Guests can be overwhelming — new smells, sounds, and energy. This is likely stress-related. Give your cat quiet space, keep their routine consistent...
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Ready to get answers?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Join pet owners who get instant, thoughtful guidance for their animals.
          </p>
          <a
            href={STRIPE_PAYMENT_LINK}
            className="inline-flex items-center gap-3 bg-primary text-primary-foreground font-semibold text-lg px-8 py-4 rounded-xl shadow-md hover:shadow-lg hover:bg-primary/90 transition-all duration-200 active:scale-[0.98]"
          >
            Start for $4.99/month
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
          <p className="mt-4 text-sm text-muted-foreground">
            Powered by AI. Not a substitute for veterinary care.
          </p>
        </section>
      </main>

      <footer className="border-t border-border px-6 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="text-xl">🐾</span>
            <span className="font-medium">pawandwhisker.com</span>
          </div>
          <p>Always consult a licensed veterinarian for medical emergencies.</p>
        </div>
      </footer>
    </div>
  );
}
