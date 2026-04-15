import { useEffect, useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Loader2 } from "lucide-react";

import AppIndexPage from "@/pages/AppIndexPage";
import DashboardPage from "@/pages/DashboardPage";
import ClassesPage from "@/pages/ClassesPage";
import SubjectsPage from "@/pages/SubjectsPage";
import AcademicSetupPage from "@/pages/AcademicSetupPage";
import AssessmentsPage from "@/pages/AssessmentsPage";
import ReportsPage from "@/pages/ReportsPage";
import SettingsPage from "@/pages/SettingsPage";
import StudentPage from "@/pages/StudentPage";
import AdminPage from "@/pages/AdminPage";
import StudentPortalPage from "@/pages/StudentPortalPage";
import InvitePage from "@/pages/InvitePage";
import NotFoundPremium from "@/pages/NotFoundPremium";

import { useAuth } from "@/hooks/use-auth";
import { useMySchool, useCreateSchool } from "@/hooks/use-school";

const PENDING_INVITE_KEY = "pendingInviteToken";

function SchoolSetupModal({ onClose }: { onClose: () => void }) {
  const [schoolName, setSchoolName] = useState("");
  const createSchool = useCreateSchool();
  const [, setLocation] = useLocation();

  async function handleCreate() {
    if (!schoolName.trim()) return;
    await createSchool.mutateAsync(schoolName.trim());
    onClose();
    setLocation("/app");
  }

  return (
    <Dialog open>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent grid place-items-center shadow-sm">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <DialogTitle>Welcome to Mastery!</DialogTitle>
          </div>
          <DialogDescription className="sr-only">Create your school to get started with Mastery.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Set up your school profile to get started. You can invite teachers, school heads, and students later.
          </p>
          <div>
            <Label htmlFor="school-name">School Name</Label>
            <Input
              id="school-name"
              data-testid="input-school-name"
              className="mt-1.5"
              placeholder="e.g. Accra Academy"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={!schoolName.trim() || createSchool.isPending}
            data-testid="button-create-school"
            className="w-full"
          >
            {createSchool.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating…</>
            ) : (
              "Create My School"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SchoolGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: mySchool, isLoading: schoolLoading } = useMySchool();
  const [showSetup, setShowSetup] = useState(false);
  const [, setLocation] = useLocation();

  // Check for a pending invite token or no school, after auth settles
  useEffect(() => {
    if (authLoading || schoolLoading || !isAuthenticated) return;

    const pending = localStorage.getItem(PENDING_INVITE_KEY);
    if (pending) {
      // Redirect to invite page so it can accept automatically
      localStorage.removeItem(PENDING_INVITE_KEY);
      setLocation(`/invite/${pending}`);
      return;
    }

    // mySchool is null only when 404 (no school yet); undefined means still loading or unauthenticated
    if (mySchool === null) {
      setShowSetup(true);
    } else if (mySchool && mySchool.school) {
      setShowSetup(false);
    }
  }, [isAuthenticated, authLoading, schoolLoading, mySchool]);

  return (
    <>
      {showSetup && <SchoolSetupModal onClose={() => setShowSetup(false)} />}
      {children}
    </>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={AppIndexPage} />

      {/* Invitation landing (public) */}
      <Route path="/invite/:token" component={InvitePage} />

      {/* App shell pages */}
      <Route path="/app" component={DashboardPage} />
      <Route path="/app/classes" component={ClassesPage} />
      <Route path="/app/subjects" component={SubjectsPage} />
      <Route path="/app/academic" component={AcademicSetupPage} />
      <Route path="/app/assessments" component={AssessmentsPage} />
      <Route path="/app/reports" component={ReportsPage} />
      <Route path="/app/settings" component={SettingsPage} />
      <Route path="/app/admin" component={AdminPage} />
      <Route path="/app/portal" component={StudentPortalPage} />

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
        <SchoolGate>
          <Router />
        </SchoolGate>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
