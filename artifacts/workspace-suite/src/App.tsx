import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AppNav } from '@/components/AppNav';
import { ActiveLeadProvider } from '@/context/ActiveLeadContext';
import { Home } from '@/pages/Home';
import { Leads } from '@/pages/Leads';
import { Tasks } from '@/pages/Tasks';
import { Forms as QuoteBuilder } from '@/pages/Forms';
import { ProposalDoc } from '@/pages/ProposalDoc';
import { Timeline } from '@/pages/Timeline';
import { Calendar } from '@/pages/Calendar';
import { Settings } from '@/pages/Settings';
import { Apps } from '@/pages/Apps';
import NotFound from '@/pages/NotFound';

const queryClient = new QueryClient();

function Router() {
  return (
    <>
      <AppNav />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/leads" component={Leads} />
        <Route path="/tasks" component={Tasks} />
        <Route path="/quote-builder" component={QuoteBuilder} />
        <Route path="/proposal-doc" component={ProposalDoc} />
        <Route path="/timeline" component={Timeline} />
        <Route path="/calendar" component={Calendar} />
        <Route path="/settings" component={Settings} />
        <Route path="/apps" component={Apps} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <ActiveLeadProvider>
            <Router />
          </ActiveLeadProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
