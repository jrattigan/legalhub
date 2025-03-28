import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Deals from "@/pages/deals";
import NewDeal from "@/pages/new-deal";
import DealDetailPage from "@/pages/deal-detail";
import Documents from "@/pages/documents";
import Tasks from "@/pages/tasks";
import Counsel from "@/pages/counsel";
import Reports from "@/pages/reports";
import Companies from "@/pages/companies";

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
      <Route path="/tasks" component={Tasks} />
      <Route path="/counsel" component={Counsel} />
      <Route path="/reports" component={Reports} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
