import { useState, useMemo } from "react";
import AppShell from "@/components/AppShell";
import Meta from "@/components/Meta";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  useAcademicYears,
  useCreateAcademicYear,
  useTermsByYear,
  useCreateTerm,
  useWeeksByTerm,
  useCreateWeek,
  useLessonsByWeek,
  useCreateLesson,
  useOutcomesByLesson,
  useCreateOutcome,
} from "@/hooks/use-academic";
import { BookOpen, Plus, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SubjectsPage() {
  const { toast } = useToast();

  // Academic years
  const yearsQ = useAcademicYears();
  const createYear = useCreateAcademicYear();
  const [yearName, setYearName] = useState("");
  const [yearDialogOpen, setYearDialogOpen] = useState(false);

  // Terms
  const [selectedYearId, setSelectedYearId] = useState<number | null>(null);
  const termsQ = useTermsByYear(selectedYearId);
  const createTerm = useCreateTerm();
  const [termName, setTermName] = useState("");
  const [termDialogOpen, setTermDialogOpen] = useState(false);

  // Weeks
  const [selectedTermId, setSelectedTermId] = useState<number | null>(null);
  const weeksQ = useWeeksByTerm(selectedTermId);
  const createWeek = useCreateWeek();
  const [weekNum, setWeekNum] = useState("");
  const [weekDialogOpen, setWeekDialogOpen] = useState(false);

  // Lessons
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const lessonsQ = useLessonsByWeek(selectedWeekId);
  const createLesson = useCreateLesson();
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);

  // Outcomes
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const outcomesQ = useOutcomesByLesson(selectedLessonId);
  const createOutcome = useCreateOutcome();
  const [outcomeDesc, setOutcomeDesc] = useState("");
  const [outcomeDialogOpen, setOutcomeDialogOpen] = useState(false);

  // UI state
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  const [expandedTerms, setExpandedTerms] = useState<Set<number>>(new Set());
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
  const [expandedLessons, setExpandedLessons] = useState<Set<number>>(new Set());

  const toggleYear = (id: number) => {
    const newSet = new Set(expandedYears);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
      setSelectedYearId(id);
    }
    setExpandedYears(newSet);
  };

  const toggleTerm = (id: number) => {
    const newSet = new Set(expandedTerms);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
      setSelectedTermId(id);
    }
    setExpandedTerms(newSet);
  };

  const toggleWeek = (id: number) => {
    const newSet = new Set(expandedWeeks);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
      setSelectedWeekId(id);
    }
    setExpandedWeeks(newSet);
  };

  const toggleLesson = (id: number) => {
    const newSet = new Set(expandedLessons);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
      setSelectedLessonId(id);
    }
    setExpandedLessons(newSet);
  };

  return (
    <AppShell>
      <Meta title="Subjects • Mastery" description="Manage subjects, lessons, and learning outcomes." />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold">Subjects</h1>
          <p className="text-muted-foreground mt-1">Organize lessons and outcomes by term.</p>
        </div>

        {/* Academic Years Section */}
        <Card className="p-6 rounded-3xl border-border/70 bg-card/70">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Academic Years</h2>
            <Button
              size="sm"
              onClick={() => setYearDialogOpen(true)}
              className="rounded-xl"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Year
            </Button>
          </div>

          <div className="space-y-2">
            {yearsQ.isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : yearsQ.data?.length === 0 ? (
              <p className="text-muted-foreground text-sm">No academic years yet.</p>
            ) : (
              yearsQ.data?.map((year) => (
                <div key={year.id} className="space-y-2">
                  <button
                    onClick={() => toggleYear(year.id)}
                    className="w-full flex items-center gap-2 p-3 hover:bg-muted/50 rounded-xl transition-colors"
                  >
                    {expandedYears.has(year.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span className="font-semibold">{year.name}</span>
                  </button>

                  {expandedYears.has(year.id) && (
                    <div className="pl-6 space-y-2">
                      <button
                        onClick={() => {
                          setSelectedYearId(year.id);
                          setTermDialogOpen(true);
                        }}
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        Add Term
                      </button>

                      {termsQ.isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : termsQ.data?.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No terms yet.</p>
                      ) : (
                        termsQ.data?.map((term) => (
                          <div key={term.id} className="space-y-1">
                            <button
                              onClick={() => toggleTerm(term.id)}
                              className="w-full flex items-center gap-2 p-2 text-sm hover:bg-muted/30 rounded-lg transition-colors"
                            >
                              {expandedTerms.has(term.id) ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                              <span className="font-medium">{term.name}</span>
                            </button>

                            {expandedTerms.has(term.id) && (
                              <div className="pl-6 space-y-1">
                                <button
                                  onClick={() => {
                                    setSelectedTermId(term.id);
                                    setWeekDialogOpen(true);
                                  }}
                                  className="text-xs text-primary hover:underline flex items-center gap-1"
                                >
                                  <Plus className="h-3 w-3" />
                                  Add Week
                                </button>

                                {weeksQ.isLoading ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : weeksQ.data?.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">No weeks yet.</p>
                                ) : (
                                  weeksQ.data?.map((week) => (
                                    <div key={week.id} className="space-y-1">
                                      <button
                                        onClick={() => toggleWeek(week.id)}
                                        className="w-full flex items-center gap-2 p-1 text-xs hover:bg-muted/20 rounded transition-colors"
                                      >
                                        {expandedWeeks.has(week.id) ? (
                                          <ChevronDown className="h-3 w-3" />
                                        ) : (
                                          <ChevronRight className="h-3 w-3" />
                                        )}
                                        <span>Week {week.weekNumber}</span>
                                      </button>

                                      {expandedWeeks.has(week.id) && (
                                        <div className="pl-6 space-y-1">
                                          <button
                                            onClick={() => {
                                              setSelectedWeekId(week.id);
                                              setLessonDialogOpen(true);
                                            }}
                                            className="text-xs text-primary hover:underline flex items-center gap-1"
                                          >
                                            <Plus className="h-3 w-3" />
                                            Add Lesson
                                          </button>

                                          {lessonsQ.isLoading ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                          ) : lessonsQ.data?.length === 0 ? (
                                            <p className="text-xs text-muted-foreground">No lessons yet.</p>
                                          ) : (
                                            lessonsQ.data?.map((lesson) => (
                                              <div key={lesson.id} className="space-y-1">
                                                <button
                                                  onClick={() => toggleLesson(lesson.id)}
                                                  className="w-full flex items-center gap-2 p-1 text-xs hover:bg-muted/20 rounded transition-colors text-left"
                                                >
                                                  {expandedLessons.has(lesson.id) ? (
                                                    <ChevronDown className="h-3 w-3" />
                                                  ) : (
                                                    <ChevronRight className="h-3 w-3" />
                                                  )}
                                                  <span>{lesson.title}</span>
                                                </button>

                                                {expandedLessons.has(lesson.id) && (
                                                  <div className="pl-6 space-y-1">
                                                    <button
                                                      onClick={() => {
                                                        setSelectedLessonId(lesson.id);
                                                        setOutcomeDialogOpen(true);
                                                      }}
                                                      className="text-xs text-primary hover:underline flex items-center gap-1"
                                                    >
                                                      <Plus className="h-3 w-3" />
                                                      Add Outcome
                                                    </button>

                                                    {outcomesQ.isLoading ? (
                                                      <Loader2 className="h-3 w-3 animate-spin" />
                                                    ) : outcomesQ.data?.length === 0 ? (
                                                      <p className="text-xs text-muted-foreground">No outcomes yet.</p>
                                                    ) : (
                                                      outcomesQ.data?.map((outcome) => (
                                                        <div
                                                          key={outcome.id}
                                                          className="text-xs p-1 rounded bg-muted/20 text-muted-foreground"
                                                        >
                                                          • {outcome.description}
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
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Add Year Dialog */}
      <Dialog open={yearDialogOpen} onOpenChange={setYearDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add Academic Year</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="yearName">Year</Label>
              <Input
                id="yearName"
                value={yearName}
                onChange={(e) => setYearName(e.target.value)}
                placeholder="e.g. 2025"
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setYearDialogOpen(false);
                setYearName("");
              }}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!yearName.trim()) return;
                try {
                  await createYear.mutateAsync({ name: yearName.trim() });
                  setYearName("");
                  setYearDialogOpen(false);
                  toast({ title: "Academic year created" });
                } catch (e: any) {
                  toast({ title: "Error", description: e.message, variant: "destructive" });
                }
              }}
              disabled={createYear.isPending || !yearName.trim()}
              className="rounded-xl"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Term Dialog */}
      <Dialog open={termDialogOpen} onOpenChange={setTermDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add Term</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="termName">Term Name</Label>
              <Input
                id="termName"
                value={termName}
                onChange={(e) => setTermName(e.target.value)}
                placeholder="e.g. Term 1"
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTermDialogOpen(false);
                setTermName("");
              }}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!termName.trim() || !selectedYearId) return;
                try {
                  await createTerm.mutateAsync({ academicYearId: selectedYearId, name: termName.trim() });
                  setTermName("");
                  setTermDialogOpen(false);
                  toast({ title: "Term created" });
                } catch (e: any) {
                  toast({ title: "Error", description: e.message, variant: "destructive" });
                }
              }}
              disabled={createTerm.isPending || !termName.trim()}
              className="rounded-xl"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Week Dialog */}
      <Dialog open={weekDialogOpen} onOpenChange={setWeekDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add Week</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="weekNum">Week Number</Label>
              <Input
                id="weekNum"
                type="number"
                value={weekNum}
                onChange={(e) => setWeekNum(e.target.value)}
                placeholder="1"
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setWeekDialogOpen(false);
                setWeekNum("");
              }}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!weekNum || !selectedTermId) return;
                try {
                  await createWeek.mutateAsync({ termId: selectedTermId, weekNumber: Number(weekNum) });
                  setWeekNum("");
                  setWeekDialogOpen(false);
                  toast({ title: "Week created" });
                } catch (e: any) {
                  toast({ title: "Error", description: e.message, variant: "destructive" });
                }
              }}
              disabled={createWeek.isPending || !weekNum}
              className="rounded-xl"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Lesson Dialog */}
      <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add Lesson</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lessonTitle">Lesson Title</Label>
              <Input
                id="lessonTitle"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                placeholder="e.g. Introduction to Fractions"
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setLessonDialogOpen(false);
                setLessonTitle("");
              }}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!lessonTitle.trim() || !selectedWeekId) return;
                try {
                  await createLesson.mutateAsync({ weekId: selectedWeekId, title: lessonTitle.trim() });
                  setLessonTitle("");
                  setLessonDialogOpen(false);
                  toast({ title: "Lesson created" });
                } catch (e: any) {
                  toast({ title: "Error", description: e.message, variant: "destructive" });
                }
              }}
              disabled={createLesson.isPending || !lessonTitle.trim()}
              className="rounded-xl"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Outcome Dialog */}
      <Dialog open={outcomeDialogOpen} onOpenChange={setOutcomeDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add Learning Outcome</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="outcomeDesc">Outcome Description</Label>
              <Input
                id="outcomeDesc"
                value={outcomeDesc}
                onChange={(e) => setOutcomeDesc(e.target.value)}
                placeholder="e.g. Students will understand how to add fractions"
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOutcomeDialogOpen(false);
                setOutcomeDesc("");
              }}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!outcomeDesc.trim() || !selectedLessonId) return;
                try {
                  await createOutcome.mutateAsync({ lessonId: selectedLessonId, description: outcomeDesc.trim() });
                  setOutcomeDesc("");
                  setOutcomeDialogOpen(false);
                  toast({ title: "Outcome created" });
                } catch (e: any) {
                  toast({ title: "Error", description: e.message, variant: "destructive" });
                }
              }}
              disabled={createOutcome.isPending || !outcomeDesc.trim()}
              className="rounded-xl"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
