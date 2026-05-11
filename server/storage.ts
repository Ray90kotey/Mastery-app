import { db } from "./db";
import {
  academicYears,
  assessments,
  classes,
  lessons,
  outcomes,
  settings,
  studentScores,
  students,
  terms,
  weeks,
  subjects,
  classSubjects,
  schools,
  schoolMembers,
  invitations,
  type AcademicYearResponse,
  type AssessmentResponse,
  type ClassResponse,
  type CreateAcademicYearRequest,
  type CreateAssessmentRequest,
  type CreateClassRequest,
  type CreateLessonRequest,
  type CreateOutcomeRequest,
  type CreateStudentRequest,
  type CreateStudentScoreRequest,
  type CreateTermRequest,
  type CreateWeekRequest,
  type LessonResponse,
  type OutcomeResponse,
  type StudentMasteryResponse,
  type StudentResponse,
  type StudentScoreResponse,
  type TeacherSettingsResponse,
  type TermResponse,
  type UpsertTeacherSettingsRequest,
  type WeekResponse,
  type SubjectResponse,
  type InsertSubject,
  type InsertClassSubject,
  assessmentTypeWeights,
  masteryBands,
  type AssessmentType,
  type TrendIndicator,
  type MySchoolResponse,
  type SchoolMemberWithUser,
  type InvitationWithDetails,
  type School,
  type SchoolRole,
  type InvitePreviewResponse,
} from "@shared/schema";
import { users } from "@shared/models/auth";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

export interface IStorage {
  // Settings
  getSettings(teacherId: string): Promise<TeacherSettingsResponse>;
  upsertSettings(
    teacherId: string,
    input: UpsertTeacherSettingsRequest,
  ): Promise<TeacherSettingsResponse>;

  // Classes
  listClasses(teacherId: string): Promise<ClassResponse[]>;
  createClass(teacherId: string, input: CreateClassRequest): Promise<ClassResponse>;
  updateClass(
    teacherId: string,
    id: number,
    updates: Partial<CreateClassRequest>,
  ): Promise<ClassResponse | undefined>;
  deleteClass(teacherId: string, id: number): Promise<boolean>;

  // Students
  listStudentsByClass(
    teacherId: string,
    classId: number,
  ): Promise<StudentResponse[] | undefined>;
  createStudent(
    teacherId: string,
    classId: number,
    input: Omit<CreateStudentRequest, "classId">,
  ): Promise<StudentResponse | undefined>;
  updateStudent(
    teacherId: string,
    id: number,
    updates: Partial<Omit<CreateStudentRequest, "classId">>,
  ): Promise<StudentResponse | undefined>;
  deleteStudent(teacherId: string, id: number): Promise<boolean>;

  // Subjects
  listSubjects(teacherId: string): Promise<SubjectResponse[]>;
  createSubject(teacherId: string, input: Omit<InsertSubject, "teacherId">): Promise<SubjectResponse>;
  listClassSubjects(teacherId: string, classId: number): Promise<(any)[] | undefined>;
  assignSubjectToClass(teacherId: string, classId: number, input: Omit<InsertClassSubject, "classId">): Promise<any | undefined>;

  // Academic years
  listAcademicYears(teacherId: string): Promise<AcademicYearResponse[]>;
  createAcademicYear(
    teacherId: string,
    input: CreateAcademicYearRequest,
  ): Promise<AcademicYearResponse>;
  updateAcademicYear(
    teacherId: string,
    id: number,
    updates: Partial<CreateAcademicYearRequest>,
  ): Promise<AcademicYearResponse | undefined>;
  deleteAcademicYear(teacherId: string, id: number): Promise<boolean>;

  // Terms
  listTermsByYear(
    teacherId: string,
    academicYearId: number,
  ): Promise<TermResponse[] | undefined>;
  createTerm(
    teacherId: string,
    academicYearId: number,
    input: Omit<CreateTermRequest, "academicYearId">,
  ): Promise<TermResponse | undefined>;

  // Weeks
  listWeeksByTerm(teacherId: string, termId: number): Promise<WeekResponse[] | undefined>;
  createWeek(
    teacherId: string,
    termId: number,
    input: Omit<CreateWeekRequest, "termId">,
  ): Promise<WeekResponse | undefined>;

  // Lessons
  listLessonsByWeek(
    teacherId: string,
    weekId: number,
  ): Promise<LessonResponse[] | undefined>;
  createLesson(
    teacherId: string,
    weekId: number,
    input: Omit<CreateLessonRequest, "weekId">,
  ): Promise<LessonResponse | undefined>;
  listLessonsBySubject(teacherId: string, subjectId: number, classId: number): Promise<LessonResponse[] | undefined>;
  createSubjectLesson(teacherId: string, subjectId: number, classId: number, title: string, weekId?: number): Promise<LessonResponse | undefined>;

  // Outcomes
  listOutcomesByLesson(
    teacherId: string,
    lessonId: number,
  ): Promise<OutcomeResponse[] | undefined>;
  createOutcome(
    teacherId: string,
    lessonId: number,
    input: Omit<CreateOutcomeRequest, "lessonId">,
  ): Promise<OutcomeResponse | undefined>;

  // Assessments
  listAssessmentsByClass(
    teacherId: string,
    classId: number,
  ): Promise<AssessmentResponse[] | undefined>;
  createAssessment(
    teacherId: string,
    classId: number,
    input: Omit<CreateAssessmentRequest, "classId">,
  ): Promise<AssessmentResponse | undefined>;
  updateAssessment(
    teacherId: string,
    id: number,
    updates: Partial<Omit<CreateAssessmentRequest, "classId">>,
  ): Promise<AssessmentResponse | undefined>;
  deleteAssessment(teacherId: string, id: number): Promise<boolean>;

  // Scores
  upsertAssessmentScores(
    teacherId: string,
    assessmentId: number,
    scores: Omit<CreateStudentScoreRequest, "assessmentId">[],
  ): Promise<StudentScoreResponse[] | undefined>;

  // Mastery
  getStudentMastery(
    teacherId: string,
    studentId: number,
  ): Promise<StudentMasteryResponse | undefined>;
  getClassMastery(
    teacherId: string,
    classId: number,
  ): Promise<any | undefined>;

  // Curriculum
  getAcademicYearCurriculum(
    teacherId: string,
    yearId: number,
  ): Promise<any | undefined>;

  getClassCurriculum(
    teacherId: string,
    classId: number,
  ): Promise<any | undefined>;

  // School (multi-user)
  getMySchool(userId: string): Promise<MySchoolResponse | null>;
  createSchool(userId: string, name: string): Promise<MySchoolResponse>;
  listSchoolMembers(schoolId: number): Promise<SchoolMemberWithUser[]>;
  removeSchoolMember(schoolId: number, userId: string): Promise<boolean>;
  createInvitation(
    schoolId: number,
    invitedBy: string,
    data: { role: string; inviteeName?: string; linkedStudentId?: number },
  ): Promise<InvitationWithDetails>;
  listInvitations(schoolId: number): Promise<InvitationWithDetails[]>;
  deleteInvitation(id: number, schoolId: number): Promise<boolean>;
  getInvitationPreview(token: string): Promise<InvitePreviewResponse | null>;
  acceptInvitation(token: string, userId: string): Promise<MySchoolResponse | null>;
  getSchoolOverview(schoolId: number): Promise<any>;
  getStudentPortalData(userId: string): Promise<any | null>;
}

function classifyMasteryLevel(score: number) {
  const clamped = Math.max(0, Math.min(100, score));
  const band = masteryBands.find((b) => clamped >= b.min && clamped <= b.max);
  return band?.level ?? "Needs Support";
}

function computeRecencyMultiplier(positionFromNewest: number) {
  // 0 -> newest
  if (positionFromNewest <= 0) return 1.2;
  if (positionFromNewest <= 2) return 1.0;
  return 0.8;
}

function computeTrend(recentAvg: number, overallAvg: number): TrendIndicator {
  const diff = recentAvg - overallAvg;
  if (Math.abs(diff) < 0.0001) return "Stable";
  return diff > 0 ? "Improving" : "Declining";
}

export class DatabaseStorage implements IStorage {
  async getSettings(teacherId: string): Promise<TeacherSettingsResponse> {
    const [row] = await db.select().from(settings).where(eq(settings.teacherId, teacherId));
    if (row) return row;

    const [created] = await db
      .insert(settings)
      .values({ teacherId, schoolName: "" })
      .returning();
    return created;
  }

  async upsertSettings(
    teacherId: string,
    input: UpsertTeacherSettingsRequest,
  ): Promise<TeacherSettingsResponse> {
    const [updated] = await db
      .insert(settings)
      .values({ ...input, teacherId })
      .onConflictDoUpdate({
        target: settings.teacherId,
        set: {
          schoolName: input.schoolName,
          schoolLogo: input.schoolLogo,
          handwrittenSignature: input.handwrittenSignature,
        },
      })
      .returning();
    return updated;
  }

  async listClasses(teacherId: string): Promise<ClassResponse[]> {
    return await db
      .select()
      .from(classes)
      .where(eq(classes.teacherId, teacherId))
      .orderBy(desc(classes.createdAt));
  }

  async createClass(teacherId: string, input: CreateClassRequest): Promise<ClassResponse> {
    const [created] = await db
      .insert(classes)
      .values({ ...input, teacherId })
      .returning();
    return created;
  }

  async updateClass(
    teacherId: string,
    id: number,
    updates: Partial<CreateClassRequest>,
  ): Promise<ClassResponse | undefined> {
    const [updated] = await db
      .update(classes)
      .set(updates)
      .where(and(eq(classes.id, id), eq(classes.teacherId, teacherId)))
      .returning();
    return updated;
  }

  async deleteClass(teacherId: string, id: number): Promise<boolean> {
    const [deleted] = await db
      .delete(classes)
      .where(and(eq(classes.id, id), eq(classes.teacherId, teacherId)))
      .returning();
    return !!deleted;
  }

  async listStudentsByClass(
    teacherId: string,
    classId: number,
  ): Promise<StudentResponse[] | undefined> {
    const [cls] = await db
      .select({ id: classes.id })
      .from(classes)
      .where(and(eq(classes.id, classId), eq(classes.teacherId, teacherId)));
    if (!cls) return undefined;

    return await db
      .select()
      .from(students)
      .where(eq(students.classId, classId))
      .orderBy(desc(students.createdAt));
  }

  async createStudent(
    teacherId: string,
    classId: number,
    input: Omit<CreateStudentRequest, "classId">,
  ): Promise<StudentResponse | undefined> {
    const [cls] = await db
      .select({ id: classes.id })
      .from(classes)
      .where(and(eq(classes.id, classId), eq(classes.teacherId, teacherId)));
    if (!cls) return undefined;

    const [created] = await db
      .insert(students)
      .values({ ...input, classId })
      .returning();
    return created;
  }

  async updateStudent(
    teacherId: string,
    id: number,
    updates: Partial<Omit<CreateStudentRequest, "classId">>,
  ): Promise<StudentResponse | undefined> {
    const [studentRow] = await db
      .select({ id: students.id, classId: students.classId })
      .from(students)
      .where(eq(students.id, id));
    if (!studentRow) return undefined;

    const [cls] = await db
      .select({ id: classes.id })
      .from(classes)
      .where(and(eq(classes.id, studentRow.classId), eq(classes.teacherId, teacherId)));
    if (!cls) return undefined;

    const [updated] = await db
      .update(students)
      .set(updates)
      .where(eq(students.id, id))
      .returning();
    return updated;
  }

  async deleteStudent(teacherId: string, id: number): Promise<boolean> {
    const [studentRow] = await db
      .select({ id: students.id, classId: students.classId })
      .from(students)
      .where(eq(students.id, id));
    if (!studentRow) return false;

    const [cls] = await db
      .select({ id: classes.id })
      .from(classes)
      .where(and(eq(classes.id, studentRow.classId), eq(classes.teacherId, teacherId)));
    if (!cls) return false;

    const [deleted] = await db.delete(students).where(eq(students.id, id)).returning();
    return !!deleted;
  }

  async listSubjects(teacherId: string): Promise<SubjectResponse[]> {
    // Ensure default subjects exist
    const defaultSubjectNames = [
      "Maths",
      "Science",
      "RME",
      "French",
      "English",
      "Social Studies",
      "Creative Arts",
      "Career Technology",
      "Ghanaian Language",
      "Computing",
    ];

    const existing = await db
      .select({ name: subjects.name })
      .from(subjects)
      .where(eq(subjects.teacherId, teacherId));
    const existingNames = new Set(existing.map((e) => e.name));

    for (const name of defaultSubjectNames) {
      if (!existingNames.has(name)) {
        await db.insert(subjects).values({ teacherId, name }).onConflictDoNothing();
      }
    }

    return await db.select().from(subjects).where(eq(subjects.teacherId, teacherId)).orderBy(subjects.name);
  }

  async createSubject(teacherId: string, input: Omit<InsertSubject, "teacherId">): Promise<SubjectResponse> {
    const [created] = await db.insert(subjects).values({ ...input, teacherId }).returning();
    return created;
  }

  async listClassSubjects(teacherId: string, classId: number): Promise<any[] | undefined> {
    const [cls] = await db.select().from(classes).where(and(eq(classes.id, classId), eq(classes.teacherId, teacherId)));
    if (!cls) return undefined;

    return await db
      .select({
        id: classSubjects.id,
        classId: classSubjects.classId,
        subjectId: classSubjects.subjectId,
        academicYearId: classSubjects.academicYearId,
        subjectName: subjects.name,
      })
      .from(classSubjects)
      .innerJoin(subjects, eq(classSubjects.subjectId, subjects.id))
      .where(eq(classSubjects.classId, classId));
  }

  async assignSubjectToClass(teacherId: string, classId: number, input: Omit<InsertClassSubject, "classId">): Promise<any | undefined> {
    const [cls] = await db.select().from(classes).where(and(eq(classes.id, classId), eq(classes.teacherId, teacherId)));
    if (!cls) return undefined;

    const [created] = await db.insert(classSubjects).values({ ...input, classId }).returning();
    return created;
  }

  async listAcademicYears(teacherId: string): Promise<AcademicYearResponse[]> {
    return await db
      .select()
      .from(academicYears)
      .where(eq(academicYears.teacherId, teacherId))
      .orderBy(desc(academicYears.createdAt));
  }

  async createAcademicYear(
    teacherId: string,
    input: CreateAcademicYearRequest,
  ): Promise<AcademicYearResponse> {
    const [created] = await db
      .insert(academicYears)
      .values({ ...input, teacherId })
      .returning();
    return created;
  }

  async updateAcademicYear(
    teacherId: string,
    id: number,
    updates: Partial<CreateAcademicYearRequest>,
  ): Promise<AcademicYearResponse | undefined> {
    const [updated] = await db
      .update(academicYears)
      .set(updates)
      .where(and(eq(academicYears.id, id), eq(academicYears.teacherId, teacherId)))
      .returning();
    return updated;
  }

  async deleteAcademicYear(teacherId: string, id: number): Promise<boolean> {
    const [deleted] = await db
      .delete(academicYears)
      .where(and(eq(academicYears.id, id), eq(academicYears.teacherId, teacherId)))
      .returning();
    return !!deleted;
  }

  async listTermsByYear(
    teacherId: string,
    academicYearId: number,
  ): Promise<TermResponse[] | undefined> {
    const [year] = await db
      .select({ id: academicYears.id })
      .from(academicYears)
      .where(and(eq(academicYears.id, academicYearId), eq(academicYears.teacherId, teacherId)));
    if (!year) return undefined;

    return await db
      .select()
      .from(terms)
      .where(eq(terms.academicYearId, academicYearId))
      .orderBy(desc(terms.createdAt));
  }

  async createTerm(
    teacherId: string,
    academicYearId: number,
    input: Omit<CreateTermRequest, "academicYearId">,
  ): Promise<TermResponse | undefined> {
    const [year] = await db
      .select({ id: academicYears.id })
      .from(academicYears)
      .where(and(eq(academicYears.id, academicYearId), eq(academicYears.teacherId, teacherId)));
    if (!year) return undefined;

    const [created] = await db
      .insert(terms)
      .values({ ...input, academicYearId })
      .returning();
    return created;
  }

  async listWeeksByTerm(teacherId: string, termId: number): Promise<WeekResponse[] | undefined> {
    const [term] = await db
      .select({ id: terms.id, academicYearId: terms.academicYearId })
      .from(terms)
      .where(eq(terms.id, termId));
    if (!term) return undefined;

    const [year] = await db
      .select({ id: academicYears.id })
      .from(academicYears)
      .where(and(eq(academicYears.id, term.academicYearId), eq(academicYears.teacherId, teacherId)));
    if (!year) return undefined;

    return await db
      .select()
      .from(weeks)
      .where(eq(weeks.termId, termId))
      .orderBy(desc(weeks.weekNumber));
  }

  async createWeek(
    teacherId: string,
    termId: number,
    input: Omit<CreateWeekRequest, "termId">,
  ): Promise<WeekResponse | undefined> {
    const list = await this.listWeeksByTerm(teacherId, termId);
    if (!list) return undefined;

    const [created] = await db
      .insert(weeks)
      .values({ ...input, termId })
      .returning();
    return created;
  }

  async listLessonsByWeek(
    teacherId: string,
    weekId: number,
  ): Promise<LessonResponse[] | undefined> {
    const [wk] = await db.select({ id: weeks.id, termId: weeks.termId }).from(weeks).where(eq(weeks.id, weekId));
    if (!wk) return undefined;

    const listWeeks = await this.listWeeksByTerm(teacherId, wk.termId);
    if (!listWeeks) return undefined;

    return await db
      .select()
      .from(lessons)
      .where(eq(lessons.weekId, weekId))
      .orderBy(desc(lessons.createdAt));
  }

  async createLesson(
    teacherId: string,
    weekId: number,
    input: Omit<CreateLessonRequest, "weekId">,
  ): Promise<LessonResponse | undefined> {
    const existing = await this.listLessonsByWeek(teacherId, weekId);
    if (!existing) return undefined;

    const [created] = await db
      .insert(lessons)
      .values({ ...input, weekId })
      .returning();
    return created;
  }

  async listLessonsBySubject(teacherId: string, subjectId: number, classId: number): Promise<LessonResponse[] | undefined> {
    const [sub] = await db.select({ id: subjects.id }).from(subjects).where(and(eq(subjects.id, subjectId), eq(subjects.teacherId, teacherId)));
    if (!sub) return undefined;
    const [cls] = await db.select({ id: classes.id }).from(classes).where(and(eq(classes.id, classId), eq(classes.teacherId, teacherId)));
    if (!cls) return undefined;
    return await db.select().from(lessons)
      .where(and(eq(lessons.subjectId, subjectId), eq(lessons.classId, classId)))
      .orderBy(asc(lessons.createdAt));
  }

  async createSubjectLesson(teacherId: string, subjectId: number, classId: number, title: string, weekId?: number): Promise<LessonResponse | undefined> {
    const existing = await this.listLessonsBySubject(teacherId, subjectId, classId);
    if (!existing) return undefined;
    const dup = existing.find((l) => l.title.toLowerCase() === title.toLowerCase());
    if (dup) return dup;
    const [created] = await db.insert(lessons).values({ subjectId, classId, title, weekId: weekId ?? null }).returning();
    return created;
  }

  async listOutcomesByLesson(
    teacherId: string,
    lessonId: number,
  ): Promise<OutcomeResponse[] | undefined> {
    const [lsn] = await db
      .select({ id: lessons.id, weekId: lessons.weekId, subjectId: lessons.subjectId, classId: lessons.classId })
      .from(lessons)
      .where(eq(lessons.id, lessonId));
    if (!lsn) return undefined;

    if (lsn.weekId != null) {
      const listLessons = await this.listLessonsByWeek(teacherId, lsn.weekId);
      if (!listLessons) return undefined;
    } else if (lsn.subjectId != null && lsn.classId != null) {
      const subjectLessons = await this.listLessonsBySubject(teacherId, lsn.subjectId, lsn.classId);
      if (!subjectLessons) return undefined;
    } else {
      return undefined;
    }

    return await db
      .select()
      .from(outcomes)
      .where(eq(outcomes.lessonId, lessonId))
      .orderBy(desc(outcomes.createdAt));
  }

  async createOutcome(
    teacherId: string,
    lessonId: number,
    input: Omit<CreateOutcomeRequest, "lessonId">,
  ): Promise<OutcomeResponse | undefined> {
    const existing = await this.listOutcomesByLesson(teacherId, lessonId);
    if (!existing) return undefined;

    const [created] = await db
      .insert(outcomes)
      .values({ ...input, lessonId })
      .returning();
    return created;
  }

  async listAssessmentsByClass(
    teacherId: string,
    classId: number,
  ): Promise<AssessmentResponse[] | undefined> {
    const [cls] = await db
      .select({ id: classes.id })
      .from(classes)
      .where(and(eq(classes.id, classId), eq(classes.teacherId, teacherId)));
    if (!cls) return undefined;

    const rows = await db
      .select({
        id: assessments.id,
        classId: assessments.classId,
        title: assessments.title,
        type: assessments.type,
        lessonId: assessments.lessonId,
        outcomeId: assessments.outcomeId,
        totalScore: assessments.totalScore,
        date: assessments.date,
        createdAt: assessments.createdAt,
        subjectId: lessons.subjectId,
        lessonWeekId: lessons.weekId,
        termId: weeks.termId,
        academicYearId: terms.academicYearId,
      })
      .from(assessments)
      .leftJoin(lessons, eq(lessons.id, assessments.lessonId))
      .leftJoin(weeks, eq(weeks.id, lessons.weekId))
      .leftJoin(terms, eq(terms.id, weeks.termId))
      .where(eq(assessments.classId, classId))
      .orderBy(desc(assessments.date));

    return rows.map(({ lessonWeekId, termId, ...rest }) => rest);
  }

  async createAssessment(
    teacherId: string,
    classId: number,
    input: Omit<CreateAssessmentRequest, "classId">,
  ): Promise<AssessmentResponse | undefined> {
    const list = await this.listAssessmentsByClass(teacherId, classId);
    if (!list) return undefined;

    const [created] = await db
      .insert(assessments)
      .values({ ...input, classId })
      .returning();
    return created;
  }

  async updateAssessment(
    teacherId: string,
    id: number,
    updates: Partial<Omit<CreateAssessmentRequest, "classId">>,
  ): Promise<AssessmentResponse | undefined> {
    const [asmt] = await db
      .select({ id: assessments.id, classId: assessments.classId })
      .from(assessments)
      .where(eq(assessments.id, id));
    if (!asmt) return undefined;

    const list = await this.listAssessmentsByClass(teacherId, asmt.classId);
    if (!list) return undefined;

    const [updated] = await db
      .update(assessments)
      .set(updates)
      .where(eq(assessments.id, id))
      .returning();
    return updated;
  }

  async deleteAssessment(teacherId: string, id: number): Promise<boolean> {
    const [asmt] = await db
      .select({ id: assessments.id, classId: assessments.classId })
      .from(assessments)
      .where(eq(assessments.id, id));
    if (!asmt) return false;

    const list = await this.listAssessmentsByClass(teacherId, asmt.classId);
    if (!list) return false;

    const [deleted] = await db.delete(assessments).where(eq(assessments.id, id)).returning();
    return !!deleted;
  }

  async upsertAssessmentScores(
    teacherId: string,
    assessmentId: number,
    scoresInput: Omit<CreateStudentScoreRequest, "assessmentId">[],
  ): Promise<StudentScoreResponse[] | undefined> {
    const [asmt] = await db
      .select({ id: assessments.id, classId: assessments.classId })
      .from(assessments)
      .where(eq(assessments.id, assessmentId));
    if (!asmt) return undefined;

    const list = await this.listAssessmentsByClass(teacherId, asmt.classId);
    if (!list) return undefined;

    const studentIds = scoresInput.map((s) => s.studentId);
    const existingStudents = await db
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.classId, asmt.classId), inArray(students.id, studentIds)));

    if (existingStudents.length !== studentIds.length) {
      return undefined;
    }

    const values = scoresInput.map((s) => ({ ...s, assessmentId }));

    const inserted = await db
      .insert(studentScores)
      .values(values)
      .onConflictDoUpdate({
        target: [studentScores.assessmentId, studentScores.studentId],
        set: {
          score: (studentScores as any).score,
        },
      })
      .returning();

    return inserted;
  }

  async getStudentMastery(
    teacherId: string,
    studentId: number,
  ): Promise<StudentMasteryResponse | undefined> {
    const studentRow = await db
      .select({
        id: students.id,
        fullName: students.fullName,
        classId: students.classId,
      })
      .from(students)
      .where(eq(students.id, studentId))
      .then(rows => rows[0]);

    if (!studentRow) return undefined;

    const [cls] = await db
      .select({ id: classes.id })
      .from(classes)
      .where(and(eq(classes.id, studentRow.classId), eq(classes.teacherId, teacherId)));
    if (!cls) return undefined;

    const settingsRow = await this.getSettings(teacherId);

    const scores = await db
      .select({
        assessmentId: studentScores.assessmentId,
        studentId: studentScores.studentId,
        score: studentScores.score,
        assessmentTotal: assessments.totalScore,
        assessmentType: assessments.type,
        assessmentDate: assessments.date,
        lessonId: assessments.lessonId,
        outcomeId: assessments.outcomeId,
        lessonTitle: lessons.title,
        outcomeDescription: outcomes.description,
      })
      .from(studentScores)
      .innerJoin(assessments, eq(studentScores.assessmentId, assessments.id))
      .leftJoin(lessons, eq(assessments.lessonId, lessons.id))
      .leftJoin(outcomes, eq(assessments.outcomeId, outcomes.id))
      .where(and(eq(studentScores.studentId, studentId), eq(assessments.classId, studentRow.classId)))
      .orderBy(desc(assessments.date));

    if (scores.length === 0) {
      return {
        studentId,
        studentName: studentRow.fullName,
        overall: 0,
        masteryLevel: "Needs Support",
        trend: "Stable",
        strengths: [],
        needsSupport: [],
        byLesson: [],
        byOutcome: [],
        schoolName: settingsRow.schoolName,
      };
    }

    type Row = (typeof scores)[number];

    const rowsByOutcome = new Map<number, Row[]>();
    const rowsByLesson = new Map<number, Row[]>();

    for (let i = 0; i < scores.length; i++) {
      const r = scores[i];
      if (r.outcomeId) {
        const list = rowsByOutcome.get(r.outcomeId) ?? [];
        list.push(r);
        rowsByOutcome.set(r.outcomeId, list);
      }
      if (r.lessonId) {
        const list = rowsByLesson.get(r.lessonId) ?? [];
        list.push(r);
        rowsByLesson.set(r.lessonId, list);
      }
    }

    const computeAggregate = (rows: Row[]) => {
      let weightedSum = 0;
      let weightSum = 0;

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const percentage = (r.score / r.assessmentTotal) * 100;
        const type = r.assessmentType as AssessmentType;
        const weight = assessmentTypeWeights[type] ?? 0;
        const recencyMultiplier = computeRecencyMultiplier(i);
        weightedSum += percentage * weight * recencyMultiplier;
        weightSum += weight;
      }

      const score = weightSum > 0 ? weightedSum / weightSum : 0;
      return Math.max(0, Math.min(100, score));
    };

    const byOutcome = Array.from(rowsByOutcome.entries()).map(([outcomeId, rows]) => {
      const score = computeAggregate(rows);
      const outcomeDescription = rows[0]?.outcomeDescription ?? "";
      return { outcomeId, outcomeDescription, score };
    });

    const byLesson = Array.from(rowsByLesson.entries()).map(([lessonId, rows]) => {
      const score = computeAggregate(rows);
      const lessonTitle = rows[0]?.lessonTitle ?? "";
      return { lessonId, lessonTitle, score };
    });

    const overall = byOutcome.length
      ? byOutcome.reduce((sum, o) => sum + o.score, 0) / byOutcome.length
      : computeAggregate(scores);

    const overallClamped = Math.max(0, Math.min(100, overall));

    const recentRows = scores.slice(0, 3);
    const recentAvg = computeAggregate(recentRows);
    const trend = computeTrend(recentAvg, overallClamped);

    const sortedOutcomes = [...byOutcome].sort((a, b) => b.score - a.score);
    const strengths = sortedOutcomes.slice(0, 2);
    const needsSupport = sortedOutcomes.slice(-2).reverse();

    return {
      studentId,
      studentName: studentRow.fullName,
      overall: overallClamped,
      masteryLevel: classifyMasteryLevel(overallClamped),
      trend,
      strengths,
      needsSupport,
      byLesson,
      byOutcome,
      schoolName: settingsRow.schoolName,
    };
  }

  async getClassMastery(teacherId: string, classId: number): Promise<any | undefined> {
    const [cls] = await db
      .select()
      .from(classes)
      .where(and(eq(classes.id, classId), eq(classes.teacherId, teacherId)));
    if (!cls) return undefined;

    const classStudents = await db
      .select()
      .from(students)
      .where(eq(students.classId, classId));

    if (classStudents.length === 0) {
      return {
        classId,
        className: cls.name,
        totalStudents: 0,
        performingCount: 0,
        midLevelCount: 0,
        remediationCount: 0,
        averageMastery: 0,
        studentBreakdown: [],
      };
    }

    const studentMasteries = await Promise.all(
      classStudents.map((s) => this.getStudentMastery(teacherId, s.id)),
    );

    const validMasteries = studentMasteries.filter(Boolean) as StudentMasteryResponse[];

    const performing = validMasteries.filter((m) => m.overall >= 70).length;
    const mid = validMasteries.filter((m) => m.overall >= 50 && m.overall < 70).length;
    const remediation = validMasteries.filter((m) => m.overall < 50).length;
    const avg = validMasteries.length > 0
      ? validMasteries.reduce((sum, m) => sum + m.overall, 0) / validMasteries.length
      : 0;

    return {
      classId,
      className: cls.name,
      totalStudents: classStudents.length,
      performingCount: performing,
      midLevelCount: mid,
      remediationCount: remediation,
      averageMastery: avg,
      studentBreakdown: validMasteries.map((m) => ({
        studentId: m.studentId,
        fullName: m.studentName || "Unknown",
        overall: m.overall,
        level: m.masteryLevel,
      })),
    };
  }

  async getAcademicYearCurriculum(teacherId: string, yearId: number): Promise<any | undefined> {
    const [year] = await db
      .select()
      .from(academicYears)
      .where(and(eq(academicYears.id, yearId), eq(academicYears.teacherId, teacherId)));
    if (!year) return undefined;

    const termsList = await db
      .select()
      .from(terms)
      .where(eq(terms.academicYearId, yearId))
      .orderBy(asc(terms.createdAt));

    const result: any[] = [];
    for (const term of termsList) {
      const weeksList = await db
        .select()
        .from(weeks)
        .where(eq(weeks.termId, term.id))
        .orderBy(asc(weeks.weekNumber));

      const termObj: any = { ...term, weeks: [] };
      for (const week of weeksList) {
        const lessonsList = await db
          .select()
          .from(lessons)
          .where(eq(lessons.weekId, week.id))
          .orderBy(asc(lessons.title));

        const weekObj: any = { ...week, lessons: [] };
        for (const lesson of lessonsList) {
          const outcomesList = await db
            .select()
            .from(outcomes)
            .where(eq(outcomes.lessonId, lesson.id))
            .orderBy(asc(outcomes.description));
          weekObj.lessons.push({ ...lesson, outcomes: outcomesList });
        }
        termObj.weeks.push(weekObj);
      }
      result.push(termObj);
    }

    return { year, terms: result };
  }

  async getClassCurriculum(teacherId: string, classId: number): Promise<any | undefined> {
    const [cls] = await db
      .select()
      .from(classes)
      .where(and(eq(classes.id, classId), eq(classes.teacherId, teacherId)));
    if (!cls) return undefined;

    const allSubjects = await db
      .select()
      .from(subjects)
      .where(eq(subjects.teacherId, teacherId))
      .orderBy(asc(subjects.name));

    const result: any[] = [];

    for (const subject of allSubjects) {
      const lessonsList = await db
        .select()
        .from(lessons)
        .where(and(eq(lessons.classId, classId), eq(lessons.subjectId, subject.id)))
        .orderBy(asc(lessons.createdAt));

      if (lessonsList.length === 0) continue;

      const enriched: any[] = [];
      for (const lesson of lessonsList) {
        let weekLabel: string | null = null;
        let weekNumber: number | null = null;
        let termName: string | null = null;
        let yearName: string | null = null;

        if (lesson.weekId) {
          const rows = await db
            .select({
              weekNumber: weeks.weekNumber,
              termName: terms.name,
              yearName: academicYears.name,
            })
            .from(weeks)
            .innerJoin(terms, eq(weeks.termId, terms.id))
            .innerJoin(academicYears, eq(terms.academicYearId, academicYears.id))
            .where(eq(weeks.id, lesson.weekId));
          if (rows[0]) {
            weekNumber = rows[0].weekNumber;
            termName = rows[0].termName;
            yearName = rows[0].yearName;
            weekLabel = `Week ${rows[0].weekNumber} — ${rows[0].termName}, ${rows[0].yearName}`;
          }
        }

        const outcomesList = await db
          .select()
          .from(outcomes)
          .where(eq(outcomes.lessonId, lesson.id))
          .orderBy(asc(outcomes.description));

        enriched.push({ ...lesson, weekLabel, weekNumber, termName, yearName, outcomes: outcomesList });
      }

      result.push({ subject, lessons: enriched });
    }

    return { class: cls, subjects: result };
  }

  // ─── School / Multi-user methods ────────────────────────────────────────────

  async getMySchool(userId: string): Promise<MySchoolResponse | null> {
    const [member] = await db
      .select()
      .from(schoolMembers)
      .where(eq(schoolMembers.userId, userId))
      .limit(1);
    if (!member) return null;
    const [school] = await db.select().from(schools).where(eq(schools.id, member.schoolId)).limit(1);
    if (!school) return null;
    return { school, role: member.role as SchoolRole, memberId: member.id, linkedStudentId: member.linkedStudentId ?? null };
  }

  async createSchool(userId: string, name: string): Promise<MySchoolResponse> {
    const [school] = await db.insert(schools).values({ name, createdBy: userId }).returning();
    const [member] = await db
      .insert(schoolMembers)
      .values({ schoolId: school.id, userId, role: "admin" })
      .returning();
    return { school, role: "admin", memberId: member.id, linkedStudentId: null };
  }

  async listSchoolMembers(schoolId: number): Promise<SchoolMemberWithUser[]> {
    const rows = await db
      .select({
        id: schoolMembers.id,
        schoolId: schoolMembers.schoolId,
        userId: schoolMembers.userId,
        role: schoolMembers.role,
        linkedStudentId: schoolMembers.linkedStudentId,
        invitedBy: schoolMembers.invitedBy,
        joinedAt: schoolMembers.joinedAt,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
      })
      .from(schoolMembers)
      .leftJoin(users, eq(schoolMembers.userId, users.id))
      .where(eq(schoolMembers.schoolId, schoolId));

    const result: SchoolMemberWithUser[] = [];
    for (const row of rows) {
      let studentName: string | null = null;
      if (row.linkedStudentId) {
        const [stu] = await db.select().from(students).where(eq(students.id, row.linkedStudentId)).limit(1);
        studentName = stu?.fullName ?? null;
      }
      result.push({ ...row, studentName });
    }
    return result;
  }

  async removeSchoolMember(schoolId: number, userId: string): Promise<boolean> {
    const deleted = await db
      .delete(schoolMembers)
      .where(and(eq(schoolMembers.schoolId, schoolId), eq(schoolMembers.userId, userId)))
      .returning();
    return deleted.length > 0;
  }

  async createInvitation(
    schoolId: number,
    invitedBy: string,
    data: { role: string; inviteeName?: string; linkedStudentId?: number },
  ): Promise<InvitationWithDetails> {
    const token = crypto.randomUUID();
    const [inv] = await db
      .insert(invitations)
      .values({
        schoolId,
        token,
        role: data.role,
        inviteeName: data.inviteeName ?? null,
        linkedStudentId: data.linkedStudentId ?? null,
        invitedBy,
      })
      .returning();
    return { ...inv, invitedByName: null };
  }

  async listInvitations(schoolId: number): Promise<InvitationWithDetails[]> {
    const rows = await db
      .select()
      .from(invitations)
      .where(eq(invitations.schoolId, schoolId))
      .orderBy(desc(invitations.createdAt));
    return rows.map((r) => ({ ...r, invitedByName: null }));
  }

  async deleteInvitation(id: number, schoolId: number): Promise<boolean> {
    const deleted = await db
      .delete(invitations)
      .where(and(eq(invitations.id, id), eq(invitations.schoolId, schoolId)))
      .returning();
    return deleted.length > 0;
  }

  async getInvitationPreview(token: string): Promise<InvitePreviewResponse | null> {
    const [inv] = await db.select().from(invitations).where(eq(invitations.token, token)).limit(1);
    if (!inv || inv.used === "yes") return null;
    const [school] = await db.select().from(schools).where(eq(schools.id, inv.schoolId)).limit(1);
    if (!school) return null;
    return { schoolName: school.name, role: inv.role as SchoolRole, inviteeName: inv.inviteeName };
  }

  async acceptInvitation(token: string, userId: string): Promise<MySchoolResponse | null> {
    const [inv] = await db.select().from(invitations).where(eq(invitations.token, token)).limit(1);
    if (!inv || inv.used === "yes") return null;

    // Check if already a member
    const [existing] = await db
      .select()
      .from(schoolMembers)
      .where(and(eq(schoolMembers.schoolId, inv.schoolId), eq(schoolMembers.userId, userId)))
      .limit(1);
    if (existing) {
      // Already a member — just mark invite used and return
      await db.update(invitations).set({ used: "yes", usedBy: userId }).where(eq(invitations.id, inv.id));
      const [school] = await db.select().from(schools).where(eq(schools.id, inv.schoolId)).limit(1);
      return { school: school!, role: existing.role as SchoolRole, memberId: existing.id, linkedStudentId: existing.linkedStudentId ?? null };
    }

    // Mark invite used
    await db.update(invitations).set({ used: "yes", usedBy: userId }).where(eq(invitations.id, inv.id));

    // Create member
    const [member] = await db
      .insert(schoolMembers)
      .values({
        schoolId: inv.schoolId,
        userId,
        role: inv.role,
        linkedStudentId: inv.linkedStudentId ?? null,
        invitedBy: inv.invitedBy,
      })
      .returning();

    // If student role, link student record
    if (inv.role === "student" && inv.linkedStudentId) {
      await db.update(students).set({ userId }).where(eq(students.id, inv.linkedStudentId));
    }

    const [school] = await db.select().from(schools).where(eq(schools.id, inv.schoolId)).limit(1);
    return { school: school!, role: member.role as SchoolRole, memberId: member.id, linkedStudentId: member.linkedStudentId ?? null };
  }

  async getSchoolOverview(schoolId: number): Promise<any> {
    const members = await this.listSchoolMembers(schoolId);
    const teacherIds = members
      .filter((m) => m.role === "admin" || m.role === "teacher")
      .map((m) => m.userId);

    let totalClasses = 0;
    let totalStudents = 0;
    const classBreakdown: any[] = [];

    for (const tid of teacherIds) {
      const clsList = await db.select().from(classes).where(eq(classes.teacherId, tid));
      totalClasses += clsList.length;
      for (const cls of clsList) {
        const stuList = await db.select().from(students).where(eq(students.classId, cls.id));
        totalStudents += stuList.length;
        classBreakdown.push({ classId: cls.id, className: cls.name, teacherId: tid, studentCount: stuList.length });
      }
    }

    return {
      schoolId,
      memberCount: members.length,
      teacherCount: teacherIds.length,
      totalClasses,
      totalStudents,
      members,
      classBreakdown,
    };
  }

  async getStudentPortalData(userId: string): Promise<any | null> {
    // Find the student linked to this userId
    const [member] = await db
      .select()
      .from(schoolMembers)
      .where(and(eq(schoolMembers.userId, userId), eq(schoolMembers.role, "student")))
      .limit(1);
    if (!member?.linkedStudentId) return null;

    const studentId = member.linkedStudentId;
    const [student] = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
    if (!student) return null;

    const cls = await db.select().from(classes).where(eq(classes.id, student.classId)).limit(1);
    const teacherId = cls[0]?.teacherId ?? "";
    const mastery = await this.getStudentMastery(teacherId, studentId);

    return { student, class: cls[0] ?? null, mastery };
  }
}

export const storage = new DatabaseStorage();
