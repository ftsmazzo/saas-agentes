import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

// Admin pages
import SetupWizard from "./pages/admin/SetupWizard";
import WelcomePage from "./pages/admin/Welcome";
import AdminDashboard from "./pages/admin/Dashboard";
import TenantsPage from "./pages/admin/Tenants";
import PlansPage from "./pages/admin/Plans";
import LogsPage from "./pages/admin/Logs";
import SettingsPage from "./pages/admin/Settings";

// Client pages
import AgentConfigPage from "./pages/client/AgentConfig";
import MetricsPage from "./pages/client/Metrics";
import SubscriptionPage from "./pages/client/Subscription";
import WhatsAppQRCode from "./pages/client/WhatsAppQRCode";
import AgentSettings from "./pages/client/AgentSettings";
import ClientLogin from "./pages/client/Login";
import ActivateAccount from "./pages/ActivateAccount";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      
      {/* Public Routes */}
      <Route path={"/activate/:token"} component={ActivateAccount} />
      
      {/* Admin Routes */}
      <Route path={"/admin/setup"} component={SetupWizard} />
      <Route path={"/admin"} component={WelcomePage} />
      <Route path={"/admin/dashboard"} component={AdminDashboard} />
      <Route path={"/admin/tenants"} component={TenantsPage} />
      <Route path={"/admin/plans"} component={PlansPage} />
      <Route path={"/admin/logs"} component={LogsPage} />
      <Route path={"/admin/settings"} component={SettingsPage} />
      
      {/* Client Routes */}
      <Route path={"/client/login"} component={ClientLogin} />
      <Route path={"/client"} component={WhatsAppQRCode} />
      <Route path={"/client/whatsapp"} component={WhatsAppQRCode} />
      <Route path={"/client/settings"} component={AgentSettings} />
      <Route path={"/client/agent"} component={AgentConfigPage} />
      <Route path={"/client/metrics"} component={MetricsPage} />
      <Route path={"/client/subscription"} component={SubscriptionPage} />
      
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
