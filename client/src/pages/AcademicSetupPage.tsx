import { useMemo, useState } from "react";
import Meta from "@/components/Meta";
import AppShell from "@/components/AppShell";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError, redirectToLogin } from "@/lib/auth-utils";
import {
  useAcademicYears,
  useCreateAcademicYear,
  useCreateLesson,
  useCreateOutcome,
  useCreateTerm,
  useCreateWeek,
  useDeleteAcademicYear,
  useLessonsByWeek,
  useOutcomesByLesson,
  useTermsByYear,
  useUpdateAcademicYear,
  useWeeksByTerm,
} from "@/hooks/use-academic";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookCheck, CalendarRange, Layers, Plus, Sparkles, Target } from "lucide-react";

export default function AcademicSetupPage() {
  const { toast } = useToast();

  const yearsQ = useAcademicYears();
  const createYear = useCreateAcademicYear();
  const updateYear = useUpdateAcademicYear();
  const deleteYear = useDeleteAcademicYear();

  const [yearId, setYearId] = useState<number | null>(null);
  const termsQ = useTermsByYear(yearId);
  const createTerm = useCreateTerm();

  const [termId, setTermId] = useState<number | null>(null);
  const weeksQ = useWeeksByTerm(termId);
  const createWeek = useCreateWeek();

  const [weekId, setWeekId] = useState<number | null>(null);
  const lessonsQ = useLessonsByWeek(weekId);
  const createLesson = useCreateLesson();

  const [lessonId, setLessonId] = useState<number | null>(null);
  const outcomesQ = useOutcomesByLesson(lessonId);
  const createOutcome = useCreateOutcome();

  const selectedYear = useMemo(
    () => (yearsQ.data ?? []).find((y) => y.id === yearId) ?? null,
    [yearsQ.data, yearId],
  );

  // dialogs
  const [yearOpen, setYearOpen] = useState(false);
  const [yearName, setYearName] = useState("");

  const [yearEditOpen, setYearEditOpen] = useState(false);
  const [yearEditName, setYearEditName] = useState("");

  const [termOpen, setTermOpen] = useState(false);
  const [termName, setTermName] = useState("");

  const [weekOpen, setWeekOpen] = useState(false);
  const [weekNumber, setWeekNumber] = useState<number | string>("");

  const [lessonOpen, setLessonOpen] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");

  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [outcomeDesc, setOutcomeDesc] = useState("");

  return (
    <AppShell>
      <Meta
        title="Academic Setup • Mastery"
        description="Structure the academic year into terms, weeks, lessons, and outcomes."
      />

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Curriculum</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold">Academic Setup</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            Define a structure once, then reuse it across assessments and reports.
          </p>
        </div>

        <Button
          onClick={() => setYearOpen(true)}
          data-testid="academic-create-year-open"
          className="rounded-xl shadow-sm hover:shadow-md transition-all bg-gradient-to-r from-primary to-primary/85"
        >
          <Plus className="h-4.5 w-4.5 mr-2" />
          New academic year
        </Button>
      </div>

      <Separator className="my-6" />

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5 lg:gap-6 items-start">
        <Card className="rounded-3xl border border-border/70 bg-card/70 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarRange className="h-4.5 w-4.5 text-primary" />
              <h2 className="font-bold">Academic years</h2>
            </div>
            <span className="text-xs text-muted-foreground" data-testid="academic-years-count">
              {yearsQ.data?.length ?? 0}
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {yearsQ.isLoading ? (
              <div className="space-y-2" data-testid="academic-years-loading">
                <Skeleton className="h-11 rounded-2xl" />
                <Skeleton className="h-11 rounded-2xl" />
              </div>
            ) : yearsQ.isError ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm" data-testid="academic-years-error">
                <p className="font-semibold text-destructive">Failed to load academic years</p>
                <p className="mt-1 text-muted-foreground">{(yearsQ.error as any)?.message ?? "Try again."}</p>
              </div>
            ) : (yearsQ.data?.length ?? 0) === 0 ? (
              <EmptyState
                icon={<Sparkles className="h-6 w-6" />}
                title="Start with an academic year"
                description="Example: 2025/2026. Then add terms, weeks, lessons, and outcomes."
                primaryAction={{ label: "Create academic year", onClick: () => setYearOpen(true), testId: "academic-empty-create-year" }}
                className="bg-card/50"
              />
            ) : (
              <div className="space-y-2" data-testid="academic-years-list">
                {yearsQ.data!.map((y) => {
                  const active = y.id === yearId;
                  return (
                    <button
                      key={y.id}
                      type="button"
                      onClick={() => {
                        setYearId(y.id);
                        setTermId(null);
                        setWeekId(null);
                        setLessonId(null);
                      }}
                      data-testid={`academic-year-item-${y.id}`}
                      className={[
                        "w-full text-left rounded-2xl border px-4 py-3 transition-all duration-200",
                        "hover:bg-muted/50 hover:shadow-sm",
                        active ? "bg-secondary border-border shadow-sm" : "bg-card/60 border-border/70",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{y.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Manage terms and weeks on the right
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-xl"
                            data-testid={`academic-year-edit-open-${y.id}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setYearEditName(y.name);
                              setYearEditOpen(true);
                              setYearId(y.id);
                            }}
                            title="Edit"
                          >
                            <Plus className="h-4.5 w-4.5 rotate-45" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-xl text-destructive hover:text-destructive"
                            data-testid={`academic-year-delete-${y.id}`}
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              try {
                                await deleteYear.mutateAsync(y.id);
                                if (yearId === y.id) setYearId(null);
                                toast({ title: "Academic year deleted" });
                              } catch (err: any) {
                                if (isUnauthorizedError(err)) return redirectToLogin(toast as any);
                                toast({ title: "Could not delete year", description: err?.message ?? "Try again", variant: "destructive" });
                              }
                            }}
                            title="Delete"
                          >
                            <span className="sr-only">Delete</span>
                            <Plus className="h-4.5 w-4.5 rotate-[135deg]" />
                          </Button>
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
            <p className="text-xs text-muted-foreground">Structure</p>
            <h2 className="text-xl font-extrabold" data-testid="academic-structure-title">
              {selectedYear ? selectedYear.name : "Select an academic year"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Drill down: terms → weeks → lessons → outcomes.
            </p>
          </div>

          <Separator className="my-5" />

          {!yearId ? (
            <EmptyState
              icon={<CalendarRange className="h-6 w-6" />}
              title="Choose a year to continue"
              description="Select an academic year on the left to start building terms and lessons."
              primaryAction={{ label: "Create academic year", onClick: () => setYearOpen(true), testId: "academic-structure-create-year" }}
              className="bg-card/50"
            />
          ) : (
            <Tabs defaultValue="terms" className="w-full">
              <TabsList className="grid grid-cols-4 rounded-2xl bg-muted/60 p-1" data-testid="academic-tabs">
                <TabsTrigger value="terms" className="rounded-xl" data-testid="tab-terms">
                  Terms
                </TabsTrigger>
                <TabsTrigger value="weeks" className="rounded-xl" data-testid="tab-weeks">
                  Weeks
                </TabsTrigger>
                <TabsTrigger value="lessons" className="rounded-xl" data-testid="tab-lessons">
                  Lessons
                </TabsTrigger>
                <TabsTrigger value="outcomes" className="rounded-xl" data-testid="tab-outcomes">
                  Outcomes
                </TabsTrigger>
              </TabsList>

              <TabsContent value="terms" className="mt-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4.5 w-4.5 text-primary" />
                    <p className="font-semibold">Terms</p>
                  </div>
                  <Button
                    variant="secondary"
                    className="rounded-xl"
                    onClick={() => setTermOpen(true)}
                    data-testid="term-create-open"
                  >
                    <Plus className="h-4.5 w-4.5 mr-2" />
                    Add term
                  </Button>
                </div>

                <div className="mt-3 space-y-2">
                  {termsQ.isLoading ? (
                    <div className="space-y-2" data-testid="terms-loading">
                      <Skeleton className="h-10 rounded-2xl" />
                      <Skeleton className="h-10 rounded-2xl" />
                    </div>
                  ) : termsQ.isError ? (
                    <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm" data-testid="terms-error">
                      <p className="font-semibold text-destructive">Failed to load terms</p>
                      <p className="mt-1 text-muted-foreground">{(termsQ.error as any)?.message ?? "Try again."}</p>
                    </div>
                  ) : (termsQ.data?.length ?? 0) === 0 ? (
                    <EmptyState
                      icon={<Layers className="h-6 w-6" />}
                      title="No terms yet"
                      description="Add Term 1, Term 2, Term 3 — or your preferred structure."
                      primaryAction={{ label: "Add term", onClick: () => setTermOpen(true), testId: "terms-empty-add" }}
                      className="bg-card/50"
                    />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" data-testid="terms-list">
                      {termsQ.data!.map((t: any) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setTermId(t.id);
                            setWeekId(null);
                            setLessonId(null);
                          }}
                          className={[
                            "rounded-2xl border px-4 py-3 text-left transition-all duration-200 hover:bg-muted/50 hover:shadow-sm",
                            termId === t.id ? "bg-secondary border-border shadow-sm" : "bg-card/60 border-border/70",
                          ].join(" ")}
                          data-testid={`term-item-${t.id}`}
                        >
                          <p className="font-semibold">{t.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">Select to manage weeks</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="weeks" className="mt-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CalendarRange className="h-4.5 w-4.5 text-primary" />
                    <p className="font-semibold">Weeks</p>
                  </div>
                  <Button
                    variant="secondary"
                    className="rounded-xl"
                    onClick={() => setWeekOpen(true)}
                    disabled={!termId}
                    data-testid="week-create-open"
                  >
                    <Plus className="h-4.5 w-4.5 mr-2" />
                    Add week
                  </Button>
                </div>
                <p className="mt-2 text-sm text-muted-foreground" data-testid="weeks-hint">
                  {termId ? "Select a week to manage lessons." : "Select a term first."}
                </p>

                <div className="mt-3 space-y-2">
                  {weeksQ.isLoading ? (
                    <div className="space-y-2" data-testid="weeks-loading">
                      <Skeleton className="h-10 rounded-2xl" />
                      <Skeleton className="h-10 rounded-2xl" />
                    </div>
                  ) : weeksQ.isError ? (
                    <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm" data-testid="weeks-error">
                      <p className="font-semibold text-destructive">Failed to load weeks</p>
                      <p className="mt-1 text-muted-foreground">{(weeksQ.error as any)?.message ?? "Try again."}</p>
                    </div>
                  ) : (weeksQ.data?.length ?? 0) === 0 ? (
                    <EmptyState
                      icon={<CalendarRange className="h-6 w-6" />}
                      title="No weeks yet"
                      description="Add week numbers (1, 2, 3...) for the selected term."
                      primaryAction={{ label: "Add week", onClick: () => setWeekOpen(true), testId: "weeks-empty-add" }}
                      className="bg-card/50"
                    />
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2" data-testid="weeks-list">
                      {weeksQ.data!.map((w: any) => (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => {
                            setWeekId(w.id);
                            setLessonId(null);
                          }}
                          className={[
                            "rounded-2xl border px-4 py-3 text-left transition-all duration-200 hover:bg-muted/50 hover:shadow-sm",
                            weekId === w.id ? "bg-secondary border-border shadow-sm" : "bg-card/60 border-border/70",
                          ].join(" ")}
                          data-testid={`week-item-${w.id}`}
                        >
                          <p className="font-semibold">Week {w.weekNumber}</p>
                          <p className="mt-1 text-xs text-muted-foreground">Select</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="lessons" className="mt-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <BookCheck className="h-4.5 w-4.5 text-primary" />
                    <p className="font-semibold">Lessons</p>
                  </div>
                  <Button
                    variant="secondary"
                    className="rounded-xl"
                    onClick={() => setLessonOpen(true)}
                    disabled={!weekId}
                    data-testid="lesson-create-open"
                  >
                    <Plus className="h-4.5 w-4.5 mr-2" />
                    Add lesson
                  </Button>
                </div>
                <p className="mt-2 text-sm text-muted-foreground" data-testid="lessons-hint">
                  {weekId ? "Select a lesson to manage outcomes." : "Select a week first."}
                </p>

                <div className="mt-3 space-y-2">
                  {lessonsQ.isLoading ? (
                    <div className="space-y-2" data-testid="lessons-loading">
                      <Skeleton className="h-10 rounded-2xl" />
                      <Skeleton className="h-10 rounded-2xl" />
                    </div>
                  ) : lessonsQ.isError ? (
                    <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm" data-testid="lessons-error">
                      <p className="font-semibold text-destructive">Failed to load lessons</p>
                      <p className="mt-1 text-muted-foreground">{(lessonsQ.error as any)?.message ?? "Try again."}</p>
                    </div>
                  ) : (lessonsQ.data?.length ?? 0) === 0 ? (
                    <EmptyState
                      icon={<BookCheck className="h-6 w-6" />}
                      title="No lessons yet"
                      description="Add lesson titles like 'Fractions' or 'Reading comprehension'."
                      primaryAction={{ label: "Add lesson", onClick: () => setLessonOpen(true), testId: "lessons-empty-add" }}
                      className="bg-card/50"
                    />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" data-testid="lessons-list">
                      {lessonsQ.data!.map((l: any) => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => setLessonId(l.id)}
                          className={[
                            "rounded-2xl border px-4 py-3 text-left transition-all duration-200 hover:bg-muted/50 hover:shadow-sm",
                            lessonId === l.id ? "bg-secondary border-border shadow-sm" : "bg-card/60 border-border/70",
                          ].join(" ")}
                          data-testid={`lesson-item-${l.id}`}
                        >
                          <p className="font-semibold">{l.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">Select</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="outcomes" className="mt-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Target className="h-4.5 w-4.5 text-primary" />
                    <p className="font-semibold">Outcomes</p>
                  </div>
                  <Button
                    variant="secondary"
                    className="rounded-xl"
                    onClick={() => setOutcomeOpen(true)}
                    disabled={!lessonId}
                    data-testid="outcome-create-open"
                  >
                    <Plus className="h-4.5 w-4.5 mr-2" />
                    Add outcome
                  </Button>
                </div>
                <p className="mt-2 text-sm text-muted-foreground" data-testid="outcomes-hint">
                  {lessonId ? "Outcomes should be clear and measurable." : "Select a lesson first."}
                </p>

                <div className="mt-3 space-y-2">
                  {outcomesQ.isLoading ? (
                    <div className="space-y-2" data-testid="outcomes-loading">
                      <Skeleton className="h-10 rounded-2xl" />
                      <Skeleton className="h-10 rounded-2xl" />
                    </div>
                  ) : outcomesQ.isError ? (
                    <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm" data-testid="outcomes-error">
                      <p className="font-semibold text-destructive">Failed to load outcomes</p>
                      <p className="mt-1 text-muted-foreground">{(outcomesQ.error as any)?.message ?? "Try again."}</p>
                    </div>
                  ) : (outcomesQ.data?.length ?? 0) === 0 ? (
                    <EmptyState
                      icon={<Target className="h-6 w-6" />}
                      title="No outcomes yet"
                      description="Add outcomes such as 'Solve addition with carrying' or 'Identify main idea'."
                      primaryAction={{ label: "Add outcome", onClick: () => setOutcomeOpen(true), testId: "outcomes-empty-add" }}
                      className="bg-card/50"
                    />
                  ) : (
                    <div className="space-y-2" data-testid="outcomes-list">
                      {outcomesQ.data!.map((o: any) => (
                        <div
                          key={o.id}
                          className="rounded-2xl border border-border/70 bg-card/60 px-4 py-3 shadow-sm"
                          data-testid={`outcome-item-${o.id}`}
                        >
                          <p className="font-semibold">{o.description}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Used for mastery strength/needs analysis
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </Card>
      </div>

      {/* Create Year */}
      <Dialog open={yearOpen} onOpenChange={setYearOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create academic year</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="yearName">Name</Label>
            <Input
              id="yearName"
              value={yearName}
              onChange={(e) => setYearName(e.target.value)}
              placeholder="e.g., 2025/2026"
              className="rounded-xl"
              data-testid="year-create-name"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="secondary" onClick={() => setYearOpen(false)} className="rounded-xl" data-testid="year-create-cancel">
              Cancel
            </Button>
            <Button
              onClick={async () => {
                try {
                  const created = await createYear.mutateAsync({ teacherId: "me", name: yearName.trim() } as any);
                  setYearName("");
                  setYearOpen(false);
                  setYearId(created.id);
                  toast({ title: "Academic year created" });
                } catch (e: any) {
                  if (isUnauthorizedError(e)) return redirectToLogin(toast as any);
                  toast({ title: "Could not create year", description: e?.message ?? "Try again", variant: "destructive" });
                }
              }}
              disabled={createYear.isPending || !yearName.trim()}
              className="rounded-xl shadow-sm hover:shadow-md transition-all"
              data-testid="year-create-submit"
            >
              {createYear.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Year */}
      <Dialog open={yearEditOpen} onOpenChange={setYearEditOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit academic year</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="yearEditName">Name</Label>
            <Input
              id="yearEditName"
              value={yearEditName}
              onChange={(e) => setYearEditName(e.target.value)}
              className="rounded-xl"
              data-testid="year-edit-name"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="secondary" onClick={() => setYearEditOpen(false)} className="rounded-xl" data-testid="year-edit-cancel">
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!yearId) return;
                try {
                  await updateYear.mutateAsync({ id: yearId, name: yearEditName.trim() } as any);
                  setYearEditOpen(false);
                  toast({ title: "Academic year updated" });
                } catch (e: any) {
                  if (isUnauthorizedError(e)) return redirectToLogin(toast as any);
                  toast({ title: "Could not update year", description: e?.message ?? "Try again", variant: "destructive" });
                }
              }}
              disabled={updateYear.isPending || !yearEditName.trim()}
              className="rounded-xl shadow-sm hover:shadow-md transition-all"
              data-testid="year-edit-submit"
            >
              {updateYear.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Term */}
      <Dialog open={termOpen} onOpenChange={setTermOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add term</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="termName">Term name</Label>
            <Input
              id="termName"
              value={termName}
              onChange={(e) => setTermName(e.target.value)}
              placeholder="e.g., Term 1"
              className="rounded-xl"
              data-testid="term-create-name"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="secondary" onClick={() => setTermOpen(false)} className="rounded-xl" data-testid="term-create-cancel">
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!yearId) return;
                try {
                  await createTerm.mutateAsync({ academicYearId: yearId, name: termName.trim() } as any);
                  setTermName("");
                  setTermOpen(false);
                  toast({ title: "Term added" });
                } catch (e: any) {
                  if (isUnauthorizedError(e)) return redirectToLogin(toast as any);
                  toast({ title: "Could not add term", description: e?.message ?? "Try again", variant: "destructive" });
                }
              }}
              disabled={createTerm.isPending || !termName.trim()}
              className="rounded-xl shadow-sm hover:shadow-md transition-all"
              data-testid="term-create-submit"
            >
              {createTerm.isPending ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Week */}
      <Dialog open={weekOpen} onOpenChange={setWeekOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add week</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="weekNumber">Week number</Label>
            <Input
              id="weekNumber"
              value={String(weekNumber)}
              onChange={(e) => setWeekNumber(e.target.value)}
              placeholder="e.g., 1"
              className="rounded-xl"
              data-testid="week-create-number"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="secondary" onClick={() => setWeekOpen(false)} className="rounded-xl" data-testid="week-create-cancel">
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!termId) return;
                try {
                  const num = Number(weekNumber);
                  await createWeek.mutateAsync({ termId, weekNumber: num } as any);
                  setWeekNumber("");
                  setWeekOpen(false);
                  toast({ title: "Week added" });
                } catch (e: any) {
                  if (isUnauthorizedError(e)) return redirectToLogin(toast as any);
                  toast({ title: "Could not add week", description: e?.message ?? "Try again", variant: "destructive" });
                }
              }}
              disabled={createWeek.isPending || !String(weekNumber).trim()}
              className="rounded-xl shadow-sm hover:shadow-md transition-all"
              data-testid="week-create-submit"
            >
              {createWeek.isPending ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Lesson */}
      <Dialog open={lessonOpen} onOpenChange={setLessonOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add lesson</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="lessonTitle">Lesson title</Label>
            <Input
              id="lessonTitle"
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              placeholder="e.g., Fractions: comparing"
              className="rounded-xl"
              data-testid="lesson-create-title"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="secondary" onClick={() => setLessonOpen(false)} className="rounded-xl" data-testid="lesson-create-cancel">
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!weekId) return;
                try {
                  await createLesson.mutateAsync({ weekId, title: lessonTitle.trim() } as any);
                  setLessonTitle("");
                  setLessonOpen(false);
                  toast({ title: "Lesson added" });
                } catch (e: any) {
                  if (isUnauthorizedError(e)) return redirectToLogin(toast as any);
                  toast({ title: "Could not add lesson", description: e?.message ?? "Try again", variant: "destructive" });
                }
              }}
              disabled={createLesson.isPending || !lessonTitle.trim()}
              className="rounded-xl shadow-sm hover:shadow-md transition-all"
              data-testid="lesson-create-submit"
            >
              {createLesson.isPending ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Outcome */}
      <Dialog open={outcomeOpen} onOpenChange={setOutcomeOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add outcome</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="outcomeDesc">Outcome description</Label>
            <Input
              id="outcomeDesc"
              value={outcomeDesc}
              onChange={(e) => setOutcomeDesc(e.target.value)}
              placeholder="e.g., Solve two-step word problems"
              className="rounded-xl"
              data-testid="outcome-create-description"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="secondary" onClick={() => setOutcomeOpen(false)} className="rounded-xl" data-testid="outcome-create-cancel">
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!lessonId) return;
                try {
                  await createOutcome.mutateAsync({ lessonId, description: outcomeDesc.trim() } as any);
                  setOutcomeDesc("");
                  setOutcomeOpen(false);
                  toast({ title: "Outcome added" });
                } catch (e: any) {
                  if (isUnauthorizedError(e)) return redirectToLogin(toast as any);
                  toast({ title: "Could not add outcome", description: e?.message ?? "Try again", variant: "destructive" });
                }
              }}
              disabled={createOutcome.isPending || !outcomeDesc.trim()}
              className="rounded-xl shadow-sm hover:shadow-md transition-all"
              data-testid="outcome-create-submit"
            >
              {createOutcome.isPending ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
