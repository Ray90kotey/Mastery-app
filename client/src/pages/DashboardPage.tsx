import Meta from "@/components/Meta";
import AppShell from "@/components/AppShell";
import StatPill from "@/components/StatPill";
import { useClasses } from "@/hooks/use-classes";
import { useAcademicYears } from "@/hooks/use-academic";
import { useSettings } from "@/hooks/use-settings";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Building2, GraduationCap, Users } from "lucide-react";

export default function DashboardPage() {
  const classes = useClasses();
  const years = useAcademicYears();
  const settings = useSettings();

  const schoolName = settings.data?.schoolName?.trim() || "Your school";

  return (
    <AppShell>
      <Meta
        title="Dashboard • Mastery"
        description="Overview of your classes, academic setup, and next actions."
      />

      <div className="stagger">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Workspace</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold">
              {schoolName}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
              Quick overview of your setup. Add a class, structure your academic year, then start recording assessments.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 rounded-2xl border border-border/70 bg-card/60 px-3 py-2 shadow-sm">
              <GraduationCap className="h-4.5 w-4.5 text-primary" />
              <span className="text-sm font-semibold">Mastery MVP</span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatPill
            label="Classes"
            value={
              classes.isLoading ? (
                <span className="inline-block w-10"><Skeleton className="h-6 w-full" /></span>
              ) : (
                classes.data?.length ?? 0
              )
            }
            hint="Create at least one class"
            tone="primary"
            testId="dash-stat-classes"
          />
          <StatPill
            label="Academic years"
            value={
              years.isLoading ? (
                <span className="inline-block w-10"><Skeleton className="h-6 w-full" /></span>
              ) : (
                years.data?.length ?? 0
              )
            }
            hint="Add a year and term"
            tone="muted"
            testId="dash-stat-years"
          />
          <StatPill
            label="School name"
            value={settings.isLoading ? <Skeleton className="h-6 w-24" /> : (settings.data?.schoolName?.trim() ? "Set" : "Not set")}
            hint="Edit in Settings"
            tone="accent"
            testId="dash-stat-schoolname"
          />
          <StatPill
            label="Next step"
            value="Enter scores"
            hint="Assessments → Scores"
            tone="muted"
            testId="dash-stat-next"
          />
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="rounded-3xl border border-border/70 bg-card/70 p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-2xl bg-primary/10 grid place-items-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold">Classes</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add students and parent contact details for easy reporting.
                </p>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border border-border/70 bg-card/70 p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-2xl bg-accent/10 grid place-items-center">
                <BookOpen className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="font-bold">Academic setup</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Define your year, terms, weeks, lessons, and outcomes — once.
                </p>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border border-border/70 bg-card/70 p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-2xl bg-[hsl(var(--chart-3))]/10 grid place-items-center">
                <Building2 className="h-5 w-5 text-[hsl(var(--chart-3))]" />
              </div>
              <div>
                <h3 className="font-bold">Reports</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Generate a PDF and share instantly via WhatsApp with a clean message.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
