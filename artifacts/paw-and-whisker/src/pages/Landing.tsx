const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/3cI6oG32021Bedm1Xkgw002";

function CtaButton({ className = "" }: { className?: string }) {
  return (
    <a
      href={STRIPE_PAYMENT_LINK}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold text-base px-7 py-4 rounded-2xl shadow-md hover:shadow-lg hover:opacity-95 transition-all duration-150 ${className}`}
    >
      Start for $4.99/month
    </a>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-800" style={{ fontFamily: "'Inter', 'Nunito', sans-serif" }}>

      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0">
              <img
                src="/app-logo.png"
                alt="Paw And Whisker"
                className="w-full h-full object-cover"
                style={{ transform: "scale(1.42)", transformOrigin: "center" }}
              />
            </div>
            <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              Paw And Whisker
            </span>
          </div>
          <CtaButton className="text-sm py-2.5 px-5 rounded-xl" />
        </div>
      </header>

      <main className="flex-1">

        <section className="max-w-5xl mx-auto px-5 pt-16 pb-14 text-center">
          <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-8 border border-purple-100">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
            AI-powered pet care · Available 24/7
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight mb-5">
            Your pet's personal{" "}
            <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              AI health expert
            </span>
          </h1>

          <p className="text-lg text-slate-500 max-w-xl mx-auto mb-10 leading-relaxed">
            Get instant answers for your pet's behavior, health, and daily care — any animal, any time.
          </p>

          <CtaButton className="text-lg px-10 py-4 rounded-2xl mx-auto" />

          <p className="mt-4 text-sm text-slate-400">
            Cancel anytime · No commitment
          </p>
        </section>

        <section className="bg-slate-50 py-16 border-y border-slate-100">
          <div className="max-w-2xl mx-auto px-5">
            <h2 className="text-2xl sm:text-3xl font-black text-center mb-10 tracking-tight">
              See it in action
            </h2>

            <div className="bg-white rounded-3xl shadow-md border border-slate-100 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-pink-500 px-5 py-3.5 flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg overflow-hidden">
                  <img
                    src="/app-logo.png"
                    alt=""
                    className="w-full h-full object-cover"
                    style={{ transform: "scale(1.42)", transformOrigin: "center" }}
                  />
                </div>
                <span className="text-white font-bold text-sm">Paw And Whisker AI</span>
                <span className="ml-auto flex items-center gap-1.5 text-xs text-white/80">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  Online
                </span>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm flex-shrink-0">
                    😊
                  </div>
                  <div className="bg-slate-100 text-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 text-sm max-w-xs leading-relaxed">
                    My cat has been hiding under the bed and won't eat. Should I be worried?
                  </div>
                </div>

                <div className="flex gap-3 flex-row-reverse">
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                    <img
                      src="/app-logo.png"
                      alt=""
                      className="w-full h-full object-cover"
                      style={{ transform: "scale(1.42)", transformOrigin: "center" }}
                    />
                  </div>
                  <div className="bg-purple-50 text-slate-700 rounded-2xl rounded-tr-sm px-4 py-3 text-sm max-w-sm border border-purple-100 leading-relaxed">
                    That's worth paying attention to! Hiding + not eating together can signal stress, pain, or illness. Is this new? Any recent changes at home?
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm flex-shrink-0">
                    😊
                  </div>
                  <div className="bg-slate-100 text-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 text-sm max-w-xs leading-relaxed">
                    We had guests over yesterday.
                  </div>
                </div>

                <div className="flex gap-3 flex-row-reverse">
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                    <img
                      src="/app-logo.png"
                      alt=""
                      className="w-full h-full object-cover"
                      style={{ transform: "scale(1.42)", transformOrigin: "center" }}
                    />
                  </div>
                  <div className="bg-purple-50 text-slate-700 rounded-2xl rounded-tr-sm px-4 py-3 text-sm max-w-sm border border-purple-100 leading-relaxed">
                    That explains it! 🐱 Cats are very sensitive to strangers and new smells. Give her a quiet space, keep her routine, and she should bounce back in 24–48 hours.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-5 py-16">
          <h2 className="text-2xl sm:text-3xl font-black text-center mb-12 tracking-tight">
            Everything your pet needs
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: "💬", title: "Real Conversation", desc: "Chat naturally — like a knowledgeable friend who never sleeps." },
              { icon: "⚡", title: "Instant Answers", desc: "No waiting rooms. No appointments. Guidance in seconds." },
              { icon: "🐾", title: "Any Pet", desc: "Cats, dogs, birds, rabbits, reptiles — we cover every species." },
              { icon: "🏥", title: "Health & Behavior", desc: "Symptoms, training, nutrition, travel — all in one place." },
            ].map((b) => (
              <div
                key={b.title}
                className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center text-xl mb-4">
                  {b.icon}
                </div>
                <h3 className="font-bold text-slate-800 mb-1.5">{b.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-gradient-to-br from-purple-50 to-pink-50 border-y border-purple-100 py-16">
          <div className="max-w-4xl mx-auto px-5">
            <h2 className="text-2xl sm:text-3xl font-black text-center mb-12 tracking-tight">
              Meet the inspiration
            </h2>

            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-full md:w-1/2 flex-shrink-0">
                <div className="rounded-3xl overflow-hidden shadow-lg border-4 border-white">
                  <img
                    src="/cats.jpg"
                    alt="Lucky and her sister"
                    className="w-full h-64 md:h-72 object-cover object-top"
                  />
                </div>
              </div>

              <div className="flex-1 space-y-4 w-full">
                <div className="bg-white rounded-2xl p-5 border border-purple-100 shadow-sm">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="text-xl">🖤</span>
                    <p className="font-black text-slate-800">Lucky</p>
                    <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full">1 yr old</span>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Our sleek black panther — full of energy, endless curiosity, and just the right amount of mischief.
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-pink-100 shadow-sm">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="text-xl">🐱</span>
                    <p className="font-black text-slate-800">Lucky's Sister</p>
                    <span className="text-xs font-semibold text-pink-700 bg-pink-100 px-2.5 py-0.5 rounded-full">7 yrs old</span>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    The wise tabby elder. She judges from her sunny spot with grace — and inspired this service with every mysterious ailment.
                  </p>
                </div>

                <p className="text-xs text-slate-400 italic pl-1">
                  "We built Paw And Whisker because every pet parent deserves instant, trustworthy answers."
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-lg mx-auto px-5 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-black mb-2 tracking-tight">
            Simple pricing
          </h2>
          <p className="text-slate-400 text-sm mb-10">No hidden fees. No surprises.</p>

          <div className="bg-white border-2 border-purple-200 rounded-3xl p-8 shadow-md">
            <div className="mb-6">
              <span className="text-5xl font-black text-slate-800">$4.99</span>
              <span className="text-slate-400 text-lg font-medium">/month</span>
            </div>

            <ul className="space-y-3 mb-8 text-left">
              {[
                "Unlimited AI pet health conversations",
                "All pets supported — cats, dogs & more",
                "Available 24 hours a day, 7 days a week",
                "Instant access — no waiting",
                "Cancel anytime",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-slate-600">
                  <span className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <CtaButton className="w-full justify-center text-base py-4 rounded-xl" />
            <p className="mt-3 text-xs text-slate-400">Secure checkout via Stripe</p>
          </div>
        </section>

      </main>

      <footer className="bg-slate-900 text-slate-400 py-8 px-5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl overflow-hidden">
              <img
                src="/app-logo.png"
                alt=""
                className="w-full h-full object-cover"
                style={{ transform: "scale(1.42)", transformOrigin: "center" }}
              />
            </div>
            <span className="font-bold text-white text-sm">Paw And Whisker</span>
          </div>
          <p className="text-xs text-slate-500 text-center">
            AI guidance only · Always consult a licensed vet for emergencies · © 2026
          </p>
        </div>
      </footer>

    </div>
  );
}
