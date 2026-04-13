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
  useLessonsBySubject,
  useCreateSubjectLesson,
  useOutcomesByLesson,
  useCreateOutcome,
  type SubjectLesson,
} from "@/hooks/use-academic";
import { useClasses } from "@/hooks/use-classes";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { SubjectResponse, ClassResponse } from "@shared/schema";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Lesson card with inline outcome management ───────────────────────────────

function LessonCard({ lesson }: { lesson: SubjectLesson }) {
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
          {lesson.weekId && (
            <Badge className="text-xs rounded-full px-2 py-0 bg-accent/20 text-accent-foreground border border-accent/30 gap-1 hidden sm:flex">
              <Link2 className="h-3 w-3" /> Scheduled
            </Badge>
          )}
          {outcomesQ.data && outcomesQ.data.length > 0 && (
            <Badge variant="secondary" className="text-xs rounded-full px-2 py-0">
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
            <p className="text-xs text-muted-foreground italic">No learning outcomes yet — add one below.</p>
          ) : (
            <ul className="space-y-2">
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

// ─── Lessons panel for a selected class + subject ────────────────────────────

function SubjectLessonsPanel({
  selectedClass,
  subject,
  onBackToSubjects,
}: {
  selectedClass: ClassResponse;
  subject: SubjectResponse;
  onBackToSubjects: () => void;
}) {
  const { toast } = useToast();
  const lessonsQ = useLessonsBySubject(selectedClass.id, subject.id);
  const createLesson = useCreateSubjectLesson();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");

  // Week scheduling state
  const [pickYearId, setPickYearId] = useState<string>("");
  const [pickTermId, setPickTermId] = useState<string>("");
  const [pickWeekId, setPickWeekId] = useState<string>("");
  const yearsQ = useAcademicYears();
  const termsQ = useTermsByYear(pickYearId ? Number(pickYearId) : null);
  const weeksQ = useWeeksByTerm(pickTermId ? Number(pickTermId) : null);

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
        subjectId: subject.id,
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

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4 flex-wrap">
        <button
          onClick={onBackToSubjects}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
          data-testid="back-to-subjects"
        >
          <ChevronLeft className="h-3 w-3" />
          {selectedClass.name}
        </button>
        <span>/</span>
        <span className="text-foreground font-medium">{subject.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <BookOpen className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold truncate">{subject.name}</h2>
          <p className="text-xs text-muted-foreground">
            {lessonsQ.data?.length ?? 0} lesson{(lessonsQ.data?.length ?? 0) !== 1 ? "s" : ""} for {selectedClass.name}
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

      {/* Lessons */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
        {lessonsQ.isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : lessonsQ.data?.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
              <BookText className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No lessons yet</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Add lessons to plan what {selectedClass.name} will learn in {subject.name}
              </p>
            </div>
            <Button size="sm" className="rounded-xl mt-1" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Add First Lesson
            </Button>
          </div>
        ) : (
          lessonsQ.data?.map((lesson) => <LessonCard key={lesson.id} lesson={lesson} />)
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetDialog(); setDialogOpen(open); }}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>Add Lesson — {subject.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            {/* Lesson title */}
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

            {/* Week scheduling */}
            <div className="rounded-2xl border border-border/60 p-3 space-y-3 bg-muted/20">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">Link to Academic Schedule</p>
                <Badge variant="outline" className="text-xs rounded-full ml-auto">Optional</Badge>
              </div>
              <p className="text-xs text-muted-foreground -mt-1">
                Choose a week so this lesson appears in your curriculum printout.
              </p>

              {/* Year */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Academic Year</Label>
                <Select
                  value={pickYearId}
                  onValueChange={(v) => { setPickYearId(v); setPickTermId(""); setPickWeekId(""); }}
                >
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

              {/* Term */}
              {pickYearId && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Term</Label>
                  <Select
                    value={pickTermId}
                    onValueChange={(v) => { setPickTermId(v); setPickWeekId(""); }}
                  >
                    <SelectTrigger className="rounded-xl h-9 text-sm" data-testid="pick-term-select">
                      <SelectValue placeholder="Select term…" />
                    </SelectTrigger>
                    <SelectContent>
                      {termsQ.isLoading ? (
                        <SelectItem value="loading" disabled>Loading…</SelectItem>
                      ) : termsQ.data?.length === 0 ? (
                        <SelectItem value="none" disabled>No terms found</SelectItem>
                      ) : (
                        termsQ.data?.map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Week */}
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
                      ) : weeksQ.data?.length === 0 ? (
                        <SelectItem value="none" disabled>No weeks found</SelectItem>
                      ) : (
                        weeksQ.data?.map((w) => (
                          <SelectItem key={w.id} value={String(w.id)}>Week {w.weekNumber}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {pickWeekId && (
                <div className="flex items-center gap-2 text-xs text-primary font-medium">
                  <Link2 className="h-3.5 w-3.5" />
                  This lesson will appear in the curriculum printout for the selected week.
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetDialog(); setDialogOpen(false); }} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!lessonTitle.trim() || createLesson.isPending}
              className="rounded-xl"
              data-testid="lesson-create-btn"
            >
              {createLesson.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Lesson
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Academic Schedule tab ────────────────────────────────────────────────────

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Manage your school year structure — terms, weeks, and schedule.</p>
        <Button size="sm" className="rounded-xl" onClick={() => setYearDialog(true)} data-testid="add-year-btn">
          <Plus className="h-4 w-4 mr-1.5" /> Add Year
        </Button>
      </div>

      <div className="space-y-2">
        {yearsQ.isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : yearsQ.data?.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground text-sm">No academic years yet.</p>
        ) : (
          yearsQ.data?.map((year) => (
            <div key={year.id} className="rounded-2xl border border-border/60 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-muted/20">
                <button
                  onClick={() => toggle(expandedYears, setExpandedYears, year.id, () => setSelectedYearId(year.id))}
                  className="flex-1 flex items-center gap-2 text-left font-semibold hover:text-primary transition-colors"
                  data-testid={`year-toggle-${year.id}`}
                >
                  {expandedYears.has(year.id) ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                  {year.name}
                </button>
                <Button
                  size="sm" variant="ghost"
                  className="rounded-xl h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground shrink-0"
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
                  >
                    <Plus className="h-3 w-3" /> Add Term
                  </button>

                  {termsQ.data?.map((term) => (
                    <div key={term.id} className="pl-3 border-l-2 border-primary/20 space-y-1">
                      <button
                        onClick={() => toggle(expandedTerms, setExpandedTerms, term.id, () => setSelectedTermId(term.id))}
                        className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors py-0.5"
                        data-testid={`term-toggle-${term.id}`}
                      >
                        {expandedTerms.has(term.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        {term.name}
                      </button>

                      {expandedTerms.has(term.id) && (
                        <div className="pl-4 space-y-1.5 pt-1">
                          <button
                            onClick={() => { setSelectedTermId(term.id); setWeekDialog(true); }}
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" /> Add Week
                          </button>

                          {weeksQ.data?.map((week) => (
                            <div key={week.id} className="pl-3 border-l border-border/30 space-y-1">
                              <button
                                onClick={() => toggle(expandedWeeks, setExpandedWeeks, week.id, () => setSelectedWeekId(week.id))}
                                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5"
                                data-testid={`week-toggle-${week.id}`}
                              >
                                {expandedWeeks.has(week.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                Week {week.weekNumber}
                              </button>

                              {expandedWeeks.has(week.id) && (
                                <div className="pl-4 space-y-1 pb-1">
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

      {/* Dialogs */}
      <Dialog open={yearDialog} onOpenChange={setYearDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Add Academic Year</DialogTitle></DialogHeader>
          <div className="space-y-2 py-1">
            <Label>Year name</Label>
            <Input value={yearName} onChange={(e) => setYearName(e.target.value)} placeholder="e.g. 2025/2026" className="rounded-xl" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setYearDialog(false); setYearName(""); }} className="rounded-xl">Cancel</Button>
            <Button onClick={async () => { if (!yearName.trim()) return; await (createYear.mutateAsync as any)({ name: yearName.trim() }); setYearName(""); setYearDialog(false); toast({ title: "Year created" }); }} disabled={!yearName.trim() || createYear.isPending} className="rounded-xl">Create</Button>
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
  const [selectedClass, setSelectedClass] = useState<ClassResponse | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<SubjectResponse | null>(null);

  const classesQ = useClasses();
  const subjectsQ = useQuery<SubjectResponse[]>({
    queryKey: [api.subjects.list.path],
    queryFn: async () => {
      const res = await fetch(api.subjects.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch subjects");
      return res.json();
    },
  });

  // Count lessons per subject for selected class
  const lessonCountsQ = useQuery<Record<number, number>>({
    queryKey: ["/api/lesson-counts", selectedClass?.id],
    enabled: !!selectedClass && !!subjectsQ.data?.length,
    queryFn: async () => {
      const subs = subjectsQ.data ?? [];
      const results = await Promise.all(
        subs.map(async (s) => {
          const res = await fetch(`/api/classes/${selectedClass!.id}/subjects/${s.id}/lessons`, { credentials: "include" });
          if (!res.ok) return [s.id, 0] as [number, number];
          const data = await res.json();
          return [s.id, Array.isArray(data) ? data.length : 0] as [number, number];
        })
      );
      return Object.fromEntries(results);
    },
  });

  const handleSelectClass = (cls: ClassResponse) => {
    setSelectedClass(cls);
    setSelectedSubject(null);
  };

  const handleSelectSubject = (sub: SubjectResponse) => {
    setSelectedSubject(sub);
  };

  const handleBackToSubjects = () => {
    setSelectedSubject(null);
  };

  return (
    <AppShell>
      <Meta title="Subjects • Mastery" description="Manage subjects, lessons, and learning outcomes per class." />

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold">Curriculum</h1>
          <p className="text-muted-foreground mt-1">Plan lessons and outcomes for each class and subject.</p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-muted rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab("subjects")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === "subjects" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-subjects"
          >
            <BookOpen className="h-4 w-4" />
            Subjects & Lessons
          </button>
          <button
            onClick={() => setActiveTab("schedule")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === "schedule" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-schedule"
          >
            <Calendar className="h-4 w-4" />
            Academic Schedule
          </button>
        </div>

        {/* ── Subjects & Lessons tab ── */}
        {activeTab === "subjects" && (
          <div className="space-y-4">

            {/* Step 1: Class selector */}
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

            {/* Step 2 + 3: Subject list and lesson panel (only show when class selected) */}
            {!selectedClass ? (
              <div className="flex items-center justify-center py-12 text-center">
                <div className="max-w-xs space-y-3">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                    <Users className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="font-semibold text-foreground">Choose a class above</p>
                  <p className="text-sm text-muted-foreground">
                    Select a class to view and manage its lessons and learning outcomes per subject.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
                {/* Subject list — hidden on mobile when a subject is selected */}
                <Card className={`rounded-3xl border-border/70 p-4 flex flex-col gap-1.5 h-fit ${selectedSubject ? "hidden md:flex" : "flex"}`}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-1">
                    Subjects for {selectedClass.name}
                  </p>

                  {subjectsQ.isLoading ? (
                    <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                  ) : (
                    subjectsQ.data?.map((subject) => {
                      const count = lessonCountsQ.data?.[subject.id] ?? 0;
                      const isSelected = selectedSubject?.id === subject.id;
                      return (
                        <button
                          key={subject.id}
                          onClick={() => handleSelectSubject(subject)}
                          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl text-left transition-all ${
                            isSelected
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "hover:bg-muted/60 text-foreground"
                          }`}
                          data-testid={`subject-card-${subject.id}`}
                        >
                          <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                            isSelected ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                          }`}>
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

                {/* Lessons + outcomes panel */}
                <Card className={`rounded-3xl border-border/70 p-5 min-h-[400px] ${selectedSubject ? "flex flex-col" : "hidden md:flex items-center justify-center"}`}>
                  {selectedSubject ? (
                    <SubjectLessonsPanel
                      key={`${selectedClass.id}-${selectedSubject.id}`}
                      selectedClass={selectedClass}
                      subject={selectedSubject}
                      onBackToSubjects={handleBackToSubjects}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                        <BookOpen className="h-7 w-7 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">Select a subject</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Choose a subject from the list to manage its lessons and outcomes for {selectedClass.name}
                        </p>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            )}
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
