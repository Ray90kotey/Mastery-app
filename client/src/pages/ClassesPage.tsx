import { useEffect, useMemo, useState } from "react";
import Meta from "@/components/Meta";
import AppShell from "@/components/AppShell";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError, redirectToLogin } from "@/lib/auth-utils";
import { useClasses, useCreateClass, useDeleteClass, useUpdateClass } from "@/hooks/use-classes";
import { useCreateStudent, useDeleteStudent, useStudentsByClass, useUpdateStudent } from "@/hooks/use-students";
import type { ClassResponse, StudentResponse } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useSubjects, useClassSubjects, useAssignSubject } from "@/hooks/use-subjects";
import { useAcademicYears } from "@/hooks/use-academic";
import { GraduationCap, Plus, Search, Trash2, UserPlus, Users2, Pencil, BookOpen, ImageIcon, Loader2 } from "lucide-react";

// Helper for dates
function safeDate(d: any) {
  const dt = d ? new Date(d) : null;
  return dt && !Number.isNaN(dt.getTime()) ? dt : null;
}

export default function ClassesPage() {
  const { toast } = useToast();

  const classesQ = useClasses();
  const subjectsQ = useSubjects();
  const academicYearsQ = useAcademicYears();
  const createClass = useCreateClass();
  const updateClass = useUpdateClass();
  const deleteClass = useDeleteClass();

  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const classSubjectsQ = useClassSubjects(selectedClassId);
  const assignSubject = useAssignSubject();
  const [assignSubjectOpen, setAssignSubjectOpen] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedYearId, setSelectedYearId] = useState<string>("");

  const studentsQ = useStudentsByClass(selectedClassId);
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (isEdit) {
        setEditStudentForm(prev => ({ ...prev, image: base64 }));
      } else {
        setStudentForm(prev => ({ ...prev, image: base64 }));
      }
    };
    reader.readAsDataURL(file);
  };

  const [classSearch, setClassSearch] = useState("");
  const classesFiltered = useMemo(() => {
    const list = classesQ.data ?? [];
    const q = classSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => c.name.toLowerCase().includes(q));
  }, [classesQ.data, classSearch]);

  useEffect(() => {
    if (!selectedClassId && (classesQ.data?.length ?? 0) > 0) {
      setSelectedClassId(classesQ.data![0].id);
    }
  }, [classesQ.data, selectedClassId]);

  const selectedClass = useMemo(
    () => (classesQ.data ?? []).find((c) => c.id === selectedClassId) ?? null,
    [classesQ.data, selectedClassId],
  );

  // Dialog state
  const [createClassOpen, setCreateClassOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");

  const [editClass, setEditClass] = useState<ClassResponse | null>(null);
  const [editClassName, setEditClassName] = useState("");

  const [createStudentOpen, setCreateStudentOpen] = useState(false);
  const [studentForm, setStudentForm] = useState({
    fullName: "",
    parentName: "",
    parentEmail: "",
    parentPhone: "",
    image: "",
  });

  const [editStudent, setEditStudent] = useState<StudentResponse | null>(null);
  const [editStudentForm, setEditStudentForm] = useState({
    fullName: "",
    parentName: "",
    parentEmail: "",
    parentPhone: "",
    image: "",
  });

  return (
    <AppShell>
      <Meta
        title="Classes • Mastery"
        description="Create classes, add students, and maintain parent contact details."
      />

      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">People</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold">Classes</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            Keep your roster tidy. Add parent contacts for quick report sharing.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative">
            <Search className="h-4.5 w-4.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={classSearch}
              onChange={(e) => setClassSearch(e.target.value)}
              placeholder="Search classes..."
              className="pl-10 rounded-xl bg-card/70 border-border/70"
              data-testid="classes-search"
            />
          </div>

          <Dialog open={createClassOpen} onOpenChange={setCreateClassOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => setCreateClassOpen(true)}
                data-testid="classes-create-open"
                className="rounded-xl shadow-sm hover:shadow-md transition-all bg-gradient-to-r from-primary to-primary/85"
              >
                <Plus className="h-4.5 w-4.5 mr-2" />
                New class
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle>Create class</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="className">Class name</Label>
                <Input
                  id="className"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="e.g., Primary 4A"
                  className="rounded-xl"
                  data-testid="classes-create-name"
                />
                <p className="text-xs text-muted-foreground">
                  Tip: keep names short and consistent.
                </p>
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setCreateClassOpen(false)}
                  data-testid="classes-create-cancel"
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      await createClass.mutateAsync({
                        teacherId: "me",
                        name: newClassName.trim(),
                      } as any);
                      setNewClassName("");
                      setCreateClassOpen(false);
                      toast({ title: "Class created", description: "You can now add students." });
                    } catch (e: any) {
                      if (isUnauthorizedError(e)) return redirectToLogin(toast as any);
                      toast({ title: "Could not create class", description: e?.message ?? "Try again", variant: "destructive" });
                    }
                  }}
                  disabled={createClass.isPending || !newClassName.trim()}
                  data-testid="classes-create-submit"
                  className="rounded-xl shadow-sm hover:shadow-md transition-all"
                >
                  {createClass.isPending ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Separator className="my-6" />

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5 lg:gap-6 items-start">
        <Card className="rounded-3xl border border-border/70 bg-card/70 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users2 className="h-4.5 w-4.5 text-primary" />
              <h2 className="font-bold">Your classes</h2>
            </div>
            <span className="text-xs text-muted-foreground" data-testid="classes-count">
              {classesQ.data?.length ?? 0}
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {classesQ.isLoading ? (
              <div className="space-y-2" data-testid="classes-loading">
                <Skeleton className="h-11 w-full rounded-2xl" />
                <Skeleton className="h-11 w-full rounded-2xl" />
                <Skeleton className="h-11 w-full rounded-2xl" />
              </div>
            ) : classesQ.isError ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm" data-testid="classes-error">
                <p className="font-semibold text-destructive">Failed to load classes</p>
                <p className="mt-1 text-muted-foreground">
                  {(classesQ.error as any)?.message ?? "Try refreshing."}
                </p>
              </div>
            ) : (classesFiltered.length ?? 0) === 0 ? (
              <EmptyState
                icon={<GraduationCap className="h-6 w-6" />}
                title="No classes yet"
                description="Create your first class to start tracking mastery."
                primaryAction={{
                  label: "Create class",
                  onClick: () => setCreateClassOpen(true),
                  testId: "classes-empty-create",
                }}
              />
            ) : (
              <div className="space-y-2" data-testid="classes-list">
                {classesFiltered.map((c) => {
                  const active = c.id === selectedClassId;
                  const created = safeDate((c as any).createdAt);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedClassId(c.id)}
                      className={[
                        "w-full text-left rounded-2xl border px-4 py-3 transition-all duration-200",
                        "hover:bg-muted/50 hover:shadow-sm",
                        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15",
                        active
                          ? "bg-secondary border-border shadow-sm"
                          : "bg-card/60 border-border/70",
                      ].join(" ")}
                      data-testid={`class-item-${c.id}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{c.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {created ? `Created ${created.toLocaleDateString()}` : "—"}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setEditClass(c);
                              setEditClassName(c.name);
                            }}
                            data-testid={`class-edit-open-${c.id}`}
                            className="rounded-xl"
                            title="Edit"
                          >
                            <Pencil className="h-4.5 w-4.5" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                data-testid={`class-delete-open-${c.id}`}
                                className="rounded-xl text-destructive hover:text-destructive"
                                title="Delete"
                              >
                                <Trash2 className="h-4.5 w-4.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-2xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete class?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will remove the class. If your backend enforces constraints, you may need to delete students and assessments first.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel
                                  data-testid={`class-delete-cancel-${c.id}`}
                                  className="rounded-xl"
                                >
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  data-testid={`class-delete-confirm-${c.id}`}
                                  className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={async () => {
                                    try {
                                      await deleteClass.mutateAsync(c.id);
                                      if (selectedClassId === c.id) setSelectedClassId(null);
                                      toast({ title: "Class deleted" });
                                    } catch (e: any) {
                                      if (isUnauthorizedError(e)) return redirectToLogin(toast as any);
                                      toast({ title: "Could not delete class", description: e?.message ?? "Try again", variant: "destructive" });
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

        <Card className="rounded-3xl border border-border/70 bg-card/70 p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Students</p>
              <h2 className="text-xl font-extrabold" data-testid="students-header">
                {selectedClass ? selectedClass.name : "Select a class"}
              </h2>
              <div className="flex flex-wrap gap-2 mt-1">
                {classSubjectsQ.data?.map(cs => (
                  <span key={cs.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary border border-primary/20">
                    <BookOpen className="h-3 w-3" />
                    {cs.subjectName}
                  </span>
                ))}
                {selectedClassId && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 rounded-full px-2 text-[10px] gap-1"
                    onClick={() => setAssignSubjectOpen(true)}
                  >
                    <Plus className="h-3 w-3" />
                    Assign Subject
                  </Button>
                )}
              </div>
            </div>

            <Dialog open={createStudentOpen} onOpenChange={setCreateStudentOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => setCreateStudentOpen(true)}
                  disabled={!selectedClassId}
                  data-testid="student-create-open"
                  className="rounded-xl shadow-sm hover:shadow-md transition-all"
                >
                  <UserPlus className="h-4.5 w-4.5 mr-2" />
                  Add student
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add student</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 space-y-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input
                      id="fullName"
                      value={studentForm.fullName}
                      onChange={(e) => setStudentForm((s) => ({ ...s, fullName: e.target.value }))}
                      placeholder="e.g., Ama Mensah"
                      className="rounded-xl"
                      data-testid="student-create-fullname"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-2">
                    <Label>Student Photo</Label>
                    <div className="flex items-center gap-4">
                      {studentForm.image ? (
                        <div className="relative h-16 w-16 rounded-xl overflow-hidden border border-border">
                          <img src={studentForm.image} alt="Preview" className="h-full w-full object-cover" />
                          <button 
                            onClick={() => setStudentForm(s => ({ ...s, image: "" }))}
                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-4 w-4 text-white" />
                          </button>
                        </div>
                      ) : (
                        <Label className="h-16 w-16 rounded-xl border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground mt-1">Upload</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, false)} />
                        </Label>
                      )}
                      <p className="text-xs text-muted-foreground flex-1">
                        Optional: Add a photo for quick identification in reports and lists.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="parentName">Parent/Guardian name</Label>
                    <Input
                      id="parentName"
                      value={studentForm.parentName}
                      onChange={(e) => setStudentForm((s) => ({ ...s, parentName: e.target.value }))}
                      placeholder="Optional"
                      className="rounded-xl"
                      data-testid="student-create-parentname"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="parentPhone">Parent phone</Label>
                    <Input
                      id="parentPhone"
                      value={studentForm.parentPhone}
                      onChange={(e) => setStudentForm((s) => ({ ...s, parentPhone: e.target.value }))}
                      placeholder="Optional"
                      className="rounded-xl"
                      data-testid="student-create-parentphone"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use WhatsApp-friendly numbers. Example: +233...
                    </p>
                  </div>

                  <div className="sm:col-span-2 space-y-2">
                    <Label htmlFor="parentEmail">Parent email</Label>
                    <Input
                      id="parentEmail"
                      value={studentForm.parentEmail}
                      onChange={(e) => setStudentForm((s) => ({ ...s, parentEmail: e.target.value }))}
                      placeholder="Optional"
                      className="rounded-xl"
                      data-testid="student-create-parentemail"
                    />
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setCreateStudentOpen(false)}
                    data-testid="student-create-cancel"
                    className="rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!selectedClassId) return;
                      try {
                        await createStudent.mutateAsync({
                          classId: selectedClassId,
                          fullName: studentForm.fullName.trim(),
                          parentName: studentForm.parentName.trim() || null,
                          parentEmail: studentForm.parentEmail.trim() || null,
                          parentPhone: studentForm.parentPhone.trim() || null,
                          image: studentForm.image || null,
                        } as any);
                        setStudentForm({ fullName: "", parentName: "", parentEmail: "", parentPhone: "", image: "" });
                        setCreateStudentOpen(false);
                        toast({ title: "Student added" });
                      } catch (e: any) {
                        if (isUnauthorizedError(e)) return redirectToLogin(toast as any);
                        toast({ title: "Could not add student", description: e?.message ?? "Try again", variant: "destructive" });
                      }
                    }}
                    disabled={createStudent.isPending || !studentForm.fullName.trim()}
                    data-testid="student-create-submit"
                    className="rounded-xl shadow-sm hover:shadow-md transition-all"
                  >
                    {createStudent.isPending ? "Adding..." : "Add"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {selectedClassId && (
              <Dialog open={assignSubjectOpen} onOpenChange={setAssignSubjectOpen}>
                <DialogContent className="rounded-2xl sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Assign Subject to {selectedClass?.name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {subjectsQ.data?.map(s => (
                            <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Academic Year</Label>
                      <Select value={selectedYearId} onValueChange={setSelectedYearId}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {academicYearsQ.data?.map(y => (
                            <SelectItem key={y.id} value={String(y.id)}>{y.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="secondary" onClick={() => setAssignSubjectOpen(false)} className="rounded-xl">Cancel</Button>
                    <Button 
                      disabled={!selectedSubjectId || !selectedYearId || assignSubject.isPending}
                      className="rounded-xl"
                      onClick={async () => {
                        try {
                          await assignSubject.mutateAsync({
                            classId: selectedClassId!,
                            subjectId: Number(selectedSubjectId),
                            academicYearId: Number(selectedYearId)
                          });
                          setAssignSubjectOpen(false);
                          toast({ title: "Subject assigned" });
                        } catch (e: any) {
                          toast({ title: "Error", description: e.message, variant: "destructive" });
                        }
                      }}
                    >
                      {assignSubject.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <Separator className="my-5" />

          {selectedClassId == null ? (
            <EmptyState
              icon={<Users2 className="h-6 w-6" />}
              title="Select a class"
              description="Choose a class on the left to view and manage students."
              className="bg-card/50"
              primaryAction={{
                label: "Create a class",
                onClick: () => setCreateClassOpen(true),
                testId: "students-empty-create-class",
              }}
            />
          ) : studentsQ.isLoading ? (
            <div className="space-y-2" data-testid="students-loading">
              <Skeleton className="h-10 w-full rounded-2xl" />
              <Skeleton className="h-10 w-full rounded-2xl" />
              <Skeleton className="h-10 w-full rounded-2xl" />
            </div>
          ) : studentsQ.isError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm" data-testid="students-error">
              <p className="font-semibold text-destructive">Failed to load students</p>
              <p className="mt-1 text-muted-foreground">
                {(studentsQ.error as any)?.message ?? "Try again."}
              </p>
            </div>
          ) : (studentsQ.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={<UserPlus className="h-6 w-6" />}
              title="No students yet"
              description="Add students to start entering scores and generating reports."
              primaryAction={{
                label: "Add student",
                onClick: () => setCreateStudentOpen(true),
                testId: "students-empty-add",
              }}
              className="bg-card/50"
            />
          ) : (
            <div className="rounded-2xl border border-border/70 overflow-hidden bg-card/50" data-testid="students-table">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead className="hidden md:table-cell">Parent</TableHead>
                    <TableHead className="hidden lg:table-cell">Email</TableHead>
                    <TableHead className="hidden lg:table-cell">Phone</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentsQ.data!.map((s) => (
                    <TableRow key={s.id} data-testid={`student-row-${s.id}`}>
                      <TableCell className="font-semibold">
                        <div className="flex items-center gap-3">
                          {s.image ? (
                            <img src={s.image} alt={s.fullName} className="h-8 w-8 rounded-full object-cover border border-border" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                              {s.fullName.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span>{s.fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {s.parentName || "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {s.parentEmail || "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {s.parentPhone || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditStudent(s);
                              setEditStudentForm({
                                fullName: s.fullName ?? "",
                                parentName: (s.parentName as any) ?? "",
                                parentEmail: (s.parentEmail as any) ?? "",
                                parentPhone: (s.parentPhone as any) ?? "",
                              });
                            }}
                            data-testid={`student-edit-open-${s.id}`}
                            className="rounded-xl"
                            title="Edit"
                          >
                            <Pencil className="h-4.5 w-4.5" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {}}
                                data-testid={`student-delete-open-${s.id}`}
                                className="rounded-xl text-destructive hover:text-destructive"
                                title="Delete"
                              >
                                <Trash2 className="h-4.5 w-4.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-2xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete student?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This removes the student from the class. Scores and reports may also be affected.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl" data-testid={`student-delete-cancel-${s.id}`}>
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  data-testid={`student-delete-confirm-${s.id}`}
                                  onClick={async () => {
                                    try {
                                      await deleteStudent.mutateAsync(s.id);
                                      toast({ title: "Student deleted" });
                                    } catch (e: any) {
                                      if (isUnauthorizedError(e)) return redirectToLogin(toast as any);
                                      toast({ title: "Could not delete student", description: e?.message ?? "Try again", variant: "destructive" });
                                    }
                                  }}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      <Dialog
        open={!!editClass}
        onOpenChange={(open) => {
          if (!open) setEditClass(null);
        }}
      >
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit class</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="editClassName">Class name</Label>
            <Input
              id="editClassName"
              value={editClassName}
              onChange={(e) => setEditClassName(e.target.value)}
              className="rounded-xl"
              data-testid="class-edit-name"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="secondary" onClick={() => setEditClass(null)} className="rounded-xl" data-testid="class-edit-cancel">
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!editClass) return;
                try {
                  await updateClass.mutateAsync({ id: editClass.id, name: editClassName.trim() } as any);
                  setEditClass(null);
                  toast({ title: "Class updated" });
                } catch (e: any) {
                  if (isUnauthorizedError(e)) return redirectToLogin(toast as any);
                  toast({ title: "Could not update class", description: e?.message ?? "Try again", variant: "destructive" });
                }
              }}
              disabled={updateClass.isPending || !editClassName.trim()}
              className="rounded-xl shadow-sm hover:shadow-md transition-all"
              data-testid="class-edit-submit"
            >
              {updateClass.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editStudent}
        onOpenChange={(open) => {
          if (!open) setEditStudent(null);
        }}
      >
        <DialogContent className="rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit student</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="editFullName">Full name</Label>
              <Input
                id="editFullName"
                value={editStudentForm.fullName}
                onChange={(e) => setEditStudentForm((s) => ({ ...s, fullName: e.target.value }))}
                className="rounded-xl"
                data-testid="student-edit-fullname"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editParentName">Parent/Guardian name</Label>
              <Input
                id="editParentName"
                value={editStudentForm.parentName}
                onChange={(e) => setEditStudentForm((s) => ({ ...s, parentName: e.target.value }))}
                className="rounded-xl"
                data-testid="student-edit-parentname"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editParentPhone">Parent phone</Label>
              <Input
                id="editParentPhone"
                value={editStudentForm.parentPhone}
                onChange={(e) => setEditStudentForm((s) => ({ ...s, parentPhone: e.target.value }))}
                className="rounded-xl"
                data-testid="student-edit-parentphone"
              />
            </div>

            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="editParentEmail">Parent email</Label>
              <Input
                id="editParentEmail"
                value={editStudentForm.parentEmail}
                onChange={(e) => setEditStudentForm((s) => ({ ...s, parentEmail: e.target.value }))}
                className="rounded-xl"
                data-testid="student-edit-parentemail"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="secondary" onClick={() => setEditStudent(null)} className="rounded-xl" data-testid="student-edit-cancel">
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!editStudent) return;
                try {
                  await updateStudent.mutateAsync({
                    id: editStudent.id,
                    fullName: editStudentForm.fullName.trim(),
                    parentName: editStudentForm.parentName.trim() || null,
                    parentEmail: editStudentForm.parentEmail.trim() || null,
                    parentPhone: editStudentForm.parentPhone.trim() || null,
                  } as any);
                  setEditStudent(null);
                  toast({ title: "Student updated" });
                } catch (e: any) {
                  if (isUnauthorizedError(e)) return redirectToLogin(toast as any);
                  toast({ title: "Could not update student", description: e?.message ?? "Try again", variant: "destructive" });
                }
              }}
              disabled={updateStudent.isPending || !editStudentForm.fullName.trim()}
              className="rounded-xl shadow-sm hover:shadow-md transition-all"
              data-testid="student-edit-submit"
            >
              {updateStudent.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
