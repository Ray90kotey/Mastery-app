import { useMemo, useState } from "react";
import Meta from "@/components/Meta";
import AppShell from "@/components/AppShell";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError, redirectToLogin } from "@/lib/auth-utils";
import { useClasses } from "@/hooks/use-classes";
import { useStudentsByClass } from "@/hooks/use-students";
import { useAssessmentsByClass, useCreateAssessment, useDeleteAssessment, useUpdateAssessment } from "@/hooks/use-assessments";
import { useUpsertScores } from "@/hooks/use-scores";
import { useSubjects } from "@/hooks/use-subjects";
import { useAcademicYears } from "@/hooks/use-academic";
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
import { ClipboardList, Plus, Save, Trash2, Filter } from "lucide-react";

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
  const [filterSubjectId, setFilterSubjectId] = useState<string>("all");
  const [filterYearId, setFilterYearId] = useState<string>("all");

  const [selectedAssessmentId, setSelectedAssessmentId] = useState<number | null>(null);

  const selectedAssessment = useMemo(
    () => (assessmentsQ.data ?? []).find((a) => a.id === selectedAssessmentId) ?? null,
    [assessmentsQ.data, selectedAssessmentId],
  );

  const [scoreDrafts, setScoreDrafts] = useState<Record<number, string>>({});

  const filteredAssessments = useMemo(() => {
    let list = assessmentsQ.data ?? [];
    if (filterSubjectId !== "all") {
      // @ts-ignore - subjectId exists in schema
      list = list.filter(a => (a as any).subjectId === Number(filterSubjectId));
    }
    if (filterYearId !== "all") {
      // @ts-ignore
      list = list.filter(a => (a as any).academicYearId === Number(filterYearId));
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
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setSelectedAssessmentId(a.id);
                          setScoreDrafts({});
                        }}
                        className={[
                          "w-full text-left rounded-2xl border px-4 py-3 transition-all duration-200 hover:bg-muted/50 hover:shadow-sm",
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
                      </button>
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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="text-xs text-muted-foreground" data-testid="scores-stats">
                    {studentsQ.data!.length} students • Draft changes:{" "}
                    {Object.keys(scoreDrafts).length}
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

                <div className="rounded-2xl border border-border/70 overflow-hidden bg-card/50" data-testid="scores-table">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead className="w-[160px] text-right">Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentsQ.data!.map((s) => {
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
              <Label htmlFor="assLessonId">Lesson ID (optional)</Label>
              <Input
                id="assLessonId"
                value={assessmentForm.lessonId}
                onChange={(e) => setAssessmentForm((p) => ({ ...p, lessonId: e.target.value }))}
                placeholder="Optional"
                className="rounded-xl"
                data-testid="assessment-form-lessonId"
              />
            </div>

            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="assOutcomeId">Outcome ID (optional)</Label>
              <Input
                id="assOutcomeId"
                value={assessmentForm.outcomeId}
                onChange={(e) => setAssessmentForm((p) => ({ ...p, outcomeId: e.target.value }))}
                placeholder="Optional"
                className="rounded-xl"
                data-testid="assessment-form-outcomeId"
              />
              <p className="text-xs text-muted-foreground">
                If your backend wires lesson/outcome selection later, you can replace these ID fields with selects.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
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
