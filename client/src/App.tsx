import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import AppIndexPage from "@/pages/AppIndexPage";
import DashboardPage from "@/pages/DashboardPage";
import ClassesPage from "@/pages/ClassesPage";
import SubjectsPage from "@/pages/SubjectsPage";
import AcademicSetupPage from "@/pages/AcademicSetupPage";
import AssessmentsPage from "@/pages/AssessmentsPage";
import ReportsPage from "@/pages/ReportsPage";
import SettingsPage from "@/pages/SettingsPage";
import StudentPage from "@/pages/StudentPage";
import NotFoundPremium from "@/pages/NotFoundPremium";

function Router() {
  return (
    <Switch>
      <Route path="/" component={AppIndexPage} />

      {/* App shell pages */}
      <Route path="/app" component={DashboardPage} />
      <Route path="/app/classes" component={ClassesPage} />
      <Route path="/app/subjects" component={SubjectsPage} />
      <Route path="/app/academic" component={AcademicSetupPage} />
      <Route path="/app/assessments" component={AssessmentsPage} />
      <Route path="/app/reports" component={ReportsPage} />
      <Route path="/app/settings" component={SettingsPage} />

      {/* Student mastery detail */}
      <Route path="/app/students/:id" component={StudentPage} />

      {/* Fallback */}
      <Route component={NotFoundPremium} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
