import { useState, useRef, useEffect } from "react";
import AppShell from "@/components/AppShell";
import Meta from "@/components/Meta";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useAcademicYears,
  useCreateAcademicYear,
  useTermsByYear,
  useCreateTerm,
  useWeeksByTerm,
  useCreateWeek,
  useLessonsByWeek,
  useCreateLesson,
  useLessonsBySubject,
  useCreateSubjectLesson,
  useOutcomesByLesson,
  useCreateOutcome,
} from "@/hooks/use-academic";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { SubjectResponse } from "@shared/schema";
import {
  BookOpen,
  Plus,
  Loader2,
  ChevronDown,
  ChevronRight,
  Printer,
  BookText,
  Calendar,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Sub-component: single lesson card with inline outcomes ──────────────────

function LessonCard({ lesson }: { lesson: { id: number; title: string } }) {
  const { toast } = useToast();
  const outcomesQ = useOutcomesByLesson(lesson.id);
  const createOutcome = useCreateOutcome();
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAddOutcome = async () => {
    const desc = draft.trim();
    if (!desc) return;
    try {
      await (createOutcome.mutateAsync as any)({ lessonId: lesson.id, description: desc });
      setDraft("");
      inputRef.current?.focus();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-background overflow-hidden">
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
        data-testid={`lesson-card-${lesson.id}`}
      >
        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <BookText className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="flex-1 font-medium text-sm">{lesson.title}</span>
        <div className="flex items-center gap-2">
          {outcomesQ.data && outcomesQ.data.length > 0 && (
            <Badge variant="secondary" className="text-xs rounded-full px-2">
              {outcomesQ.data.length} outcome{outcomesQ.data.length !== 1 ? "s" : ""}
            </Badge>
          )}
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border/40 bg-muted/20 px-4 py-3 space-y-3">
          {outcomesQ.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : outcomesQ.data?.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No learning outcomes yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {outcomesQ.data?.map((o) => (
                <li key={o.id} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <span className="text-foreground/80">{o.description}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2 pt-1">
            <Input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddOutcome()}
              placeholder="Add a learning outcome… (press Enter)"
              className="rounded-xl text-sm h-9 flex-1"
              data-testid={`outcome-input-${lesson.id}`}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddOutcome}
              disabled={!draft.trim() || createOutcome.isPending}
              className="rounded-xl h-9 px-3 shrink-0"
              data-testid={`outcome-add-${lesson.id}`}
            >
              {createOutcome.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-component: Lessons panel for a selected subject ─────────────────────

function SubjectLessonsPanel({ subject, onBack }: { subject: SubjectResponse; onBack: () => void }) {
  const { toast } = useToast();
  const lessonsQ = useLessonsBySubject(subject.id);
  const createLesson = useCreateSubjectLesson();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");

  const handleCreate = async () => {
    if (!lessonTitle.trim()) return;
    try {
      await createLesson.mutateAsync({ subjectId: subject.id, title: lessonTitle.trim() });
      setLessonTitle("");
      setDialogOpen(false);
      toast({ title: "Lesson added" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={onBack}
          className="md:hidden flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          data-testid="back-to-subjects"
        >
          <ArrowLeft className="h-4 w-4" />
          Subjects
        </button>
        <div className="hidden md:flex h-10 w-10 rounded-2xl bg-primary/10 items-center justify-center shrink-0">
          <BookOpen className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold truncate">{subject.name}</h2>
          <p className="text-xs text-muted-foreground">
            {lessonsQ.data?.length ?? 0} lesson{(lessonsQ.data?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          size="sm"
          className="rounded-xl shrink-0"
          onClick={() => setDialogOpen(true)}
          data-testid="add-lesson-btn"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Lesson
        </Button>
      </div>

      {/* Lessons list */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {lessonsQ.isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading lessons…
          </div>
        ) : lessonsQ.data?.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
              <BookText className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">No lessons yet</p>
              <p className="text-sm text-muted-foreground mt-0.5">Add lessons to plan what you'll teach</p>
            </div>
            <Button size="sm" className="rounded-xl mt-2" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add First Lesson
            </Button>
          </div>
        ) : (
          lessonsQ.data?.map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} />
          ))
        )}
      </div>

      {/* Add lesson dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add Lesson to {subject.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <Label htmlFor="lesson-title">Lesson title</Label>
            <Input
              id="lesson-title"
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="e.g. Introduction to Fractions"
              className="rounded-xl"
              data-testid="lesson-title-input"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setLessonTitle(""); }} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!lessonTitle.trim() || createLesson.isPending}
              className="rounded-xl"
              data-testid="lesson-create-btn"
            >
              {createLesson.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Add Lesson
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Academic Schedule tab (simplified year→term→week hierarchy) ──────────────

function AcademicScheduleTab() {
  const { toast } = useToast();
  const yearsQ = useAcademicYears();
  const createYear = useCreateAcademicYear();
  const createTerm = useCreateTerm();
  const createWeek = useCreateWeek();
  const createLesson = useCreateLesson();

  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  const [expandedTerms, setExpandedTerms] = useState<Set<number>>(new Set());
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());

  const [selectedYearId, setSelectedYearId] = useState<number | null>(null);
  const [selectedTermId, setSelectedTermId] = useState<number | null>(null);
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);

  const termsQ = useTermsByYear(selectedYearId);
  const weeksQ = useWeeksByTerm(selectedTermId);
  const lessonsQ = useLessonsByWeek(selectedWeekId);

  const [printingYearId, setPrintingYearId] = useState<number | null>(null);

  // Dialog state
  const [yearDialog, setYearDialog] = useState(false);
  const [termDialog, setTermDialog] = useState(false);
  const [weekDialog, setWeekDialog] = useState(false);
  const [lessonDialog, setLessonDialog] = useState(false);
  const [yearName, setYearName] = useState("");
  const [termName, setTermName] = useState("");
  const [weekNum, setWeekNum] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");

  const printCurriculum = async (yearId: number) => {
    setPrintingYearId(yearId);
    try {
      const res = await fetch(`/api/academic-years/${yearId}/curriculum-pdf`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Failed to generate PDF");
      const data = await res.json();
      window.open(data.url, "_blank");
    } catch (e: any) {
      toast({ title: "Could not generate PDF", description: e?.message ?? "Try again", variant: "destructive" });
    } finally {
      setPrintingYearId(null);
    }
  };

  const toggle = (set: Set<number>, setFn: (s: Set<number>) => void, id: number, onOpen?: () => void) => {
    const next = new Set(set);
    if (next.has(id)) { next.delete(id); } else { next.add(id); onOpen?.(); }
    setFn(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Set up your school year structure — terms, weeks, and lessons for the academic hierarchy.</p>
        </div>
        <Button size="sm" className="rounded-xl" onClick={() => setYearDialog(true)} data-testid="add-year-btn">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Year
        </Button>
      </div>

      <div className="space-y-2">
        {yearsQ.isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-6 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : yearsQ.data?.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            No academic years yet. Add one to get started.
          </div>
        ) : (
          yearsQ.data?.map((year) => (
            <Card key={year.id} className="rounded-2xl border-border/60 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-muted/30">
                <button
                  onClick={() => toggle(expandedYears, setExpandedYears, year.id, () => setSelectedYearId(year.id))}
                  className="flex-1 flex items-center gap-2 text-left hover:text-primary transition-colors"
                  data-testid={`year-toggle-${year.id}`}
                >
                  {expandedYears.has(year.id) ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                  <span className="font-semibold">{year.name}</span>
                </button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-xl h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                  onClick={() => printCurriculum(year.id)}
                  disabled={printingYearId === year.id}
                  data-testid={`year-print-${year.id}`}
                >
                  {printingYearId === year.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Printer className="h-3 w-3" />}
                  <span className="hidden sm:inline">Print</span>
                </Button>
              </div>

              {expandedYears.has(year.id) && (
                <div className="px-4 py-3 space-y-2 border-t border-border/40">
                  <button
                    onClick={() => { setSelectedYearId(year.id); setTermDialog(true); }}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                    data-testid="add-term-btn"
                  >
                    <Plus className="h-3 w-3" /> Add Term
                  </button>

                  {termsQ.isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    termsQ.data?.map((term) => (
                      <div key={term.id} className="pl-3 border-l-2 border-border/40 space-y-1">
                        <button
                          onClick={() => toggle(expandedTerms, setExpandedTerms, term.id, () => setSelectedTermId(term.id))}
                          className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
                          data-testid={`term-toggle-${term.id}`}
                        >
                          {expandedTerms.has(term.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          {term.name}
                        </button>

                        {expandedTerms.has(term.id) && (
                          <div className="pl-4 space-y-1">
                            <button
                              onClick={() => { setSelectedTermId(term.id); setWeekDialog(true); }}
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              <Plus className="h-3 w-3" /> Add Week
                            </button>

                            {weeksQ.isLoading ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              weeksQ.data?.map((week) => (
                                <div key={week.id} className="pl-3 border-l border-border/30 space-y-1">
                                  <button
                                    onClick={() => toggle(expandedWeeks, setExpandedWeeks, week.id, () => setSelectedWeekId(week.id))}
                                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                    data-testid={`week-toggle-${week.id}`}
                                  >
                                    {expandedWeeks.has(week.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                    Week {week.weekNumber}
                                  </button>

                                  {expandedWeeks.has(week.id) && (
                                    <div className="pl-4 space-y-1">
                                      <button
                                        onClick={() => { setSelectedWeekId(week.id); setLessonDialog(true); }}
                                        className="text-xs text-primary hover:underline flex items-center gap-1"
                                      >
                                        <Plus className="h-3 w-3" /> Add Lesson
                                      </button>
                                      {lessonsQ.data?.map((l) => (
                                        <div key={l.id} className="text-xs py-0.5 text-foreground/70 flex items-center gap-1.5">
                                          <BookText className="h-3 w-3 text-muted-foreground shrink-0" />
                                          {l.title}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Dialogs */}
      <Dialog open={yearDialog} onOpenChange={setYearDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Add Academic Year</DialogTitle></DialogHeader>
          <div className="space-y-2 py-1">
            <Label>Year name</Label>
            <Input value={yearName} onChange={(e) => setYearName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && yearName.trim() && createYear.mutateAsync({ name: yearName.trim() }).then(() => { setYearName(""); setYearDialog(false); toast({ title: "Year created" }); })} placeholder="e.g. 2025" className="rounded-xl" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setYearDialog(false); setYearName(""); }} className="rounded-xl">Cancel</Button>
            <Button onClick={async () => { if (!yearName.trim()) return; await createYear.mutateAsync({ name: yearName.trim() } as any); setYearName(""); setYearDialog(false); toast({ title: "Year created" }); }} disabled={!yearName.trim() || createYear.isPending} className="rounded-xl">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={termDialog} onOpenChange={setTermDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Add Term</DialogTitle></DialogHeader>
          <div className="space-y-2 py-1">
            <Label>Term name</Label>
            <Input value={termName} onChange={(e) => setTermName(e.target.value)} placeholder="e.g. Term 1" className="rounded-xl" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTermDialog(false); setTermName(""); }} className="rounded-xl">Cancel</Button>
            <Button onClick={async () => { if (!termName.trim() || !selectedYearId) return; await (createTerm.mutateAsync as any)({ academicYearId: selectedYearId, name: termName.trim() }); setTermName(""); setTermDialog(false); toast({ title: "Term created" }); }} disabled={!termName.trim() || createTerm.isPending} className="rounded-xl">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={weekDialog} onOpenChange={setWeekDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Add Week</DialogTitle></DialogHeader>
          <div className="space-y-2 py-1">
            <Label>Week number</Label>
            <Input type="number" value={weekNum} onChange={(e) => setWeekNum(e.target.value)} placeholder="1" className="rounded-xl" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setWeekDialog(false); setWeekNum(""); }} className="rounded-xl">Cancel</Button>
            <Button onClick={async () => { if (!weekNum || !selectedTermId) return; await (createWeek.mutateAsync as any)({ termId: selectedTermId, weekNumber: Number(weekNum) }); setWeekNum(""); setWeekDialog(false); toast({ title: "Week created" }); }} disabled={!weekNum || createWeek.isPending} className="rounded-xl">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={lessonDialog} onOpenChange={setLessonDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Add Lesson</DialogTitle></DialogHeader>
          <div className="space-y-2 py-1">
            <Label>Lesson title</Label>
            <Input value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} placeholder="e.g. Introduction to Fractions" className="rounded-xl" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setLessonDialog(false); setLessonTitle(""); }} className="rounded-xl">Cancel</Button>
            <Button onClick={async () => { if (!lessonTitle.trim() || !selectedWeekId) return; await (createLesson.mutateAsync as any)({ weekId: selectedWeekId, title: lessonTitle.trim() }); setLessonTitle(""); setLessonDialog(false); toast({ title: "Lesson created" }); }} disabled={!lessonTitle.trim() || createLesson.isPending} className="rounded-xl">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SubjectsPage() {
  const [activeTab, setActiveTab] = useState<"subjects" | "schedule">("subjects");
  const [selectedSubject, setSelectedSubject] = useState<SubjectResponse | null>(null);
  const { toast } = useToast();

  const subjectsQ = useQuery<SubjectResponse[]>({
    queryKey: [api.subjects.list.path],
    queryFn: async () => {
      const res = await fetch(api.subjects.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch subjects");
      return res.json();
    },
  });

  const lessonCountsQ = useQuery<Record<number, number>>({
    queryKey: ["/api/subjects/lesson-counts"],
    enabled: !!subjectsQ.data?.length,
    queryFn: async () => {
      const subjects = subjectsQ.data ?? [];
      const results = await Promise.all(
        subjects.map(async (s) => {
          const res = await fetch(`/api/subjects/${s.id}/lessons`, { credentials: "include" });
          if (!res.ok) return [s.id, 0] as [number, number];
          const data = await res.json();
          return [s.id, Array.isArray(data) ? data.length : 0] as [number, number];
        })
      );
      return Object.fromEntries(results);
    },
  });

  return (
    <AppShell>
      <Meta title="Subjects • Mastery" description="Manage subjects, lessons, and learning outcomes." />

      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-3xl font-extrabold">Curriculum</h1>
          <p className="text-muted-foreground mt-1">Plan lessons and outcomes for each subject you teach.</p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-muted rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab("subjects")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === "subjects"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-subjects"
          >
            <BookOpen className="h-4 w-4" />
            Subjects & Lessons
          </button>
          <button
            onClick={() => setActiveTab("schedule")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === "schedule"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-schedule"
          >
            <Calendar className="h-4 w-4" />
            Academic Schedule
          </button>
        </div>

        {/* ── Subjects & Lessons tab ── */}
        {activeTab === "subjects" && (
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 min-h-[60vh]">
            {/* Subject list (always visible on desktop; hidden on mobile when subject selected) */}
            <Card
              className={`rounded-3xl border-border/70 p-4 flex flex-col gap-2 h-fit ${
                selectedSubject ? "hidden md:flex" : "flex"
              }`}
            >
              <div className="flex items-center justify-between mb-1 px-1">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Subjects</span>
              </div>

              {subjectsQ.isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm py-6 justify-center">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                subjectsQ.data?.map((subject) => {
                  const count = lessonCountsQ.data?.[subject.id] ?? 0;
                  const isSelected = selectedSubject?.id === subject.id;
                  return (
                    <button
                      key={subject.id}
                      onClick={() => setSelectedSubject(subject)}
                      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl text-left transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "hover:bg-muted/60 text-foreground"
                      }`}
                      data-testid={`subject-card-${subject.id}`}
                    >
                      <div
                        className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                          isSelected ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                        }`}
                      >
                        {subject.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{subject.name}</p>
                        <p className={`text-xs ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {count} lesson{count !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </Card>

            {/* Right panel: lessons for selected subject */}
            <Card
              className={`rounded-3xl border-border/70 p-5 min-h-[400px] ${
                selectedSubject ? "flex flex-col" : "hidden md:flex flex-col items-center justify-center"
              }`}
            >
              {selectedSubject ? (
                <SubjectLessonsPanel
                  key={selectedSubject.id}
                  subject={selectedSubject}
                  onBack={() => setSelectedSubject(null)}
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                    <BookOpen className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Select a subject</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Choose a subject from the left to manage its lessons and outcomes
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ── Academic Schedule tab ── */}
        {activeTab === "schedule" && (
          <Card className="rounded-3xl border-border/70 p-5">
            <AcademicScheduleTab />
          </Card>
        )}
      </div>
    </AppShell>
  );
}
