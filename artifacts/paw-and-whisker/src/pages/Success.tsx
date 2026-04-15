import { Link } from "wouter";

export default function Success() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-6 border border-primary/25">
          <span className="text-4xl">🐾</span>
        </div>

        <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-sm font-medium px-4 py-1.5 rounded-full mb-5 border border-green-200">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Payment successful
        </div>

        <h1 className="text-3xl font-bold tracking-tight mb-3">
          Welcome to pawandwhisker.com!
        </h1>

        <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
          Your subscription is active. You now have full access to your personal pet AI assistant — available 24/7 for health, behavior, travel, and daily care questions.
        </p>

        <Link
          href="/chat"
          className="inline-flex items-center gap-3 bg-primary text-primary-foreground font-semibold text-lg px-8 py-4 rounded-xl shadow-md hover:shadow-lg hover:bg-primary/90 transition-all duration-200 w-full justify-center"
        >
          <span>Access your AI here</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>

        <p className="mt-6 text-sm text-muted-foreground">
          Bookmark{" "}
          <Link href="/chat" className="text-primary hover:underline font-medium">
            this link
          </Link>{" "}
          so you can always find your AI assistant.
        </p>
      </div>
    </div>
  );
}
