import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useInvitePreview, useAcceptInvitation } from "@/hooks/use-school";
import { Button } from "@/components/ui/button";
import { GraduationCap, School, ShieldCheck, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import type { SchoolRole } from "@shared/schema";

const PENDING_INVITE_KEY = "pendingInviteToken";

function roleLabel(role: SchoolRole) {
  const map: Record<SchoolRole, string> = {
    admin: "Admin",
    school_head: "School Head",
    teacher: "Teacher",
    student: "Student",
  };
  return map[role] ?? role;
}

function roleDescription(role: SchoolRole) {
  const map: Record<SchoolRole, string> = {
    admin: "Full access to manage all school data.",
    school_head: "Read-only access to view all school performance data and generate reports.",
    teacher: "Create and manage your own classes, students, and assessments.",
    student: "View your own performance reports and learning progress.",
  };
  return map[role] ?? "";
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { data: preview, isLoading: previewLoading } = useInvitePreview(token ?? null);
  const acceptMutation = useAcceptInvitation();
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // After login redirect: check if there's a pending token and auto-accept
  useEffect(() => {
    if (!authLoading && isAuthenticated && token) {
      const pending = localStorage.getItem(PENDING_INVITE_KEY);
      if (pending === token) {
        localStorage.removeItem(PENDING_INVITE_KEY);
        // Auto-accept
        acceptMutation.mutateAsync(token)
          .then(() => {
            setAccepted(true);
            setTimeout(() => setLocation("/app"), 1500);
          })
          .catch((e) => setError(e.message));
      }
    }
  }, [authLoading, isAuthenticated, token]);

  function handleLoginToAccept() {
    if (token) localStorage.setItem(PENDING_INVITE_KEY, token);
    window.location.href = "/api/login";
  }

  async function handleAccept() {
    if (!token) return;
    setError(null);
    try {
      await acceptMutation.mutateAsync(token);
      setAccepted(true);
      setTimeout(() => setLocation("/app"), 1500);
    } catch (e: any) {
      setError(e.message ?? "Failed to accept invitation");
    }
  }

  if (previewLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-destructive/10 grid place-items-center mx-auto">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold">Invitation Not Found</h1>
          <p className="text-muted-foreground text-sm">
            This invitation link has expired, already been used, or doesn't exist.
          </p>
          <Button variant="outline" onClick={() => setLocation("/")}>
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-green-100 grid place-items-center mx-auto">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold">Welcome!</h1>
          <p className="text-muted-foreground text-sm">
            You have joined {preview.schoolName}. Redirecting you to the app…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-sm w-full space-y-6">
        {/* App logo */}
        <div className="text-center space-y-2">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-accent grid place-items-center mx-auto shadow-lg">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <p className="font-bold text-lg" style={{ fontFamily: "var(--font-display)" }}>Mastery</p>
        </div>

        {/* Invite card */}
        <div className="rounded-2xl border border-border/70 bg-card shadow-sm p-6 space-y-5">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">You've been invited to join</p>
            <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
              {preview.schoolName}
            </h1>
            {preview.inviteeName && (
              <p className="text-sm text-muted-foreground">for {preview.inviteeName}</p>
            )}
          </div>

          <div className="rounded-xl bg-muted/50 border border-border/50 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Your role: {roleLabel(preview.role)}</p>
            </div>
            <p className="text-xs text-muted-foreground pl-6">{roleDescription(preview.role)}</p>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {isAuthenticated ? (
            <Button
              className="w-full"
              onClick={handleAccept}
              disabled={acceptMutation.isPending}
              data-testid="button-accept-invitation"
            >
              {acceptMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Accepting…</>
              ) : (
                "Accept Invitation"
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground text-center">
                You need to sign in to accept this invitation.
              </p>
              <Button
                className="w-full"
                onClick={handleLoginToAccept}
                data-testid="button-login-to-accept"
              >
                Sign In to Accept
              </Button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          <School className="inline h-3 w-3 mr-1" />
          Mastery — Student Performance Tracking
        </p>
      </div>
    </div>
  );
}
