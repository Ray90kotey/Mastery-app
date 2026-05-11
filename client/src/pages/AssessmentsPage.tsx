import { useMemo, useRef, useState } from "react";
import Meta from "@/components/Meta";
import AppShell from "@/components/AppShell";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError, redirectToLogin } from "@/lib/auth-utils";
import { useClasses, useClassMasterySummary } from "@/hooks/use-classes";
import { useStudentsByClass } from "@/hooks/use-students";
import { useAssessmentsByClass, useCreateAssessment, useDeleteAssessment, useUpdateAssessment } from "@/hooks/use-assessments";
import { useUpsertScores } from "@/hooks/use-scores";
import { useSubjects } from "@/hooks/use-subjects";
import { useAcademicYears, useTermsByYear, useWeeksByTerm, useLessonsByWeek, useOutcomesByLesson } from "@/hooks/use-academic";
import type { AssessmentResponse, StudentResponse } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ClipboardList, Plus, Save, Trash2, Filter, BookTemplate, Eraser, ChevronDown } from "lucide-react";

type AssessmentTemplate = { id: string; title: string; type: string; totalScore: number };
const TEMPLATE_KEY = "mastery_assessment_templates";
function loadTemplates(): AssessmentTemplate[] {
  try { return JSON.parse(localStorage.getItem(TEMPLATE_KEY) ?? "[]"); } catch { return []; }
}
function persistTemplates(all: AssessmentTemplate[]) { localStorage.setItem(TEMPLATE_KEY, JSON.stringify(all)); }

const BAND_META: Record<string, { color: string; bg: string }> = {
  Mastered:      { color: "text-emerald-700", bg: "bg-emerald-500" },
  Proficient:    { color: "text-blue-700",    bg: "bg-blue-500"    },
  Developing:    { color: "text-amber-700",   bg: "bg-amber-400"   },
  "Needs Support":{ color: "text-rose-700",   bg: "bg-rose-500"    },
  "No Data":     { color: "text-muted-foreground", bg: "bg-muted"  },
};

const ASSESSMENT_TYPES = ["Classwork", "Quiz", "Test", "Project"] as const;

function formatDateInput(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function AssessmentsPage() {
  const { toast } = useToast();

  const classesQ = useClasses();
  const subjectsQ = useSubjects();
  const academicYearsQ = useAcademicYears();
  const [classId, setClassId] = useState<number | null>(null);
  const assessmentsQ = useAssessmentsByClass(classId ?? undefined);
  const studentsQ = useStudentsByClass(classId ?? undefined);
  const [filterSubjectId, setFilterSubjectId] = useState<string>("all");
  const [filterYearId, setFilterYearId] = useState<string>("all");

  const [selectedAssessmentId, setSelectedAssessmentId] = useState<number | null>(null);
  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<AssessmentResponse | null>(null);
  const [assessmentForm, setAssessmentForm] = useState({
    title: "",
    type: "Quiz" as const,
    totalScore: 20,
    date: formatDateInput(new Date()),
    yearId: "",
    termId: "",
    weekId: "",
    lessonId: "",
    outcomeId: "",
  });

  const termsQ = useTermsByYear(assessmentForm.yearId ? Number(assessmentForm.yearId) : undefined);
  const weeksQ = useWeeksByTerm(assessmentForm.termId ? Number(assessmentForm.termId) : undefined);
  const lessonsQ = useLessonsByWeek(assessmentForm.weekId ? Number(assessmentForm.weekId) : undefined);
  const outcomesQ = useOutcomesByLesson(assessmentForm.lessonId ? Number(assessmentForm.lessonId) : undefined);

  const createAssessment = useCreateAssessment();
  const updateAssessment = useUpdateAssessment();
  const deleteAssessment = useDeleteAssessment();
  const upsertScores = useUpsertScores();

  const selectedAssessment = useMemo(
    () => (assessmentsQ.data ?? []).find((a) => a.id === selectedAssessmentId) ?? null,
    [assessmentsQ.data, selectedAssessmentId],
  );

  const [scoreDrafts, setScoreDrafts] = useState<Record<number, string>>({});
  const scoreInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [templates, setTemplates] = useState<AssessmentTemplate[]>(() => loadTemplates());
  const [loadTplId, setLoadTplId] = useState<string>("");

  const classMasteryQ = useClassMasterySummary(classId ?? undefined);

  const filteredAssessments = useMemo(() => {
    let list = assessmentsQ.data ?? [];
    if (filterSubjectId !== "all") {
      list = list.filter(a => a.subjectId === Number(filterSubjectId));
    }
    if (filterYearId !== "all") {
      list = list.filter(a => a.academicYearId === Number(filterYearId));
    }
    return list;
  }, [assessmentsQ.data, filterSubjectId, filterYearId]);

  const studentsById = useMemo(() => {
    const map = new Map<number, StudentResponse>();
    (studentsQ.data ?? []).forEach((s) => map.set(s.id, s));
    return map;
  }, [studentsQ.data]);

  return (
    <AppShell>
      <Meta
        title="Assessments • Mastery"
        description="Create assessments, enter scores in bulk, and save quickly."
      />

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Scoring</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold">Assessments</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            Choose a class, add an assessment, then enter scores for each student.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterSubjectId} onValueChange={setFilterSubjectId}>
              <SelectTrigger className="w-[140px] h-9 rounded-xl text-xs">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All Subjects</SelectItem>
                {subjectsQ.data?.map(s => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterYearId} onValueChange={setFilterYearId}>
              <SelectTrigger className="w-[140px] h-9 rounded-xl text-xs">
                <SelectValue placeholder="All Years" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All Years</SelectItem>
                {academicYearsQ.data?.map(y => (
                  <SelectItem key={y.id} value={String(y.id)}>{y.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[200px]">
            <Select
              value={classId ? String(classId) : ""}
              onValueChange={(v) => {
                const id = v ? Number(v) : null;
                setClassId(id);
                setSelectedAssessmentId(null);
                setScoreDrafts({});
              }}
            >
              <SelectTrigger className="rounded-xl h-9 bg-card/70 border-border/70 text-xs" data-testid="assessments-class-select">
                <SelectValue placeholder={classesQ.isLoading ? "Loading..." : "Select class"} />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {(classesQ.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)} data-testid={`assessments-class-item-${c.id}`}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            size="sm"
            onClick={() => {
              setEditingAssessment(null);
              setAssessmentForm({
                title: "",
                type: "Quiz",
                totalScore: 20,
                date: formatDateInput(new Date()),
                yearId: "",
                termId: "",
                weekId: "",
                lessonId: "",
                outcomeId: "",
              });
              setAssessmentOpen(true);
            }}
            disabled={!classId}
            data-testid="assessment-create-open"
            className="rounded-xl h-9 px-3 text-xs shadow-sm hover:shadow-md transition-all bg-gradient-to-r from-primary to-primary/85"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New
          </Button>
        </div>
      </div>

      <Separator className="my-6" />

      {/* T4: Class Mastery Summary Bar */}
      {classId && classMasteryQ.data && classMasteryQ.data.studentCount > 0 && (
        <div className="rounded-2xl border border-border/70 bg-card/70 p-4 mb-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <p className="text-xs text-muted-foreground">Class Mastery Snapshot</p>
              <p className="text-sm font-semibold">
                {classMasteryQ.data.studentCount} students · {classMasteryQ.data.assessmentCount} assessments · Avg {classMasteryQ.data.avgScore}%
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["Mastered","Proficient","Developing","Needs Support","No Data"] as const).map((band) => {
                const count = classMasteryQ.data!.bands[band] ?? 0;
                if (count === 0) return null;
                const meta = BAND_META[band];
                return (
                  <span key={band} className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${meta.color} border-current/20 bg-current/5`}>
                    <span className={`w-2 h-2 rounded-full ${meta.bg}`} />
                    {band} · {count}
                  </span>
                );
              })}
            </div>
          </div>
          {/* Band distribution bar */}
          <div className="h-3 rounded-full overflow-hidden flex w-full" data-testid="class-mastery-bar">
            {(["Mastered","Proficient","Developing","Needs Support","No Data"] as const).map((band) => {
              const count = classMasteryQ.data!.bands[band] ?? 0;
              const pct = classMasteryQ.data!.studentCount > 0 ? (count / classMasteryQ.data!.studentCount) * 100 : 0;
              if (pct === 0) return null;
              return <div key={band} className={`${BAND_META[band].bg} transition-all`} style={{ width: `${pct}%` }} title={`${band}: ${count}`} />;
            })}
          </div>
        </div>
      )}

      {!classId ? (
        <EmptyState
          icon={<ClipboardList className="h-6 w-6" />}
          title="Select a class to begin"
          description="Assessments are created per class."
          className="bg-card/50"
          primaryAction={{
            label: "Choose a class",
            onClick: () => {},
            testId: "assessments-empty-choose-class",
          }}
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-5 lg:gap-6 items-start">
          <Card className="rounded-3xl border border-border/70 bg-card/70 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Assessments</h2>
              <span className="text-xs text-muted-foreground" data-testid="assessments-count">
                {assessmentsQ.data?.length ?? 0}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {assessmentsQ.isLoading ? (
                <div className="space-y-2" data-testid="assessments-loading">
                  <Skeleton className="h-11 rounded-2xl" />
                  <Skeleton className="h-11 rounded-2xl" />
                </div>
              ) : assessmentsQ.isError ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm" data-testid="assessments-error">
                  <p className="font-semibold text-destructive">Failed to load assessments</p>
                  <p className="mt-1 text-muted-foreground">{(assessmentsQ.error as any)?.message ?? "Try again."}</p>
                </div>
              ) : (assessmentsQ.data?.length ?? 0) === 0 ? (
                <EmptyState
                  icon={<ClipboardList className="h-6 w-6" />}
                  title="No assessments yet"
                  description="Create your first assessment for this class."
                  className="bg-card/50"
                  primaryAction={{
                    label: "New assessment",
                    onClick: () => setAssessmentOpen(true),
                    testId: "assessments-empty-create",
                  }}
                />
              ) : (
                <div className="space-y-2" data-testid="assessments-list">
                  {filteredAssessments.map((a) => {
                    const active = a.id === selectedAssessmentId;
                    const date = a.date ? new Date(a.date as any) : null;
                    return (
                      <div
                        key={a.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setSelectedAssessmentId(a.id);
                          setScoreDrafts({});
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            setSelectedAssessmentId(a.id);
                            setScoreDrafts({});
                          }
                        }}
                        className={[
                          "w-full text-left rounded-2xl border px-4 py-3 transition-all duration-200 hover:bg-muted/50 hover:shadow-sm cursor-pointer",
                          active ? "bg-secondary border-border shadow-sm" : "bg-card/60 border-border/70",
                        ].join(" ")}
                        data-testid={`assessment-item-${a.id}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{a.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {a.type} • {a.totalScore} pts
                              {date && !Number.isNaN(date.getTime()) ? ` • ${date.toLocaleDateString()}` : ""}
                            </p>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setEditingAssessment(a);
                                setAssessmentForm({
                                  title: a.title ?? "",
                                  type: (a.type as any) ?? "Quiz",
                                  totalScore: a.totalScore ?? 20,
                                  date: a.date ? formatDateInput(new Date(a.date as any)) : formatDateInput(new Date()),
                                  yearId: "",
                                  termId: "",
                                  weekId: "",
                                  lessonId: a.lessonId ? String(a.lessonId) : "",
                                  outcomeId: a.outcomeId ? String(a.outcomeId) : "",
                                });
                                setAssessmentOpen(true);
                              }}
                              data-testid={`assessment-edit-open-${a.id}`}
                              title="Edit"
                            >
                              <Plus className="h-4.5 w-4.5 rotate-45" />
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="rounded-xl text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  data-testid={`assessment-delete-open-${a.id}`}
                                  title="Delete"
                                >
                                  <Trash2 className="h-4.5 w-4.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-2xl">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete assessment?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Scores linked to this assessment may be removed as well.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="rounded-xl" data-testid={`assessment-delete-cancel-${a.id}`}>
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    data-testid={`assessment-delete-confirm-${a.id}`}
                                    onClick={async () => {
                                      try {
                                        await deleteAssessment.mutateAsync(a.id);
                                        if (selectedAssessmentId === a.id) setSelectedAssessmentId(null);
                                        toast({ title: "Assessment deleted" });
                                      } catch (e: any) {
                                        if (isUnauthorizedError(e)) return redirectToLogin(toast as any);
                                        toast({ title: "Could not delete assessment", description: e?.message ?? "Try again", variant: "destructive" });
                                      }
                                    }}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>

          <Card className="rounded-3xl border border-border/70 bg-card/70 p-5 sm:p-6 shadow-sm">
            <div>
              <p className="text-xs text-muted-foreground">Scores</p>
              <h2 className="text-xl font-extrabold" data-testid="scores-panel-title">
                {selectedAssessment ? selectedAssessment.title : "Select an assessment"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedAssessment
                  ? `Enter scores out of ${selectedAssessment.totalScore} for each student.`
                  : "Choose an assessment on the left to start entering scores."}
              </p>
            </div>

            <Separator className="my-5" />

            {!selectedAssessment ? (
              <EmptyState
                icon={<Save className="h-6 w-6" />}
                title="No assessment selected"
                description="Select an assessment to enter scores."
                className="bg-card/50"
                primaryAction={{
                  label: "Create assessment",
                  onClick: () => setAssessmentOpen(true),
                  testId: "scores-empty-create-assessment",
                }}
              />
            ) : studentsQ.isLoading ? (
              <div className="space-y-2" data-testid="scores-loading">
                <Skeleton className="h-10 rounded-2xl" />
                <Skeleton className="h-10 rounded-2xl" />
                <Skeleton className="h-10 rounded-2xl" />
              </div>
            ) : studentsQ.isError ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm" data-testid="scores-students-error">
                <p className="font-semibold text-destructive">Failed to load students</p>
                <p className="mt-1 text-muted-foreground">{(studentsQ.error as any)?.message ?? "Try again."}</p>
              </div>
            ) : (studentsQ.data?.length ?? 0) === 0 ? (
              <EmptyState
                icon={<ClipboardList className="h-6 w-6" />}
                title="No students in this class"
                description="Add students in the Classes section, then return here to score."
                className="bg-card/50"
                primaryAction={{
                  label: "Go to Classes",
                  onClick: () => (window.location.href = "/app/classes"),
                  testId: "scores-empty-go-classes",
                }}
              />
            ) : (
              <div className="space-y-3">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-muted-foreground" data-testid="scores-stats">
                      {studentsQ.data!.length} students &bull; {Object.keys(scoreDrafts).length} of {studentsQ.data!.length} entered
                    </div>
                    <Button
                      onClick={async () => {
                        try {
                          const scores = Object.entries(scoreDrafts).map(([studentId, score]) => ({
                            studentId: Number(studentId),
                            score: Number(score),
                          }));
                          await upsertScores.mutateAsync({
                            assessmentId: selectedAssessment.id,
                            scores,
                          });
                          setScoreDrafts({});
                          toast({ title: "Scores saved" });
                        } catch (e: any) {
                          if (isUnauthorizedError(e)) return redirectToLogin(toast as any);
                          toast({ title: "Could not save scores", description: e?.message ?? "Try again", variant: "destructive" });
                        }
                      }}
                      disabled={upsertScores.isPending || Object.keys(scoreDrafts).length === 0}
                      data-testid="scores-save"
                      className="rounded-xl shadow-sm hover:shadow-md transition-all"
                    >
                      <Save className="h-4.5 w-4.5 mr-2" />
                      {upsertScores.isPending ? "Saving..." : "Save scores"}
                    </Button>
                  </div>
                  {/* T1: Quick-fill actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs h-8 px-3"
                      data-testid="scores-fill-max"
                      onClick={() => {
                        const drafts: Record<number, string> = {};
                        studentsQ.data!.forEach((s) => { drafts[s.id] = String(selectedAssessment.totalScore); });
                        setScoreDrafts(drafts);
                      }}
                    >
                      Fill max ({selectedAssessment.totalScore})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs h-8 px-3 text-muted-foreground"
                      data-testid="scores-clear-all"
                      onClick={() => setScoreDrafts({})}
                    >
                      <Eraser className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 overflow-hidden bg-card/50" data-testid="scores-table">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead className="w-[160px] text-right">Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentsQ.data!.map((s, idx) => {
                        const draft = scoreDrafts[s.id] ?? "";
                        return (
                          <TableRow key={s.id} data-testid={`score-row-${s.id}`}>
                            <TableCell className="font-semibold">
                              {s.fullName}
                              <div className="text-xs text-muted-foreground mt-1">
                                Parent: {s.parentName || "—"}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                inputMode="numeric"
                                value={draft}
                                ref={(el) => { scoreInputRefs.current[idx] = el; }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === "ArrowDown") {
                                    e.preventDefault();
                                    scoreInputRefs.current[idx + 1]?.focus();
                                  } else if (e.key === "ArrowUp") {
                                    e.preventDefault();
                                    scoreInputRefs.current[idx - 1]?.focus();
                                  }
                                }}
                                onChange={(e) => {
                                  setScoreDrafts((prev) => ({
                                    ...prev,
                                    [s.id]: e.target.value,
                                  }));
                                }}
                                placeholder="—"
                                className="rounded-xl text-right bg-background/70"
                                data-testid={`score-input-${s.id}`}
                              />
                              <div className="mt-1 text-[11px] text-muted-foreground">
                                Out of {selectedAssessment.totalScore}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      <Dialog
        open={assessmentOpen}
        onOpenChange={(open) => {
          setAssessmentOpen(open);
          if (!open) setEditingAssessment(null);
        }}
      >
        <DialogContent className="rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAssessment ? "Edit assessment" : "New assessment"}</DialogTitle>
          </DialogHeader>

          {/* T2: Template picker */}
          {templates.length > 0 && !editingAssessment && (
            <div className="flex items-center gap-2 mb-2 p-3 rounded-xl bg-muted/40 border border-border/60">
              <BookTemplate className="h-4 w-4 text-muted-foreground shrink-0" />
              <select
                className="flex-1 text-sm bg-transparent outline-none text-foreground"
                value={loadTplId}
                data-testid="template-select"
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) return;
                  const tpl = templates.find((t) => t.id === id);
                  if (tpl) {
                    setAssessmentForm((p) => ({ ...p, title: tpl.title, type: tpl.type as any, totalScore: tpl.totalScore }));
                  }
                  setLoadTplId("");
                }}
              >
                <option value="">Load from template…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.title} ({t.type}, {t.totalScore} pts)</option>
                ))}
              </select>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-destructive ml-1"
                title="Manage templates"
                onClick={() => {
                  const names = templates.map((t, i) => `${i + 1}. ${t.title}`).join("\n");
                  const del = window.prompt(`Templates (enter number to delete):\n${names}`);
                  const idx = del ? parseInt(del) - 1 : -1;
                  if (idx >= 0 && idx < templates.length) {
                    const updated = templates.filter((_, i) => i !== idx);
                    persistTemplates(updated);
                    setTemplates(updated);
                    toast({ title: "Template deleted" });
                  }
                }}
              >
                Manage
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="assTitle">Title</Label>
              <Input
                id="assTitle"
                value={assessmentForm.title}
                onChange={(e) => setAssessmentForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g., Fractions Quiz"
                className="rounded-xl"
                data-testid="assessment-form-title"
              />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={assessmentForm.type}
                onValueChange={(v) => setAssessmentForm((p) => ({ ...p, type: v as any }))}
              >
                <SelectTrigger className="rounded-xl" data-testid="assessment-form-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {ASSESSMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t} data-testid={`assessment-type-${t}`}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assTotal">Total score</Label>
              <Input
                id="assTotal"
                type="number"
                value={String(assessmentForm.totalScore)}
                onChange={(e) => setAssessmentForm((p) => ({ ...p, totalScore: Number(e.target.value) }))}
                className="rounded-xl"
                data-testid="assessment-form-total"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assDate">Date</Label>
              <Input
                id="assDate"
                type="date"
                value={assessmentForm.date}
                onChange={(e) => setAssessmentForm((p) => ({ ...p, date: e.target.value }))}
                className="rounded-xl"
                data-testid="assessment-form-date"
              />
            </div>

            <div className="space-y-2">
              <Label>Academic Year (optional)</Label>
              <Select
                value={assessmentForm.yearId}
                onValueChange={(v) => setAssessmentForm((p) => ({ ...p, yearId: v, termId: "", weekId: "", lessonId: "", outcomeId: "" }))}
              >
                <SelectTrigger className="rounded-xl" data-testid="assessment-form-year">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {(academicYearsQ.data ?? []).map((y) => (
                    <SelectItem key={y.id} value={String(y.id)} data-testid={`assessment-year-${y.id}`}>
                      {y.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Term (optional)</Label>
              <Select
                value={assessmentForm.termId}
                onValueChange={(v) => setAssessmentForm((p) => ({ ...p, termId: v, weekId: "", lessonId: "", outcomeId: "" }))}
                disabled={!assessmentForm.yearId}
              >
                <SelectTrigger className="rounded-xl" data-testid="assessment-form-term">
                  <SelectValue placeholder={assessmentForm.yearId ? "Select term" : "Select year first"} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {(termsQ.data ?? []).map((t) => (
                    <SelectItem key={t.id} value={String(t.id)} data-testid={`assessment-term-${t.id}`}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Week (optional)</Label>
              <Select
                value={assessmentForm.weekId}
                onValueChange={(v) => setAssessmentForm((p) => ({ ...p, weekId: v, lessonId: "", outcomeId: "" }))}
                disabled={!assessmentForm.termId}
              >
                <SelectTrigger className="rounded-xl" data-testid="assessment-form-week">
                  <SelectValue placeholder={assessmentForm.termId ? "Select week" : "Select term first"} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {(weeksQ.data ?? []).map((w) => (
                    <SelectItem key={w.id} value={String(w.id)} data-testid={`assessment-week-${w.id}`}>
                      {w.weekNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Lesson (optional)</Label>
              <Select
                value={assessmentForm.lessonId}
                onValueChange={(v) => setAssessmentForm((p) => ({ ...p, lessonId: v, outcomeId: "" }))}
                disabled={!assessmentForm.weekId}
              >
                <SelectTrigger className="rounded-xl" data-testid="assessment-form-lesson">
                  <SelectValue placeholder={assessmentForm.weekId ? "Select lesson" : "Select week first"} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {(lessonsQ.data ?? []).map((l) => (
                    <SelectItem key={l.id} value={String(l.id)} data-testid={`assessment-lesson-${l.id}`}>
                      {l.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2 space-y-2">
              <Label>Learning Outcome (optional)</Label>
              <Select
                value={assessmentForm.outcomeId}
                onValueChange={(v) => setAssessmentForm((p) => ({ ...p, outcomeId: v }))}
                disabled={!assessmentForm.lessonId}
              >
                <SelectTrigger className="rounded-xl" data-testid="assessment-form-outcome">
                  <SelectValue placeholder={assessmentForm.lessonId ? "Select outcome" : "Select lesson first"} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {(outcomesQ.data ?? []).map((o) => (
                    <SelectItem key={o.id} value={String(o.id)} data-testid={`assessment-outcome-${o.id}`}>
                      {o.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2 flex-wrap">
            {!editingAssessment && (
              <Button
                variant="outline"
                type="button"
                className="rounded-xl text-xs mr-auto"
                data-testid="assessment-save-template"
                onClick={() => {
                  if (!assessmentForm.title.trim()) { toast({ title: "Add a title first" }); return; }
                  const newTpl: AssessmentTemplate = {
                    id: Date.now().toString(),
                    title: assessmentForm.title.trim(),
                    type: assessmentForm.type,
                    totalScore: assessmentForm.totalScore,
                  };
                  const updated = [...templates, newTpl];
                  persistTemplates(updated);
                  setTemplates(updated);
                  toast({ title: "Template saved", description: `"${newTpl.title}" saved for future use.` });
                }}
              >
                <BookTemplate className="h-3.5 w-3.5 mr-1.5" />
                Save as template
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => setAssessmentOpen(false)}
              className="rounded-xl"
              data-testid="assessment-form-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!classId) return;
                try {
                  const payload = {
                    title: assessmentForm.title.trim(),
                    type: assessmentForm.type,
                    totalScore: Number(assessmentForm.totalScore),
                    date: new Date(assessmentForm.date),
                    lessonId: assessmentForm.lessonId ? Number(assessmentForm.lessonId) : null,
                    outcomeId: assessmentForm.outcomeId ? Number(assessmentForm.outcomeId) : null,
                  } as any;

                  if (editingAssessment) {
                    await updateAssessment.mutateAsync({ id: editingAssessment.id, ...payload });
                    toast({ title: "Assessment updated" });
                  } else {
                    const created = await createAssessment.mutateAsync({ classId, ...payload });
                    setSelectedAssessmentId(created.id);
                    toast({ title: "Assessment created" });
                  }

                  setAssessmentOpen(false);
                  setEditingAssessment(null);
                } catch (e: any) {
                  if (isUnauthorizedError(e)) return redirectToLogin(toast as any);
                  toast({ title: "Could not save assessment", description: e?.message ?? "Try again", variant: "destructive" });
                }
              }}
              disabled={
                (createAssessment.isPending || updateAssessment.isPending) ||
                !assessmentForm.title.trim() ||
                !assessmentForm.date
              }
              className="rounded-xl shadow-sm hover:shadow-md transition-all"
              data-testid="assessment-form-submit"
            >
              {(createAssessment.isPending || updateAssessment.isPending) ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
