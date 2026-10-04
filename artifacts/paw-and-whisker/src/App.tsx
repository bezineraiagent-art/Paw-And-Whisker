import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import PublicHome from "@/pages/PublicHome";
import SiteFooter from "@/components/SiteFooter";
import PageSeo from "@/components/PageSeo";
import { pageMetadata as pages } from "@/content/metadata";

const PublicPricing = lazy(() => import("@/pages/PublicPricing"));
const PublicAbout = lazy(() => import("@/pages/PublicAbout"));
const FoodChecker = lazy(() => import("@/pages/FoodChecker"));
const SymptomCheck = lazy(() => import("@/pages/SymptomCheck"));
const FindVet = lazy(() => import("@/pages/FindVet"));
const ForVets = lazy(() => import("@/pages/ForVets"));
const Advertise = lazy(() => import("@/pages/Advertise"));
const SponsorshipPolicy = lazy(() => import("@/pages/SponsorshipPolicy"));
const AdminPromotions = lazy(() => import("@/pages/AdminPromotions"));
const AdminInbox = lazy(() => import("@/pages/AdminInbox"));
const Success = lazy(() => import("@/pages/Success"));
const AdminAnalytics = lazy(() => import("@/pages/AdminAnalytics"));
const ContentPage = lazy(() => import("@/pages/ContentPage"));
const HowItWorks = lazy(() => import("@/pages/HowItWorks"));
const VetReviewers = lazy(() => import("@/pages/VetReviewers"));
const NotFound = lazy(() => import("@/pages/not-found"));

function LegacyChat() {
  useEffect(() => { window.location.replace("/#free-chat"); }, []);
  return <main className="pw pw-section"><div className="pw-wrap"><p>Chat has moved. <a href="/#free-chat">Open the free chat</a>.</p></div></main>;
}

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={PublicHome} />
      <Route path="/how-it-works" component={HowItWorks} />
      <Route path="/vet-reviewers" component={VetReviewers} />
      <Route path="/pricing" component={PublicPricing} />
      <Route path="/about" component={PublicAbout} />
      <Route path="/tools/toxic-food-checker" component={FoodChecker} />
      <Route path="/tools/symptom-check"><SymptomCheck /></Route>
      <Route path="/tools/symptom-check/results"><SymptomCheck results /></Route>
      <Route path="/find-a-vet" component={FindVet} />
      <Route path="/for-vets" component={ForVets} />
      <Route path="/advertise" component={Advertise} />
      <Route path="/sponsorship-policy" component={SponsorshipPolicy} />
      <Route path="/admin/promotions" component={AdminPromotions} />
      <Route path="/admin/inbox" component={AdminInbox} />
      <Route path="/success" component={Success} />
      <Route path="/chat">{() => <LegacyChat />}</Route>
      <Route path="/admin/analytics" component={AdminAnalytics} />
      {pages.filter(page => page.kind).map(page => <Route key={page.path} path={page.path} component={ContentPage} />)}
      <Route path="/guides/" component={ContentPage} />
      <Route path="/puppy-kit" component={ContentPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <PageSeo />
          <Suspense fallback={<main className="pw pw-section" aria-busy="true"><div className="pw-wrap"><p role="status">Loading your page…</p></div></main>}><Router /></Suspense>
          <SiteFooter />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
