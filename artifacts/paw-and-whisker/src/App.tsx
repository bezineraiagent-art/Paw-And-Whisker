import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import PublicHome from "@/pages/PublicHome";
import PublicPricing from "@/pages/PublicPricing";
import PublicAbout from "@/pages/PublicAbout";
import FoodChecker from "@/pages/FoodChecker";
import SymptomCheck from "@/pages/SymptomCheck";
import Success from "@/pages/Success";
import Chat from "@/pages/Chat";
import AdminAnalytics from "@/pages/AdminAnalytics";
import ContentPage from "@/pages/ContentPage";
import SiteFooter from "@/components/SiteFooter";
import PageSeo from "@/components/PageSeo";
import { pages } from "@/content/site";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={PublicHome} />
      <Route path="/pricing" component={PublicPricing} />
      <Route path="/about" component={PublicAbout} />
      <Route path="/tools/toxic-food-checker" component={FoodChecker} />
      <Route path="/tools/symptom-check"><SymptomCheck /></Route>
      <Route path="/tools/symptom-check/results"><SymptomCheck results /></Route>
      <Route path="/success" component={Success} />
      <Route path="/chat" component={Chat} />
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
          <Router />
          <SiteFooter />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
