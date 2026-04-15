const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/3cI6oG32021Bedm1Xkgw002";

const features = [
  {
    icon: "🐾",
    color: "from-purple-500 to-pink-500",
    bg: "bg-purple-50",
    title: "Any Pet, Any Question",
    description: "Dogs, cats, birds, rabbits, reptiles — expert-level guidance for every furry, feathered, or scaly friend.",
  },
  {
    icon: "💬",
    color: "from-pink-500 to-rose-500",
    bg: "bg-pink-50",
    title: "Real Conversation",
    description: "Chat back and forth like talking to a knowledgeable friend — not filling out a form.",
  },
  {
    icon: "⚡",
    color: "from-amber-400 to-orange-500",
    bg: "bg-amber-50",
    title: "Instant Answers",
    description: "No waiting rooms. No appointments. Get guidance in seconds, any time of day or night.",
  },
  {
    icon: "🏥",
    color: "from-teal-400 to-cyan-500",
    bg: "bg-teal-50",
    title: "Health & Behavior",
    description: "Mysterious symptoms, tricky behaviors, travel tips, daily care routines — we've got you covered.",
  },
];

const stats = [
  { value: "24/7", label: "Always available" },
  { value: "$4.99", label: "Per month" },
  { value: "All pets", label: "Every species" },
  { value: "Instant", label: "AI responses" },
];

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/logo.svg" alt="Paw And Whisker Logo" className="w-9 h-9" />
      <div className="leading-tight">
        <div className="font-black text-lg tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">
          Paw And Whisker
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-50 via-white to-pink-50">

      {/* Header */}
      <header className="sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-purple-100 shadow-sm">
        <Logo />
        <nav className="hidden sm:flex items-center gap-6 text-sm font-semibold text-slate-600">
          <a href="#features" className="hover:text-purple-600 transition-colors">Features</a>
          <a href="#meet-the-team" className="hover:text-purple-600 transition-colors">Meet the Team</a>
        </nav>
        <a
          href={STRIPE_PAYMENT_LINK}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
        >
          Start for $4.99/mo ✨
        </a>
      </header>

      <main className="flex-1">

        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-purple-200/40 blur-3xl" />
            <div className="absolute top-40 -left-20 w-72 h-72 rounded-full bg-pink-200/40 blur-3xl" />
            <div className="absolute bottom-0 right-1/3 w-60 h-60 rounded-full bg-amber-100/40 blur-3xl" />
          </div>

          <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-12 lg:pt-20 lg:pb-16">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

              {/* Left: Text */}
              <div className="flex-1 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 text-xs font-bold px-4 py-2 rounded-full mb-6 border border-purple-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                  AI-powered pet care, available 24/7 🐱
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight mb-6 text-slate-800">
                  Your pet's personal{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-500 to-rose-400">
                    AI health expert
                  </span>
                  <span className="block mt-1">is here 🐾</span>
                </h1>

                <p className="text-lg sm:text-xl text-slate-500 max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed font-medium">
                  Get instant answers about your pet's health, behavior, and care — for any animal, any time. Just chat!
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                  <a
                    href={STRIPE_PAYMENT_LINK}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-black text-lg px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
                  >
                    <span>Start for $4.99/month</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </a>
                  <a
                    href="/chat"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-purple-700 font-bold text-base px-6 py-4 rounded-2xl border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 transition-all duration-200"
                  >
                    Try it free →
                  </a>
                </div>

                <p className="mt-4 text-sm text-slate-400 font-medium">
                  Cancel anytime · No commitment · Always here for you 💜
                </p>
              </div>

              {/* Right: Cat Photo */}
              <div className="flex-shrink-0 w-full max-w-sm lg:max-w-md relative">
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                  <img
                    src="/cats.jpg"
                    alt="Lucky and her sister – the Paw And Whisker team mascots"
                    className="w-full h-80 lg:h-96 object-cover object-top"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg">
                      <p className="font-black text-slate-800 text-sm">Meet Lucky & her sister! 🐾</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">Our official mascots — and the inspiration for everything we do</p>
                    </div>
                  </div>
                </div>

                {/* Floating badges */}
                <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-lg px-3 py-2 border border-purple-100">
                  <p className="text-xs font-black text-purple-700">⚡ Instant answers</p>
                </div>
                <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-lg px-3 py-2 border border-pink-100">
                  <p className="text-xs font-black text-pink-600">💜 Trusted by pet parents</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="bg-gradient-to-r from-purple-600 to-pink-500 py-8">
          <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl sm:text-3xl font-black text-white">{stat.value}</p>
                <p className="text-sm text-purple-100 font-semibold mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4 text-slate-800">
              Everything your pet needs 🐾
            </h2>
            <p className="text-slate-500 text-lg font-medium max-w-xl mx-auto">
              Ask anything. Get thoughtful, helpful answers instantly — no waiting room required.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 group"
              >
                <div className={`w-12 h-12 rounded-2xl ${feature.bg} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-200`}>
                  {feature.icon}
                </div>
                <h3 className="font-black text-slate-800 text-lg mb-2">{feature.title}</h3>
                <p className="text-slate-500 leading-relaxed font-medium">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Meet the Mascots */}
        <section id="meet-the-team" className="bg-gradient-to-br from-purple-50 to-pink-50 py-20 border-y border-purple-100">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4 text-slate-800">
                Meet the Inspiration 😻
              </h2>
              <p className="text-slate-500 text-lg font-medium">
                Two real cats. A whole lot of love. And the reason this service exists.
              </p>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-shrink-0 w-full md:w-1/2 max-w-md mx-auto">
                <div className="relative rounded-3xl overflow-hidden shadow-xl border-4 border-white">
                  <img
                    src="/cats.jpg"
                    alt="Lucky and her sister"
                    className="w-full h-72 object-cover object-center"
                  />
                </div>
              </div>

              <div className="flex-1 space-y-5">
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-purple-100">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">🖤</span>
                    <h3 className="font-black text-slate-800 text-lg">Lucky</h3>
                    <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2.5 py-1 rounded-full">1 yr old</span>
                  </div>
                  <p className="text-slate-500 font-medium leading-relaxed">
                    The sleek black panther of the house. Lucky is full of energy and always getting into something — keeping us on our toes and the vet on speed dial!
                  </p>
                </div>

                <div className="bg-white rounded-3xl p-5 shadow-sm border border-pink-100">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">🐱</span>
                    <h3 className="font-black text-slate-800 text-lg">Lucky's Sister</h3>
                    <span className="bg-pink-100 text-pink-700 text-xs font-bold px-2.5 py-1 rounded-full">7 yrs old</span>
                  </div>
                  <p className="text-slate-500 font-medium leading-relaxed">
                    The wise and distinguished tabby elder. She's seen it all, done it all, and judges everything from her favorite sunny spot — with grace and whisker flicks.
                  </p>
                </div>

                <p className="text-slate-400 text-sm font-semibold italic pl-2">
                  "We built Paw And Whisker because every pet parent deserves instant, trustworthy answers — just like we needed for these two." 💜
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Demo Chat */}
        <section className="max-w-4xl mx-auto px-6 py-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4 text-slate-800">
              See it in action 💬
            </h2>
            <p className="text-slate-500 text-lg font-medium">Real questions, real answers — instantly</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden max-w-2xl mx-auto">
            <div className="bg-gradient-to-r from-purple-600 to-pink-500 px-5 py-4 flex items-center gap-3">
              <img src="/logo.svg" alt="" className="w-7 h-7" />
              <span className="text-white font-black text-sm">Paw And Whisker AI</span>
              <span className="ml-auto text-xs text-white/70 bg-white/20 px-2.5 py-1 rounded-full font-semibold">Live demo</span>
            </div>
            <div className="p-5 space-y-4 bg-gradient-to-b from-slate-50/50 to-white">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-200 to-pink-200 flex items-center justify-center text-sm flex-shrink-0 mt-0.5 shadow-sm">😊</div>
                <div className="bg-slate-100 text-slate-700 rounded-3xl rounded-tl-lg px-4 py-3 text-sm max-w-xs font-medium shadow-sm">
                  My cat has been hiding under the bed all day and won't eat. Should I be worried?
                </div>
              </div>
              <div className="flex gap-3 flex-row-reverse">
                <img src="/logo.svg" alt="" className="w-8 h-8 flex-shrink-0 mt-0.5" />
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 text-slate-700 rounded-3xl rounded-tr-lg px-4 py-3 text-sm max-w-sm border border-purple-100 shadow-sm font-medium">
                  That's definitely worth paying attention to! 🐱 Hiding and not eating together can signal stress, pain, or illness. Is this behavior new? Any recent changes at home — new people, furniture moved, a new pet?
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-200 to-pink-200 flex items-center justify-center text-sm flex-shrink-0 mt-0.5 shadow-sm">😊</div>
                <div className="bg-slate-100 text-slate-700 rounded-3xl rounded-tl-lg px-4 py-3 text-sm max-w-xs font-medium shadow-sm">
                  It's new. We had guests over yesterday.
                </div>
              </div>
              <div className="flex gap-3 flex-row-reverse">
                <img src="/logo.svg" alt="" className="w-8 h-8 flex-shrink-0 mt-0.5" />
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 text-slate-700 rounded-3xl rounded-tr-lg px-4 py-3 text-sm max-w-sm border border-purple-100 shadow-sm font-medium">
                  That explains a lot! 🥰 Cats are very sensitive to household changes — guests bring new smells, sounds, and energy. This is likely stress-related. Give her quiet space, keep her routine consistent, and she should bounce back soon!
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-br from-purple-600 via-violet-600 to-pink-500 py-20 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
          </div>
          <div className="relative max-w-3xl mx-auto px-6 text-center">
            <div className="text-5xl mb-6">🐾</div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4 text-white">
              Your pet deserves the best
            </h2>
            <p className="text-purple-100 text-lg font-medium mb-10 max-w-xl mx-auto">
              Join pet owners who get instant, thoughtful guidance for their animals — anytime, anywhere.
            </p>
            <a
              href={STRIPE_PAYMENT_LINK}
              className="inline-flex items-center gap-3 bg-white text-purple-700 font-black text-xl px-10 py-5 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200"
            >
              <span>Start for $4.99/month</span>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
            <p className="mt-5 text-sm text-purple-200 font-semibold">
              Powered by AI · Not a substitute for veterinary care · Cancel anytime
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 px-6 py-10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="" className="w-9 h-9" />
            <div>
              <p className="font-black text-white">Paw And Whisker</p>
              <p className="text-xs text-slate-500">AI pet care for every pet parent</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm font-semibold">
            <a href="/chat" className="hover:text-white transition-colors">Try AI Chat</a>
            <span className="text-slate-600">·</span>
            <p className="text-slate-500 text-xs">Always consult a licensed vet for emergencies</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
