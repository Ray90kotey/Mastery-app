import {
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const classes = pgTable(
  "classes",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    teacherId: varchar("teacher_id").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("classes_teacher_name_uq").on(t.teacherId, t.name)],
);

export const students = pgTable(
  "students",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    classId: integer("class_id").notNull(),
    fullName: text("full_name").notNull(),
    parentName: text("parent_name"),
    parentEmail: text("parent_email"),
    parentPhone: text("parent_phone"),
    image: text("image"), // base64 student photo
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("students_class_fullname_uq").on(t.classId, t.fullName),
  ],
);

export const subjects = pgTable(
  "subjects",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    teacherId: varchar("teacher_id").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("subjects_teacher_name_uq").on(t.teacherId, t.name)],
);

export const classSubjects = pgTable(
  "class_subjects",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    classId: integer("class_id").notNull(),
    subjectId: integer("subject_id").notNull(),
    academicYearId: integer("academic_year_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  }
);

export const academicYears = pgTable(
  "academic_years",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    teacherId: varchar("teacher_id").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("academic_years_teacher_name_uq").on(t.teacherId, t.name)],
);

export const terms = pgTable(
  "terms",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    academicYearId: integer("academic_year_id").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("terms_year_name_uq").on(t.academicYearId, t.name)],
);

export const weeks = pgTable(
  "weeks",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    termId: integer("term_id").notNull(),
    weekNumber: integer("week_number").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("weeks_term_weeknumber_uq").on(t.termId, t.weekNumber)],
);

export const lessons = pgTable(
  "lessons",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    weekId: integer("week_id").notNull(),
    title: text("title").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("lessons_week_title_uq").on(t.weekId, t.title)],
);

export const outcomes = pgTable(
  "outcomes",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    lessonId: integer("lesson_id").notNull(),
    description: text("description").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("outcomes_lesson_description_uq").on(t.lessonId, t.description)],
);

export const assessments = pgTable("assessments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  classId: integer("class_id").notNull(),
  title: text("title").notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  lessonId: integer("lesson_id"),
  outcomeId: integer("outcome_id"),
  totalScore: integer("total_score").notNull(),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const studentScores = pgTable(
  "student_scores",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    assessmentId: integer("assessment_id").notNull(),
    studentId: integer("student_id").notNull(),
    score: integer("score").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("student_scores_assessment_student_uq").on(
      t.assessmentId,
      t.studentId,
    ),
  ],
);

export const settings = pgTable("settings", {
  teacherId: varchar("teacher_id").primaryKey(),
  schoolName: text("school_name").notNull().default(""),
  schoolLogo: text("school_logo"), // base64 or URL
  handwrittenSignature: text("handwritten_signature"), // base64 or URL
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const classesRelations = relations(classes, ({ many }) => ({
  students: many(students),
  assessments: many(assessments),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  class: one(classes, {
    fields: [students.classId],
    references: [classes.id],
  }),
  scores: many(studentScores),
}));

export const academicYearsRelations = relations(academicYears, ({ many }) => ({
  terms: many(terms),
}));

export const termsRelations = relations(terms, ({ one, many }) => ({
  academicYear: one(academicYears, {
    fields: [terms.academicYearId],
    references: [academicYears.id],
  }),
  weeks: many(weeks),
}));

export const weeksRelations = relations(weeks, ({ one, many }) => ({
  term: one(terms, {
    fields: [weeks.termId],
    references: [terms.id],
  }),
  lessons: many(lessons),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  week: one(weeks, {
    fields: [lessons.weekId],
    references: [weeks.id],
  }),
  outcomes: many(outcomes),
  assessments: many(assessments),
}));

export const outcomesRelations = relations(outcomes, ({ one, many }) => ({
  lesson: one(lessons, {
    fields: [outcomes.lessonId],
    references: [lessons.id],
  }),
  assessments: many(assessments),
}));

export const assessmentsRelations = relations(assessments, ({ one, many }) => ({
  class: one(classes, {
    fields: [assessments.classId],
    references: [classes.id],
  }),
  lesson: one(lessons, {
    fields: [assessments.lessonId],
    references: [lessons.id],
  }),
  outcome: one(outcomes, {
    fields: [assessments.outcomeId],
    references: [outcomes.id],
  }),
  scores: many(studentScores),
}));

export const studentScoresRelations = relations(studentScores, ({ one }) => ({
  assessment: one(assessments, {
    fields: [studentScores.assessmentId],
    references: [assessments.id],
  }),
  student: one(students, {
    fields: [studentScores.studentId],
    references: [students.id],
  }),
}));

export const insertClassSchema = createInsertSchema(classes).omit({
  id: true,
  createdAt: true,
});
export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
  createdAt: true,
});
export const insertSubjectSchema = createInsertSchema(subjects).omit({
  id: true,
  createdAt: true,
});
export const insertClassSubjectSchema = createInsertSchema(classSubjects).omit({
  id: true,
  createdAt: true,
});
export const insertAcademicYearSchema = createInsertSchema(academicYears).omit({
  id: true,
  createdAt: true,
});
export const insertTermSchema = createInsertSchema(terms).omit({
  id: true,
  createdAt: true,
});
export const insertWeekSchema = createInsertSchema(weeks).omit({
  id: true,
  createdAt: true,
});
export const insertLessonSchema = createInsertSchema(lessons).omit({
  id: true,
  createdAt: true,
});
export const insertOutcomeSchema = createInsertSchema(outcomes).omit({
  id: true,
  createdAt: true,
});
export const insertAssessmentSchema = createInsertSchema(assessments).omit({
  id: true,
  createdAt: true,
});
export const insertStudentScoreSchema = createInsertSchema(studentScores).omit({
  id: true,
  createdAt: true,
});
export const upsertSettingsSchema = createInsertSchema(settings).omit({
  createdAt: true,
});

export type Class = typeof classes.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;
export type CreateClassRequest = InsertClass;
export type UpdateClassRequest = Partial<InsertClass>;
export type ClassResponse = Class;

export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type CreateStudentRequest = InsertStudent;
export type UpdateStudentRequest = Partial<InsertStudent>;
export type StudentResponse = Student;

export type Subject = typeof subjects.$inferSelect;
export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type SubjectResponse = Subject;

export type ClassSubject = typeof classSubjects.$inferSelect;
export type InsertClassSubject = z.infer<typeof insertClassSubjectSchema>;

export type AcademicYear = typeof academicYears.$inferSelect;
export type InsertAcademicYear = z.infer<typeof insertAcademicYearSchema>;
export type CreateAcademicYearRequest = InsertAcademicYear;
export type UpdateAcademicYearRequest = Partial<InsertAcademicYear>;
export type AcademicYearResponse = AcademicYear;

export type Term = typeof terms.$inferSelect;
export type InsertTerm = z.infer<typeof insertTermSchema>;
export type CreateTermRequest = InsertTerm;
export type UpdateTermRequest = Partial<InsertTerm>;
export type TermResponse = Term;

export type Week = typeof weeks.$inferSelect;
export type InsertWeek = z.infer<typeof insertWeekSchema>;
export type CreateWeekRequest = InsertWeek;
export type UpdateWeekRequest = Partial<InsertWeek>;
export type WeekResponse = Week;

export type Lesson = typeof lessons.$inferSelect;
export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type CreateLessonRequest = InsertLesson;
export type UpdateLessonRequest = Partial<InsertLesson>;
export type LessonResponse = Lesson;

export type Outcome = typeof outcomes.$inferSelect;
export type InsertOutcome = z.infer<typeof insertOutcomeSchema>;
export type CreateOutcomeRequest = InsertOutcome;
export type UpdateOutcomeRequest = Partial<InsertOutcome>;
export type OutcomeResponse = Outcome;

export type Assessment = typeof assessments.$inferSelect;
export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;
export type CreateAssessmentRequest = InsertAssessment;
export type UpdateAssessmentRequest = Partial<InsertAssessment>;
export type AssessmentResponse = Assessment;

export type StudentScore = typeof studentScores.$inferSelect;
export type InsertStudentScore = z.infer<typeof insertStudentScoreSchema>;
export type CreateStudentScoreRequest = InsertStudentScore;
export type UpdateStudentScoreRequest = Partial<InsertStudentScore>;
export type StudentScoreResponse = StudentScore;

export type TeacherSettings = typeof settings.$inferSelect;
export type UpsertTeacherSettingsRequest = z.infer<typeof upsertSettingsSchema>;
export type TeacherSettingsResponse = TeacherSettings;

export type AssessmentType = "Classwork" | "Quiz" | "Test" | "Project";
export type MasteryLevel =
  | "Mastered"
  | "Proficient"
  | "Developing"
  | "Needs Support";

export type TrendIndicator = "Improving" | "Stable" | "Declining";

export interface MasteryBand {
  min: number;
  max: number;
  level: MasteryLevel;
  meaning: string;
}

export const masteryBands: MasteryBand[] = [
  {
    min: 85,
    max: 100,
    level: "Mastered",
    meaning: "Independent & confident",
  },
  {
    min: 70,
    max: 84,
    level: "Proficient",
    meaning: "Minor support needed",
  },
  {
    min: 50,
    max: 69,
    level: "Developing",
    meaning: "Needs reinforcement",
  },
  {
    min: 0,
    max: 49,
    level: "Needs Support",
    meaning: "Immediate intervention",
  },
];

export const assessmentTypeWeights: Record<AssessmentType, number> = {
  Classwork: 0.1,
  Quiz: 0.2,
  Test: 0.3,
  Project: 0.4,
};

export type StudentMasteryResponse = {
  studentId: number;
  studentName?: string;
  overall: number;
  masteryLevel: MasteryLevel;
  trend: TrendIndicator;
  strengths: { outcomeId: number; outcomeDescription: string; score: number }[];
  needsSupport: {
    outcomeId: number;
    outcomeDescription: string;
    score: number;
  }[];
  byLesson: { lessonId: number; lessonTitle: string; score: number }[];
  byOutcome: { outcomeId: number; outcomeDescription: string; score: number }[];
  schoolName?: string;
};

export type ClassMasteryResponse = {
  classId: number;
  className: string;
  totalStudents: number;
  performingCount: number; // Mastered + Proficient
  midLevelCount: number; // Developing
  remediationCount: number; // Needs Support
  averageMastery: number;
  studentBreakdown: {
    studentId: number;
    fullName: string;
    overall: number;
    level: MasteryLevel;
  }[];
};

export type ReportResponse = {
  studentId?: number;
  classId?: number;
  fileName: string;
  url: string;
};
