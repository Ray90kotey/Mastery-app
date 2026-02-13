import { useMemo, useState } from "react";
import { useParams } from "wouter";
import Meta from "@/components/Meta";
import AppShell from "@/components/AppShell";
import EmptyState from "@/components/EmptyState";
import WhatsAppShareButton from "@/components/WhatsAppShareButton";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError, redirectToLogin } from "@/lib/auth-utils";
import { useStudentMastery } from "@/hooks/use-mastery";
import { useGenerateStudentReport } from "@/hooks/use-reports";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Download, FileText, LineChart, Target } from "lucide-react";

export default function StudentPage() {
  const { toast } = useToast();
  const params = useParams<{ id: string }>();
  const studentId = Number(params.id);

  const masteryQ = useStudentMastery(Number.isFinite(studentId) ? studentId : null);
  const reportM = useGenerateStudentReport();

  const [lastReportUrl, setLastReportUrl] = useState<string | null>(null);
  const [lastReportName, setLastReportName] = useState<string | null>(null);

  const overall = masteryQ.data?.overall ?? 0;
  const level = masteryQ.data?.masteryLevel ?? "Developing";
  const trend = masteryQ.data?.trend ?? "Stable";

  const headline = useMemo(() => {
    if (!masteryQ.data) return "Student Mastery";
    return `Mastery: ${level}`;
  }, [masteryQ.data, level]);

  const waMessage = useMemo(() => {
    const url = lastReportUrl ?? "";
    return [
      "Hello, here is the student's mastery report from Mastery.",
      url ? `Download: ${url}` : "Report link will appear after generation.",
      "Thank you.",
    ].join("\n");
  }, [lastReportUrl]);

  return (
    <AppShell>
      <Meta
        title="Student • Mastery"
        description="View student mastery summary, strengths, needs support, and generate a report."
      />

      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Student</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold" data-testid="student-page-title">
            {headline}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl" data-testid="student-page-subtitle">
            Overall mastery, strengths, needs support, and breakdown by lesson/outcome.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={async () => {
              try {
                const result = await reportM.mutateAsync({ studentId });
                setLastReportUrl(result.url);
                setLastReportName(result.fileName);
                toast({ title: "Report generated", description: "You can download or share it now." });
              } catch (e: any) {
                if (isUnauthorizedError(e)) return redirectToLogin(toast as any);
                toast({ title: "Could not generate report", description: e?.message ?? "Try again", variant: "destructive" });
              }
            }}
            disabled={reportM.isPending || !Number.isFinite(studentId)}
            data-testid="student-generate-report"
            className="rounded-xl shadow-sm hover:shadow-md transition-all bg-gradient-to-r from-primary to-primary/85"
          >
            <FileText className="h-4.5 w-4.5 mr-2" />
            {reportM.isPending ? "Generating..." : "Generate report"}
          </Button>

          <WhatsAppShareButton
            message={waMessage}
            testId="student-share-whatsapp"
            variant="secondary"
          />
        </div>
      </div>

      <Separator className="my-6" />

      {!Number.isFinite(studentId) ? (
        <EmptyState
          icon={<AlertTriangle className="h-6 w-6" />}
          title="Invalid student ID"
          description="The link you opened does not include a valid student id."
          className="bg-card/50"
          primaryAction={{
            label: "Go to Classes",
            onClick: () => (window.location.href = "/app/classes"),
            testId: "student-invalid-go-classes",
          }}
        />
      ) : masteryQ.isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-5 lg:gap-6" data-testid="student-loading">
          <Card className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-44 mt-3" />
            <Skeleton className="h-3 w-full mt-6" />
            <Skeleton className="h-3 w-full mt-2" />
            <Skeleton className="h-3 w-2/3 mt-2" />
          </Card>
          <Card className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm">
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-20 w-full mt-5" />
          </Card>
        </div>
      ) : masteryQ.isError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm" data-testid="student-error">
          <p className="font-semibold text-destructive">Failed to load mastery</p>
          <p className="mt-1 text-muted-foreground">{(masteryQ.error as any)?.message ?? "Try again."}</p>
        </div>
      ) : !masteryQ.data ? (
        <EmptyState
          icon={<LineChart className="h-6 w-6" />}
          title="No mastery data yet"
          description="Enter some assessment scores, then come back to see mastery."
          className="bg-card/50"
          primaryAction={{
            label: "Go to Assessments",
            onClick: () => (window.location.href = "/app/assessments"),
            testId: "student-empty-go-assessments",
          }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-5 lg:gap-6 items-start">
          <Card className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm" data-testid="student-mastery-summary">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Overall</p>
                <h2 className="text-xl font-extrabold">{level}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Trend: <span className="font-semibold text-foreground">{trend}</span>
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-muted-foreground">Score</p>
                <p className="text-3xl font-extrabold" data-testid="student-overall-score">
                  {Math.round(overall)}%
                </p>
              </div>
            </div>

            <div className="mt-5">
              <Progress value={overall} className="h-3" data-testid="student-overall-progress" />
              <p className="mt-2 text-xs text-muted-foreground">
                This is a weighted mastery estimate based on recorded assessments.
              </p>
            </div>

            <Separator className="my-5" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border/70 bg-card/60 p-4" data-testid="student-strengths">
                <div className="flex items-center gap-2">
                  <Target className="h-4.5 w-4.5 text-primary" />
                  <p className="font-bold">Strengths</p>
                </div>
                <div className="mt-3 space-y-2">
                  {(masteryQ.data.strengths ?? []).slice(0, 6).map((s) => (
                    <div key={s.outcomeId} className="flex items-center justify-between gap-3">
                      <p className="text-sm text-muted-foreground truncate">
                        {s.outcomeDescription}
                      </p>
                      <span className="text-sm font-semibold">{Math.round(s.score)}%</span>
                    </div>
                  ))}
                  {(masteryQ.data.strengths ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No strengths identified yet.</p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-card/60 p-4" data-testid="student-needs-support">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4.5 w-4.5 text-accent" />
                  <p className="font-bold">Needs support</p>
                </div>
                <div className="mt-3 space-y-2">
                  {(masteryQ.data.needsSupport ?? []).slice(0, 6).map((s) => (
                    <div key={s.outcomeId} className="flex items-center justify-between gap-3">
                      <p className="text-sm text-muted-foreground truncate">
                        {s.outcomeDescription}
                      </p>
                      <span className="text-sm font-semibold">{Math.round(s.score)}%</span>
                    </div>
                  ))}
                  {(masteryQ.data.needsSupport ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No support needs identified yet.</p>
                  ) : null}
                </div>
              </div>
            </div>

            <Separator className="my-5" />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-bold">By lesson</p>
                <div className="mt-3 rounded-2xl border border-border/70 overflow-hidden bg-card/50" data-testid="student-by-lesson">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lesson</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(masteryQ.data.byLesson ?? []).slice(0, 8).map((l) => (
                        <TableRow key={l.lessonId}>
                          <TableCell className="text-sm text-muted-foreground">{l.lessonTitle}</TableCell>
                          <TableCell className="text-right font-semibold">{Math.round(l.score)}%</TableCell>
                        </TableRow>
                      ))}
                      {(masteryQ.data.byLesson ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={2} className="text-sm text-muted-foreground">
                            No lesson breakdown yet.
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div>
                <p className="text-sm font-bold">By outcome</p>
                <div className="mt-3 rounded-2xl border border-border/70 overflow-hidden bg-card/50" data-testid="student-by-outcome">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Outcome</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(masteryQ.data.byOutcome ?? []).slice(0, 8).map((o) => (
                        <TableRow key={o.outcomeId}>
                          <TableCell className="text-sm text-muted-foreground">{o.outcomeDescription}</TableCell>
                          <TableCell className="text-right font-semibold">{Math.round(o.score)}%</TableCell>
                        </TableRow>
                      ))}
                      {(masteryQ.data.byOutcome ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={2} className="text-sm text-muted-foreground">
                            No outcome breakdown yet.
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm" data-testid="student-report-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Reports</p>
                <h3 className="text-lg font-extrabold">Generate & share</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Create a PDF report and share the link with families via WhatsApp.
                </p>
              </div>
              <div className="h-11 w-11 rounded-2xl bg-primary/10 grid place-items-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
            </div>

            <Separator className="my-5" />

            <div className="space-y-3">
              <Button
                onClick={async () => {
                  try {
                    const result = await reportM.mutateAsync({ studentId });
                    setLastReportUrl(result.url);
                    setLastReportName(result.fileName);
                    toast({ title: "Report generated" });
                  } catch (e: any) {
                    if (isUnauthorizedError(e)) return redirectToLogin(toast as any);
                    toast({ title: "Could not generate report", description: e?.message ?? "Try again", variant: "destructive" });
                  }
                }}
                disabled={reportM.isPending}
                data-testid="student-report-generate-2"
                className="w-full rounded-xl shadow-sm hover:shadow-md transition-all bg-gradient-to-r from-primary to-primary/85"
              >
                <FileText className="h-4.5 w-4.5 mr-2" />
                {reportM.isPending ? "Generating..." : "Generate PDF report"}
              </Button>

              <Button
                variant="secondary"
                onClick={() => {
                  toast({
                    title: "Coming soon",
                    description: "Email sending will be enabled once the backend is available.",
                  });
                }}
                data-testid="student-report-email"
                className="w-full rounded-xl"
              >
                Send via email (coming soon)
              </Button>

              {lastReportUrl ? (
                <div className="rounded-2xl border border-border/70 bg-card/60 p-4" data-testid="student-report-ready">
                  <p className="text-sm font-semibold">Report ready</p>
                  <p className="mt-1 text-xs text-muted-foreground truncate">
                    {lastReportName ?? "report.pdf"}
                  </p>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => window.open(lastReportUrl, "_blank", "noopener,noreferrer")}
                      data-testid="student-report-download"
                      className="rounded-xl"
                    >
                      <Download className="h-4.5 w-4.5 mr-2" />
                      Download
                    </Button>

                    <WhatsAppShareButton
                      message={waMessage}
                      testId="student-report-whatsapp"
                      label="Share link"
                      variant="default"
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground" data-testid="student-report-empty">
                  Generate a report to get a shareable link.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
