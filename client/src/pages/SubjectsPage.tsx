import { useState, useRef } from "react";
import AppShell from "@/components/AppShell";
import Meta from "@/components/Meta";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useAcademicYears,
  useCreateAcademicYear,
  useTermsByYear,
  useCreateTerm,
  useWeeksByTerm,
  useCreateWeek,
  useLessonsByWeek,
  useCreateLesson,
  useCreateSubjectLesson,
  useCreateOutcome,
  useClassCurriculum,
  type CurriculumLesson,
  type CurriculumSubject,
} from "@/hooks/use-academic";
import { useClasses } from "@/hooks/use-classes";
import { useSubjects } from "@/hooks/use-subjects";
import { useQueryClient } from "@tanstack/react-query";
import type { ClassResponse } from "@shared/schema";
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
  Users,
  ChevronLeft,
  Link2,
  CalendarDays,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Inline outcome row (receives outcomes as props, no separate query) ────────

function LessonCard({
  lesson,
  classId,
  subjectColor,
}: {
  lesson: CurriculumLesson;
  classId: number;
  subjectColor: string;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const createOutcome = useCreateOutcome();
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAddOutcome = async () => {
    const desc = draft.trim();
    if (!desc) return;
    try {
      await (createOutcome.mutateAsync as any)({ lessonId: lesson.id, description: desc });
      await qc.invalidateQueries({ queryKey: ["/api/classes", classId, "curriculum"] });
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
        <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: subjectColor }} />
        <span className="flex-1 font-medium text-sm">{lesson.title}</span>
        <div className="flex items-center gap-2">
          {lesson.outcomes.length > 0 && (
            <Badge variant="secondary" className="text-xs rounded-full px-2 py-0">
              {lesson.outcomes.length}
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
          {lesson.outcomes.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No learning outcomes yet — add one below.</p>
          ) : (
            <ul className="space-y-2">
              {lesson.outcomes.map((o) => (
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
              placeholder="Type an outcome and press Enter…"
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

// ─── Group lessons by week ─────────────────────────────────────────────────────

function groupByWeek(lessons: CurriculumLesson[]): { key: string; label: string; weekNumber: number | null; lessons: CurriculumLesson[] }[] {
  const map = new Map<string, { label: string; weekNumber: number | null; lessons: CurriculumLesson[] }>();
  for (const lesson of lessons) {
    const key = lesson.weekId ? String(lesson.weekId) : "unscheduled";
    if (!map.has(key)) {
      map.set(key, {
        label: lesson.weekLabel ?? "Unscheduled",
        weekNumber: lesson.weekNumber,
        lessons: [],
      });
    }
    map.get(key)!.lessons.push(lesson);
  }
  return Array.from(map.entries())
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => {
      if (a.key === "unscheduled") return 1;
      if (b.key === "unscheduled") return -1;
      return (a.weekNumber ?? 0) - (b.weekNumber ?? 0);
    });
}

const SUBJECT_COLORS = ["#0F4C5C", "#1E6A7A", "#2A8BA0", "#C97B00", "#1B5E73", "#E8920A", "#8B5CF6", "#0891B2"];

// ─── Subject lessons panel with week grouping ─────────────────────────────────

function SubjectPanel({
  subjectData,
  colorIndex,
  selectedClass,
  onBackToSubjects,
}: {
  subjectData: CurriculumSubject;
  colorIndex: number;
  selectedClass: ClassResponse;
  onBackToSubjects: () => void;
}) {
  const { toast } = useToast();
  const createLesson = useCreateSubjectLesson();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [pickYearId, setPickYearId] = useState<string>("");
  const [pickTermId, setPickTermId] = useState<string>("");
  const [pickWeekId, setPickWeekId] = useState<string>("");
  const [printing, setPrinting] = useState(false);

  const yearsQ = useAcademicYears();
  const termsQ = useTermsByYear(pickYearId ? Number(pickYearId) : null);
  const weeksQ = useWeeksByTerm(pickTermId ? Number(pickTermId) : null);

  const color = SUBJECT_COLORS[colorIndex % SUBJECT_COLORS.length];
  const groups = groupByWeek(subjectData.lessons);

  const resetDialog = () => {
    setLessonTitle("");
    setPickYearId("");
    setPickTermId("");
    setPickWeekId("");
  };

  const handleCreate = async () => {
    if (!lessonTitle.trim()) return;
    try {
      await createLesson.mutateAsync({
        classId: selectedClass.id,
        subjectId: subjectData.subject.id,
        title: lessonTitle.trim(),
        weekId: pickWeekId ? Number(pickWeekId) : undefined,
      });
      resetDialog();
      setDialogOpen(false);
      toast({ title: "Lesson added" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const res = await fetch(`/api/classes/${selectedClass.id}/curriculum-pdf`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Failed to generate PDF");
      const data = await res.json();
      window.open(data.url, "_blank");
    } catch (e: any) {
      toast({ title: "Could not generate PDF", description: e?.message ?? "", variant: "destructive" });
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb + print */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button
          onClick={onBackToSubjects}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          data-testid="back-to-subjects"
        >
          <ChevronLeft className="h-3 w-3" />
          {selectedClass.name}
        </button>
        <span className="text-xs text-muted-foreground">/</span>
        <span className="text-xs font-medium text-foreground">{subjectData.subject.name}</span>
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handlePrint}
            disabled={printing}
            className="rounded-xl h-8 px-3 gap-1.5 text-xs"
            data-testid="print-curriculum-btn"
          >
            {printing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
            Print Curriculum
          </Button>
          <Button
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="rounded-xl h-8 px-3 gap-1.5 text-xs"
            data-testid="add-lesson-btn"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Lesson
          </Button>
        </div>
      </div>

      {/* Subject label */}
      <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 text-white text-sm font-bold" style={{ backgroundColor: color }}>
          {subjectData.subject.name.charAt(0)}
        </div>
        <div>
          <h2 className="text-lg font-bold">{subjectData.subject.name}</h2>
          <p className="text-xs text-muted-foreground">
            {subjectData.lessons.length} lesson{subjectData.lessons.length !== 1 ? "s" : ""} for {selectedClass.name}
          </p>
        </div>
      </div>

      {/* Lesson groups */}
      <div className="flex-1 overflow-y-auto space-y-5 pr-0.5">
        {subjectData.lessons.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
              <BookText className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No lessons yet</p>
              <p className="text-sm text-muted-foreground mt-0.5">Add lessons to plan what {selectedClass.name} will learn in {subjectData.subject.name}</p>
            </div>
            <Button size="sm" className="rounded-xl mt-1" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Add First Lesson
            </Button>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.key}>
              {/* Week group header */}
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                    group.key === "unscheduled"
                      ? "bg-muted text-muted-foreground"
                      : "text-white"
                  }`}
                  style={group.key !== "unscheduled" ? { backgroundColor: color } : {}}
                >
                  {group.key !== "unscheduled" && <CalendarDays className="h-3 w-3" />}
                  {group.label}
                </div>
                <span className="text-xs text-muted-foreground">{group.lessons.length} lesson{group.lessons.length !== 1 ? "s" : ""}</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>
              {/* Lesson cards */}
              <div className="space-y-2 pl-2">
                {group.lessons.map((lesson) => (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    classId={selectedClass.id}
                    subjectColor={color}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Lesson Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetDialog(); setDialogOpen(open); }}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>Add Lesson — {subjectData.subject.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
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
              <p className="text-xs text-muted-foreground">For class: <strong>{selectedClass.name}</strong></p>
            </div>

            <div className="rounded-2xl border border-border/60 p-3 space-y-3 bg-muted/20">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">Link to Academic Schedule</p>
                <Badge variant="outline" className="text-xs rounded-full ml-auto">Optional</Badge>
              </div>
              <p className="text-xs text-muted-foreground -mt-1">Choose a week so this lesson appears in the schedule grouping and curriculum printout.</p>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Academic Year</Label>
                <Select value={pickYearId} onValueChange={(v) => { setPickYearId(v); setPickTermId(""); setPickWeekId(""); }}>
                  <SelectTrigger className="rounded-xl h-9 text-sm" data-testid="pick-year-select">
                    <SelectValue placeholder="Select year…" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearsQ.data?.map((y) => (
                      <SelectItem key={y.id} value={String(y.id)}>{y.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {pickYearId && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Term</Label>
                  <Select value={pickTermId} onValueChange={(v) => { setPickTermId(v); setPickWeekId(""); }}>
                    <SelectTrigger className="rounded-xl h-9 text-sm" data-testid="pick-term-select">
                      <SelectValue placeholder="Select term…" />
                    </SelectTrigger>
                    <SelectContent>
                      {termsQ.isLoading ? (
                        <SelectItem value="loading" disabled>Loading…</SelectItem>
                      ) : !termsQ.data?.length ? (
                        <SelectItem value="none" disabled>No terms</SelectItem>
                      ) : (
                        termsQ.data.map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {pickTermId && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Week</Label>
                  <Select value={pickWeekId} onValueChange={setPickWeekId}>
                    <SelectTrigger className="rounded-xl h-9 text-sm" data-testid="pick-week-select">
                      <SelectValue placeholder="Select week…" />
                    </SelectTrigger>
                    <SelectContent>
                      {weeksQ.isLoading ? (
                        <SelectItem value="loading" disabled>Loading…</SelectItem>
                      ) : !weeksQ.data?.length ? (
                        <SelectItem value="none" disabled>No weeks</SelectItem>
                      ) : (
                        weeksQ.data.map((w) => (
                          <SelectItem key={w.id} value={String(w.id)}>Week {w.weekNumber}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {pickWeekId && (
                <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                  <Link2 className="h-3.5 w-3.5" />
                  Lesson will appear under the selected week.
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetDialog(); setDialogOpen(false); }} className="rounded-xl">Cancel</Button>
            <Button onClick={handleCreate} disabled={!lessonTitle.trim() || createLesson.isPending} className="rounded-xl" data-testid="lesson-create-btn">
              {createLesson.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Lesson
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Collapsible Academic Schedule Management ──────────────────────────────────

function ScheduleSetupSection() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
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
      toast({ title: "Could not generate PDF", description: e?.message ?? "", variant: "destructive" });
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
    <Card className="rounded-3xl border-border/70 overflow-hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
        data-testid="schedule-setup-toggle"
      >
        <Calendar className="h-4 w-4 text-primary shrink-0" />
        <span className="font-semibold text-sm flex-1">Manage Academic Schedule</span>
        <span className="text-xs text-muted-foreground mr-2">{yearsQ.data?.length ?? 0} year{(yearsQ.data?.length ?? 0) !== 1 ? "s" : ""}</span>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border/40 px-5 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Create academic years, terms, and weeks for your schedule.</p>
            <Button size="sm" className="rounded-xl h-8 text-xs gap-1" onClick={() => setYearDialog(true)} data-testid="add-year-btn">
              <Plus className="h-3.5 w-3.5" /> Add Year
            </Button>
          </div>

          <div className="space-y-2">
            {yearsQ.isLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : yearsQ.data?.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-4">No academic years yet. Add one to get started.</p>
            ) : (
              yearsQ.data?.map((year) => (
                <div key={year.id} className="rounded-2xl border border-border/60 overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/20">
                    <button
                      onClick={() => toggle(expandedYears, setExpandedYears, year.id, () => setSelectedYearId(year.id))}
                      className="flex-1 flex items-center gap-2 text-left text-sm font-semibold hover:text-primary transition-colors"
                      data-testid={`year-toggle-${year.id}`}
                    >
                      {expandedYears.has(year.id) ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      {year.name}
                    </button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-muted-foreground" onClick={() => printCurriculum(year.id)} disabled={printingYearId === year.id}>
                      {printingYearId === year.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Printer className="h-3 w-3" />}
                      <span className="hidden sm:inline">Schedule PDF</span>
                    </Button>
                  </div>

                  {expandedYears.has(year.id) && (
                    <div className="px-3 py-2 space-y-1.5 border-t border-border/40">
                      <button onClick={() => { setSelectedYearId(year.id); setTermDialog(true); }} className="text-xs text-primary hover:underline flex items-center gap-1">
                        <Plus className="h-3 w-3" /> Add Term
                      </button>
                      {termsQ.data?.map((term) => (
                        <div key={term.id} className="pl-3 border-l-2 border-primary/20 space-y-1">
                          <button onClick={() => toggle(expandedTerms, setExpandedTerms, term.id, () => setSelectedTermId(term.id))} className="flex items-center gap-2 text-xs font-medium hover:text-primary py-0.5" data-testid={`term-toggle-${term.id}`}>
                            {expandedTerms.has(term.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            {term.name}
                          </button>
                          {expandedTerms.has(term.id) && (
                            <div className="pl-3 space-y-1 pt-0.5">
                              <button onClick={() => { setSelectedTermId(term.id); setWeekDialog(true); }} className="text-xs text-primary hover:underline flex items-center gap-1">
                                <Plus className="h-3 w-3" /> Add Week
                              </button>
                              {weeksQ.data?.map((week) => (
                                <div key={week.id} className="pl-3 border-l border-border/30">
                                  <button onClick={() => toggle(expandedWeeks, setExpandedWeeks, week.id, () => setSelectedWeekId(week.id))} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground py-0.5" data-testid={`week-toggle-${week.id}`}>
                                    {expandedWeeks.has(week.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                    Week {week.weekNumber}
                                  </button>
                                  {expandedWeeks.has(week.id) && (
                                    <div className="pl-3 space-y-0.5 pb-1">
                                      <button onClick={() => { setSelectedWeekId(week.id); setLessonDialog(true); }} className="text-xs text-primary hover:underline flex items-center gap-1">
                                        <Plus className="h-3 w-3" /> Add Lesson
                                      </button>
                                      {lessonsQ.data?.map((l) => (
                                        <div key={l.id} className="text-xs text-foreground/60 flex items-center gap-1 py-0.5">
                                          <BookText className="h-3 w-3 shrink-0 text-muted-foreground" />{l.title}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <Dialog open={yearDialog} onOpenChange={setYearDialog}>
        <DialogContent className="rounded-2xl"><DialogHeader><DialogTitle>Add Academic Year</DialogTitle></DialogHeader>
          <div className="space-y-2 py-1"><Label>Year name</Label><Input value={yearName} onChange={(e) => setYearName(e.target.value)} placeholder="e.g. 2025/2026" className="rounded-xl" autoFocus /></div>
          <DialogFooter><Button variant="outline" onClick={() => { setYearDialog(false); setYearName(""); }} className="rounded-xl">Cancel</Button><Button onClick={async () => { if (!yearName.trim()) return; await (createYear.mutateAsync as any)({ name: yearName.trim() }); setYearName(""); setYearDialog(false); toast({ title: "Year created" }); }} disabled={!yearName.trim() || createYear.isPending} className="rounded-xl">Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={termDialog} onOpenChange={setTermDialog}>
        <DialogContent className="rounded-2xl"><DialogHeader><DialogTitle>Add Term</DialogTitle></DialogHeader>
          <div className="space-y-2 py-1"><Label>Term name</Label><Input value={termName} onChange={(e) => setTermName(e.target.value)} placeholder="e.g. Term 1" className="rounded-xl" autoFocus /></div>
          <DialogFooter><Button variant="outline" onClick={() => { setTermDialog(false); setTermName(""); }} className="rounded-xl">Cancel</Button><Button onClick={async () => { if (!termName.trim() || !selectedYearId) return; await (createTerm.mutateAsync as any)({ academicYearId: selectedYearId, name: termName.trim() }); setTermName(""); setTermDialog(false); toast({ title: "Term created" }); }} disabled={!termName.trim() || createTerm.isPending} className="rounded-xl">Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={weekDialog} onOpenChange={setWeekDialog}>
        <DialogContent className="rounded-2xl"><DialogHeader><DialogTitle>Add Week</DialogTitle></DialogHeader>
          <div className="space-y-2 py-1"><Label>Week number</Label><Input type="number" value={weekNum} onChange={(e) => setWeekNum(e.target.value)} placeholder="1" className="rounded-xl" autoFocus /></div>
          <DialogFooter><Button variant="outline" onClick={() => { setWeekDialog(false); setWeekNum(""); }} className="rounded-xl">Cancel</Button><Button onClick={async () => { if (!weekNum || !selectedTermId) return; await (createWeek.mutateAsync as any)({ termId: selectedTermId, weekNumber: Number(weekNum) }); setWeekNum(""); setWeekDialog(false); toast({ title: "Week created" }); }} disabled={!weekNum || createWeek.isPending} className="rounded-xl">Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={lessonDialog} onOpenChange={setLessonDialog}>
        <DialogContent className="rounded-2xl"><DialogHeader><DialogTitle>Add Lesson</DialogTitle></DialogHeader>
          <div className="space-y-2 py-1"><Label>Lesson title</Label><Input value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} placeholder="e.g. Introduction to Fractions" className="rounded-xl" autoFocus /></div>
          <DialogFooter><Button variant="outline" onClick={() => { setLessonDialog(false); setLessonTitle(""); }} className="rounded-xl">Cancel</Button><Button onClick={async () => { if (!lessonTitle.trim() || !selectedWeekId) return; await (createLesson.mutateAsync as any)({ weekId: selectedWeekId, title: lessonTitle.trim() }); setLessonTitle(""); setLessonDialog(false); toast({ title: "Lesson created" }); }} disabled={!lessonTitle.trim() || createLesson.isPending} className="rounded-xl">Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function SubjectsPage() {
  const [selectedClass, setSelectedClass] = useState<ClassResponse | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [printing, setPrinting] = useState(false);
  const { toast } = useToast();

  const classesQ = useClasses();
  const allSubjectsQ = useSubjects();
  const curriculumQ = useClassCurriculum(selectedClass?.id ?? null);

  const handleSelectClass = (cls: ClassResponse) => {
    setSelectedClass(cls);
    setSelectedSubjectId(null);
  };

  const handlePrintClass = async () => {
    if (!selectedClass) return;
    setPrinting(true);
    try {
      const res = await fetch(`/api/classes/${selectedClass.id}/curriculum-pdf`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Failed to generate PDF");
      const data = await res.json();
      window.open(data.url, "_blank");
    } catch (e: any) {
      toast({ title: "Could not generate PDF", description: e?.message ?? "", variant: "destructive" });
    } finally {
      setPrinting(false);
    }
  };

  // All subjects (for the left panel) — curriculum enriches with lesson data
  const allSubjects = allSubjectsQ.data ?? [];
  const curriculumSubjectsMap = new Map((curriculumQ.data?.subjects ?? []).map((s) => [s.subject.id, s]));

  // Build subject data for selected subject (use curriculum data if available, otherwise empty)
  const selectedSubjectMeta = selectedSubjectId != null
    ? allSubjects.find((s) => s.id === selectedSubjectId) ?? null
    : null;
  const selectedSubjectData: CurriculumSubject | null = selectedSubjectMeta
    ? (curriculumSubjectsMap.get(selectedSubjectMeta.id) ?? { subject: { id: selectedSubjectMeta.id, name: selectedSubjectMeta.name }, lessons: [] })
    : null;
  const selectedColorIndex = selectedSubjectId != null
    ? allSubjects.findIndex((s) => s.id === selectedSubjectId)
    : 0;

  return (
    <AppShell>
      <Meta title="Curriculum • Mastery" description="Plan lessons and outcomes per class and subject, linked to your academic schedule." />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-extrabold">Curriculum</h1>
            <p className="text-muted-foreground mt-1">Plan lessons and outcomes per class, linked to your academic schedule.</p>
          </div>
          {selectedClass && (
            <Button
              onClick={handlePrintClass}
              disabled={printing}
              className="rounded-xl gap-2"
              data-testid="print-class-curriculum-btn"
            >
              {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Print {selectedClass.name} Curriculum
            </Button>
          )}
        </div>

        {/* Class Selector */}
        <Card className="rounded-3xl border-border/70 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">Select a Class</h2>
            <Badge variant="outline" className="text-xs rounded-full ml-auto">Required</Badge>
          </div>
          {classesQ.isLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : classesQ.data?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No classes yet. Create a class first.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {classesQ.data?.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => handleSelectClass(cls)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                    selectedClass?.id === cls.id
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "border-border hover:border-primary/50 hover:bg-muted/60"
                  }`}
                  data-testid={`class-pill-${cls.id}`}
                >
                  <div className={`h-5 w-5 rounded-md flex items-center justify-center text-xs font-bold ${
                    selectedClass?.id === cls.id ? "bg-white/20" : "bg-primary/10 text-primary"
                  }`}>
                    {cls.name.charAt(0).toUpperCase()}
                  </div>
                  {cls.name}
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Main content */}
        {!selectedClass ? (
          <div className="flex items-center justify-center py-16 text-center">
            <div className="max-w-xs space-y-3">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                <Users className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="font-semibold">Choose a class above</p>
              <p className="text-sm text-muted-foreground">Select a class to manage its curriculum — subjects, lessons, weekly scheduling, and learning outcomes.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
            {/* Subject list — hidden on mobile when a subject is open */}
            <Card className={`rounded-3xl border-border/70 p-4 flex flex-col gap-1 h-fit ${selectedSubjectData ? "hidden md:flex" : "flex"}`}>
              {allSubjectsQ.isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-2">Subjects</p>
                  {allSubjects.map((sub, idx) => {
                    const color = SUBJECT_COLORS[idx % SUBJECT_COLORS.length];
                    const isSelected = selectedSubjectId === sub.id;
                    const lessonCount = curriculumSubjectsMap.get(sub.id)?.lessons.length ?? 0;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => setSelectedSubjectId(sub.id)}
                        className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl text-left transition-all ${
                          isSelected ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted/60"
                        }`}
                        data-testid={`subject-card-${sub.id}`}
                      >
                        <div
                          className="h-7 w-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold text-white"
                          style={{ backgroundColor: isSelected ? "rgba(255,255,255,0.25)" : color }}
                        >
                          {sub.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{sub.name}</p>
                          <p className={`text-xs ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {lessonCount > 0 ? `${lessonCount} lesson${lessonCount !== 1 ? "s" : ""}` : "No lessons yet"}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
            </Card>

            {/* Lesson panel */}
            <Card className={`rounded-3xl border-border/70 p-5 min-h-[400px] flex flex-col ${!selectedSubjectData ? "items-center justify-center" : ""}`}>
              {selectedSubjectData ? (
                <SubjectPanel
                  key={`${selectedClass.id}-${selectedSubjectData.subject.id}`}
                  subjectData={selectedSubjectData}
                  colorIndex={selectedColorIndex}
                  selectedClass={selectedClass}
                  onBackToSubjects={() => setSelectedSubjectId(null)}
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-center py-6">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                    <BookOpen className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">Select a subject</p>
                    <p className="text-sm text-muted-foreground mt-0.5 max-w-xs">
                      Pick a subject from the list to add lessons, link them to your academic schedule, and add learning outcomes.
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Link2 className="h-3 w-3" /> Link lessons to weeks for the curriculum printout.
                  </p>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Academic Schedule Manager (collapsible) */}
        <ScheduleSetupSection />
      </div>
    </AppShell>
  );
}
