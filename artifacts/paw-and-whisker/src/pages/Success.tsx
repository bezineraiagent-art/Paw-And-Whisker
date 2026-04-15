import { Link } from "wouter";

export default function Success() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="max-w-md w-full text-center">

        <div className="flex justify-center mb-6">
          <img src="/logo.svg" alt="Paw And Whisker" className="w-24 h-24" />
        </div>

        <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-sm font-bold px-4 py-2 rounded-full mb-6 border border-green-200">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          Payment successful! 🎉
        </div>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-4 text-slate-800">
          Welcome to{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">
            Paw And Whisker!
          </span>
        </h1>

        <p className="text-slate-500 text-lg font-medium mb-8 leading-relaxed">
          Your subscription is active 🐾 You now have full 24/7 access to your personal pet AI assistant — for health, behavior, travel, and daily care questions.
        </p>

        <Link
          href="/chat"
          className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-black text-lg px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 w-full justify-center"
        >
          <span>Access your AI here</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>

        <p className="mt-6 text-sm text-slate-400 font-medium">
          Bookmark{" "}
          <Link href="/chat" className="text-purple-600 hover:underline font-bold">
            this link
          </Link>{" "}
          so your AI assistant is always one tap away 💜
        </p>
      </div>
    </div>
  );
}
