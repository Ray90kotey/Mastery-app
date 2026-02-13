import { useMemo, useState } from "react";
import Meta from "@/components/Meta";
import AppShell from "@/components/AppShell";
import EmptyState from "@/components/EmptyState";
import WhatsAppShareButton from "@/components/WhatsAppShareButton";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError, redirectToLogin } from "@/lib/auth-utils";
import { useClasses } from "@/hooks/use-classes";
import { useStudentsByClass } from "@/hooks/use-students";
import { useGenerateStudentReport } from "@/hooks/use-reports";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileText, Users } from "lucide-react";

export default function ReportsPage() {
  const { toast } = useToast();

  const classesQ = useClasses();
  const [classId, setClassId] = useState<number | null>(null);
  const studentsQ = useStudentsByClass(classId);

  const reportM = useGenerateStudentReport();
  const [lastReport, setLastReport] = useState<{ studentId: number; fileName: string; url: string } | null>(null);

  const waMessage = useMemo(() => {
    const url = lastReport?.url ?? "";
    return [
      "Hello, here is the student's progress report from Mastery.",
      url ? `Download: ${url}` : "Report link will appear after generation.",
      "Thank you.",
    ].join("\n");
  }, [lastReport]);

  return (
    <AppShell>
      <Meta
        title="Reports • Mastery"
        description="Generate student reports and share via WhatsApp."
      />

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Export</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold">Reports</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            Generate a report for any student. Download or share the link directly via WhatsApp.
          </p>
        </div>
      </div>

      <Separator className="my-6" />

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-5 lg:gap-6 items-start">
        <Card className="rounded-3xl border border-border/70 bg-card/70 p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4.5 w-4.5 text-primary" />
            <h2 className="font-bold">Pick a student</h2>
          </div>

          <div className="mt-4 space-y-3">
            <div className="space-y-2">
              <Label>Class</Label>
              <Select
                value={classId ? String(classId) : ""}
                onValueChange={(v) => {
                  setClassId(v ? Number(v) : null);
                  setLastReport(null);
                }}
              >
                <SelectTrigger className="rounded-xl bg-card/70 border-border/70" data-testid="reports-class-select">
                  <SelectValue placeholder={classesQ.isLoading ? "Loading..." : "Select class"} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {(classesQ.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)} data-testid={`reports-class-item-${c.id}`}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {classId ? (
              studentsQ.isLoading ? (
                <div className="space-y-2" data-testid="reports-students-loading">
                  <Skeleton className="h-11 rounded-2xl" />
                  <Skeleton className="h-11 rounded-2xl" />
                </div>
              ) : studentsQ.isError ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm" data-testid="reports-students-error">
                  <p className="font-semibold text-destructive">Failed to load students</p>
                  <p className="mt-1 text-muted-foreground">{(studentsQ.error as any)?.message ?? "Try again."}</p>
                </div>
              ) : (studentsQ.data?.length ?? 0) === 0 ? (
                <EmptyState
                  icon={<Users className="h-6 w-6" />}
                  title="No students yet"
                  description="Add students in Classes first, then return here to generate reports."
                  className="bg-card/50"
                  primaryAction={{
                    label: "Go to Classes",
                    onClick: () => (window.location.href = "/app/classes"),
                    testId: "reports-empty-go-classes",
                  }}
                />
              ) : (
                <div className="space-y-2" data-testid="reports-student-list">
                  {studentsQ.data!.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={async () => {
                        try {
                          const result = await reportM.mutateAsync({ studentId: s.id });
                          setLastReport(result);
                          toast({ title: "Report generated", description: `${s.fullName}` });
                        } catch (e: any) {
                          if (isUnauthorizedError(e)) return redirectToLogin(toast as any);
                          toast({ title: "Could not generate report", description: e?.message ?? "Try again", variant: "destructive" });
                        }
                      }}
                      disabled={reportM.isPending}
                      className="w-full text-left rounded-2xl border border-border/70 bg-card/60 px-4 py-3 hover:bg-muted/50 hover:shadow-sm transition-all duration-200 disabled:opacity-60"
                      data-testid={`reports-generate-student-${s.id}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{s.fullName}</p>
                          <p className="mt-1 text-xs text-muted-foreground truncate">
                            Parent: {s.parentName || "—"} • {s.parentPhone || "No phone"}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {reportM.isPending ? "Working..." : "Generate"}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )
            ) : (
              <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground" data-testid="reports-select-class-hint">
                Select a class to see its students.
              </div>
            )}
          </div>
        </Card>

        <Card className="rounded-3xl border border-border/70 bg-card/70 p-5 sm:p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Latest</p>
              <h2 className="text-xl font-extrabold">Generated report</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Download or share the report link. WhatsApp is the fastest path for families.
              </p>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-primary/10 grid place-items-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
          </div>

          <Separator className="my-5" />

          {!lastReport ? (
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="No report generated yet"
              description="Generate a report from the list on the left."
              className="bg-card/50"
              primaryAction={{
                label: "Select a student",
                onClick: () => {},
                testId: "reports-empty-select-student",
              }}
            />
          ) : (
            <div className="space-y-3" data-testid="reports-latest">
              <div className="rounded-2xl border border-border/70 bg-card/60 p-4">
                <p className="text-sm font-semibold truncate">{lastReport.fileName}</p>
                <p className="mt-1 text-xs text-muted-foreground truncate">{lastReport.url}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  onClick={() => window.open(lastReport.url, "_blank", "noopener,noreferrer")}
                  data-testid="reports-download"
                  className="rounded-xl"
                >
                  <Download className="h-4.5 w-4.5 mr-2" />
                  Download
                </Button>

                <WhatsAppShareButton
                  message={waMessage}
                  testId="reports-share-whatsapp"
                />
              </div>

              <Button
                variant="secondary"
                onClick={() => {
                  toast({
                    title: "Coming soon",
                    description: "Email sending will be enabled once the backend is available.",
                  });
                }}
                data-testid="reports-send-email"
                className="rounded-xl w-full"
              >
                Send via email (coming soon)
              </Button>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
