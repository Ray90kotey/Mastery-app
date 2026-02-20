import { PropsWithChildren, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  FileText,
  GraduationCap,
  LogOut,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  testId: string;
};

function initials(first?: string | null, last?: string | null, email?: string | null) {
  const raw =
    [first, last].filter(Boolean).join(" ").trim() ||
    (email ? email.split("@")[0] : "Teacher");
  const parts = raw.split(" ").filter(Boolean);
  const a = parts[0]?.[0] ?? "T";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (a + b).toUpperCase();
}

export default function AppShell({ children }: PropsWithChildren) {
  const { user, logout, isLoggingOut } = useAuth();
  const [loc] = useLocation();

  const nav = useMemo<NavItem[]>(
    () => [
      { href: "/app", label: "Dashboard", icon: BarChart3, testId: "nav-dashboard" },
      { href: "/app/classes", label: "Classes", icon: Users, testId: "nav-classes" },
      { href: "/app/subjects", label: "Subjects", icon: BookOpen, testId: "nav-subjects" },
      { href: "/app/academic", label: "Academic Setup", icon: BookOpen, testId: "nav-academic" },
      { href: "/app/assessments", label: "Assessments", icon: ClipboardList, testId: "nav-assessments" },
      { href: "/app/reports", label: "Reports", icon: FileText, testId: "nav-reports" },
      { href: "/app/settings", label: "Settings", icon: Settings, testId: "nav-settings" },
    ],
    [],
  );

  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.email ||
    "Teacher";

  return (
    <div className="min-h-screen app-surface">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 lg:gap-8 items-start">
          <aside className="lg:sticky lg:top-6">
            <div className="glass grain-overlay rounded-2xl shadow-premium">
              <div className="p-5">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary to-accent grid place-items-center shadow-premium">
                    <GraduationCap className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold leading-none" style={{ fontFamily: "var(--font-display)" }}>
                        Mastery
                      </p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground border border-border/60">
                        <Sparkles className="h-3.5 w-3.5" />
                        MVP
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Track learning, share progress
                    </p>
                  </div>
                </div>

                <Separator className="my-4" />

                <nav className="space-y-1">
                  {nav.map((item) => {
                    const active = loc === item.href || (item.href !== "/app" && loc.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        data-testid={item.testId}
                        className={cn(
                          "tap-target group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15 focus-visible:ring-offset-0",
                          active
                            ? "bg-secondary text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4.5 w-4.5 transition-transform duration-200",
                            active ? "text-primary" : "text-muted-foreground group-hover:text-primary",
                            "group-hover:scale-[1.04]",
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                        <span
                          className={cn(
                            "ml-auto h-1.5 w-1.5 rounded-full transition-opacity",
                            active ? "opacity-100 bg-primary" : "opacity-0 group-hover:opacity-60 bg-muted-foreground",
                          )}
                        />
                      </Link>
                    );
                  })}
                </nav>

                <Separator className="my-4" />

                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-border/70 shadow-sm">
                    <AvatarImage src={user?.profileImageUrl ?? undefined} alt={name} />
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      {initials(user?.firstName, user?.lastName, user?.email)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate" data-testid="user-name">
                      {name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate" data-testid="user-email">
                      {user?.email ?? "Signed in with Replit"}
                    </p>
                  </div>

                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => logout()}
                    disabled={isLoggingOut}
                    data-testid="logout-button"
                    className="rounded-xl shadow-sm hover:shadow-md transition-all"
                    title="Log out"
                  >
                    <LogOut className="h-4.5 w-4.5" />
                  </Button>
                </div>
              </div>
            </div>
          </aside>

          <main className="min-w-0">
            <div className="glass grain-overlay rounded-2xl shadow-premium border border-border/60 overflow-hidden">
              <div className="p-5 sm:p-6 lg:p-8">
                {children}
              </div>
            </div>

            <div className="mt-5 text-xs text-muted-foreground flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
              <p data-testid="footer-copy">
                © {new Date().getFullYear()} Mastery • Built for classrooms
              </p>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-card px-2 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  WhatsApp sharing ready
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-card px-2 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  Mobile-first
                </span>
              </div>
            </div>

            <div className="sr-only">
              <Link href="/app" data-testid="sr-link-home">Home</Link>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
