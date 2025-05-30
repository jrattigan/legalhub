import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { SettingsProvider } from "@/context/settings-context";
import { ScrollProvider } from "@/context/scroll-context";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Deals from "@/pages/deals";
import NewDeal from "@/pages/new-deal";
import DealDetailPage from "@/pages/deal-detail";
import Documents from "@/pages/documents";
import Counsel from "@/pages/counsel";
import AnalyticsNew from "@/pages/analytics-new";
import Companies from "@/pages/companies";
import Settings from "@/pages/settings";
import CompaniesList from "@/components/companies/companies-list";
import LawFirmsList from "@/components/counsel/law-firms-list";
// Import Tools pages
import ToolsPage from "./pages/tools";
import RedlinePage from "./pages/redline";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/companies" component={Companies} />
      <Route path="/companies/:id" component={Companies} />
      <Route path="/deals" component={Deals} />
      <Route path="/deals/new" component={NewDeal} />
      <Route path="/deals/:id" component={DealDetailPage} />
      <Route path="/documents" component={Documents} />
      <Route path="/counsel" component={Counsel} />
      <Route path="/counsel/:id" component={Counsel} />
      <Route path="/analytics" component={AnalyticsNew} />
      <Route path="/settings" component={Settings} />
      {/* Tools section routes */}
      <Route path="/tools" component={ToolsPage} />
      <Route path="/tools/redline" component={RedlinePage} />
      {/* Iframe content routes */}
      <Route path="/companies-list" component={CompaniesList} />
      <Route path="/law-firms-list" component={LawFirmsList} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <ScrollProvider>
          <Router />
          <Toaster />
        </ScrollProvider>
      </SettingsProvider>
    </QueryClientProvider>
  );
}

export default App;
