import AppShell from "@/components/AppShell";
import { useStudentPortal } from "@/hooks/use-school";
import { useMySchool } from "@/hooks/use-school";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, TrendingDown, TrendingUp, Minus, BookOpen, GraduationCap } from "lucide-react";
import { useLocation } from "wouter";

function MasteryBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    Mastered: "bg-green-100 text-green-800 border-green-200",
    Proficient: "bg-blue-100 text-blue-800 border-blue-200",
    Developing: "bg-yellow-100 text-yellow-800 border-yellow-200",
    "Needs Support": "bg-red-100 text-red-800 border-red-200",
  };
  return <Badge variant="outline" className={map[level] ?? ""}>{level}</Badge>;
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-green-600" />;
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

export default function StudentPortalPage() {
  const { data: mySchool, isLoading: schoolLoading } = useMySchool();
  const { data, isLoading } = useStudentPortal();
  const [, setLocation] = useLocation();

  if (schoolLoading || isLoading) {
    return (
      <AppShell>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </AppShell>
    );
  }

  if (!mySchool || mySchool.role !== "student") {
    setLocation("/app");
    return null;
  }

  if (!data) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="h-14 w-14 rounded-2xl bg-muted grid place-items-center">
            <AlertCircle className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">No data yet</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Your teacher hasn't entered any assessment scores yet. Check back soon!
          </p>
        </div>
      </AppShell>
    );
  }

  const { student, class: cls, mastery } = data;
  const score = mastery?.overall ?? 0;

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-accent grid place-items-center shadow-sm shrink-0">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
              {student.fullName}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">{cls?.name ?? "Your class"}</p>
          </div>
        </div>

        {/* Mastery score */}
        {mastery ? (
          <>
            <div className="rounded-xl border border-border/70 bg-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Overall Mastery</p>
                  <p className="text-4xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                    {Math.round(score)}%
                  </p>
                </div>
                <div className="text-right space-y-2">
                  <MasteryBadge level={mastery.masteryLevel} />
                  <div className="flex items-center gap-1 justify-end">
                    <TrendIcon trend={mastery.trend} />
                    <span className="text-xs text-muted-foreground capitalize">{mastery.trend}</span>
                  </div>
                </div>
              </div>
              <Progress value={score} className="h-3" />
            </div>

            {/* Strengths */}
            {mastery.strengths?.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" /> What you're doing well
                </h2>
                <div className="space-y-2">
                  {mastery.strengths.slice(0, 5).map((s: any) => (
                    <div key={s.outcomeId} className="flex items-center justify-between rounded-lg bg-green-50 border border-green-100 px-3 py-2">
                      <p className="text-sm text-green-900 truncate">{s.outcomeDescription}</p>
                      <Badge variant="outline" className="ml-2 shrink-0 bg-green-100 text-green-800 border-green-200">
                        {Math.round(s.score)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Needs support */}
            {mastery.needsSupport?.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" /> Areas to improve
                </h2>
                <div className="space-y-2">
                  {mastery.needsSupport.slice(0, 5).map((s: any) => (
                    <div key={s.outcomeId} className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                      <p className="text-sm text-amber-900 truncate">{s.outcomeDescription}</p>
                      <Badge variant="outline" className="ml-2 shrink-0 bg-amber-100 text-amber-800 border-amber-200">
                        {Math.round(s.score)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* By lesson */}
            {mastery.byLesson?.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold mb-2">Performance by lesson</h2>
                <div className="divide-y divide-border/60 rounded-xl border border-border/70 overflow-hidden bg-card">
                  {mastery.byLesson.map((l: any) => (
                    <div key={l.lessonId} className="flex items-center gap-3 px-4 py-3">
                      <p className="text-sm flex-1 truncate">{l.lessonTitle}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        <Progress value={l.score} className="w-16 h-1.5" />
                        <span className="text-xs font-medium w-8 text-right">{Math.round(l.score)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <div className="text-center py-10 text-muted-foreground text-sm">
            No mastery data yet — ask your teacher to enter assessment scores.
          </div>
        )}
      </div>
    </AppShell>
  );
}
