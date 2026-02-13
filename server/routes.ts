import type { Express } from "express";
import type { Server } from "http";
import { z } from "zod";
import { api } from "@shared/routes";
import {
  insertAcademicYearSchema,
  insertAssessmentSchema,
  insertClassSchema,
  insertLessonSchema,
  insertOutcomeSchema,
  insertStudentSchema,
  insertTermSchema,
  insertWeekSchema,
  upsertSettingsSchema,
} from "@shared/schema";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";

function getTeacherId(req: any): string {
  return req.user?.claims?.sub;
}

function zodErrorToResponse(err: z.ZodError) {
  return {
    message: err.errors[0]?.message ?? "Invalid request",
    field: err.errors[0]?.path?.join(".") || undefined,
  };
}

async function seedDatabase(teacherId: string) {
  const classes = await storage.listClasses(teacherId);
  if (classes.length > 0) return;

  await storage.upsertSettings(teacherId, { teacherId, schoolName: "" });

  const cls = await storage.createClass(teacherId, { teacherId, name: "Grade 6 Mathematics" } as any);

  const s1 = await storage.createStudent(teacherId, cls.id, {
    fullName: "Ama Mensah",
    parentName: "Kofi Mensah",
    parentEmail: "kofi.mensah@example.com",
    parentPhone: "+233200000001",
  });
  const s2 = await storage.createStudent(teacherId, cls.id, {
    fullName: "Yaw Owusu",
    parentName: "Akosua Owusu",
    parentEmail: "akosua.owusu@example.com",
    parentPhone: "+233200000002",
  });
  const s3 = await storage.createStudent(teacherId, cls.id, {
    fullName: "Efua Asare",
    parentName: "Kwame Asare",
    parentEmail: "kwame.asare@example.com",
    parentPhone: "+233200000003",
  });

  const year = await storage.createAcademicYear(teacherId, { teacherId, name: "2025/2026" } as any);
  const term = await storage.createTerm(teacherId, year.id, { name: "Term 1" });
  const week = await storage.createWeek(teacherId, term!.id, { weekNumber: 3 });
  const lesson = await storage.createLesson(teacherId, week!.id, { title: "Fractions Introduction" });
  const o1 = await storage.createOutcome(teacherId, lesson!.id, { description: "Understand numerator and denominator" });
  const o2 = await storage.createOutcome(teacherId, lesson!.id, { description: "Represent fractions visually" });

  const now = new Date();
  const asmt1 = await storage.createAssessment(teacherId, cls.id, {
    title: "Fractions Classwork 1",
    type: "Classwork",
    lessonId: lesson!.id,
    outcomeId: o1!.id,
    totalScore: 10,
    date: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
  });
  const asmt2 = await storage.createAssessment(teacherId, cls.id, {
    title: "Fractions Quiz",
    type: "Quiz",
    lessonId: lesson!.id,
    outcomeId: o2!.id,
    totalScore: 20,
    date: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
  });
  const asmt3 = await storage.createAssessment(teacherId, cls.id, {
    title: "Fractions Test",
    type: "Test",
    lessonId: lesson!.id,
    outcomeId: o1!.id,
    totalScore: 30,
    date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
  });

  const studentIds = [s1, s2, s3].filter(Boolean).map((s: any) => s.id);
  if (asmt1 && asmt2 && asmt3 && studentIds.length) {
    await storage.upsertAssessmentScores(teacherId, asmt1.id, [
      { studentId: studentIds[0], score: 8 },
      { studentId: studentIds[1], score: 5 },
      { studentId: studentIds[2], score: 7 },
    ]);
    await storage.upsertAssessmentScores(teacherId, asmt2.id, [
      { studentId: studentIds[0], score: 16 },
      { studentId: studentIds[1], score: 10 },
      { studentId: studentIds[2], score: 14 },
    ]);
    await storage.upsertAssessmentScores(teacherId, asmt3.id, [
      { studentId: studentIds[0], score: 26 },
      { studentId: studentIds[1], score: 14 },
      { studentId: studentIds[2], score: 20 },
    ]);
  }
}

function ensureReportsDir() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const reportsDir = path.join(__dirname, "reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  return reportsDir;
}

function generateInsight(trend: string, overall: number, needsSupport: { outcomeDescription: string }[]) {
  if (overall >= 85) {
    return "Student demonstrates strong and consistent understanding across lessons.";
  }
  if (trend === "Improving") {
    return "Student is showing steady improvement in recent assessments.";
  }
  if (trend === "Declining") {
    return "Recent performance suggests the student may benefit from targeted revision.";
  }
  if (needsSupport.length) {
    return `Student needs additional support in ${needsSupport[0].outcomeDescription}.`;
  }
  return "Keep practicing consistently to build mastery across outcomes.";
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  // Settings
  app.get(api.settings.get.path, isAuthenticated, async (req: any, res) => {
    const teacherId = getTeacherId(req);
    const row = await storage.getSettings(teacherId);
    res.json(row);
  });

  app.put(api.settings.upsert.path, isAuthenticated, async (req: any, res) => {
    try {
      const teacherId = getTeacherId(req);
      const body = upsertSettingsSchema.parse({ ...req.body, teacherId });
      const row = await storage.upsertSettings(teacherId, body);
      res.json(row);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json(zodErrorToResponse(err));
      }
      throw err;
    }
  });

  // Classes
  app.get(api.classes.list.path, isAuthenticated, async (req: any, res) => {
    const teacherId = getTeacherId(req);
    await seedDatabase(teacherId);
    const rows = await storage.listClasses(teacherId);
    res.json(rows);
  });

  app.post(api.classes.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const teacherId = getTeacherId(req);
      const body = insertClassSchema.parse({ ...req.body, teacherId });
      const created = await storage.createClass(teacherId, body as any);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json(zodErrorToResponse(err));
      throw err;
    }
  });

  app.put(api.classes.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const teacherId = getTeacherId(req);
      const id = Number(req.params.id);
      const body = insertClassSchema.partial().parse(req.body);
      const updated = await storage.updateClass(teacherId, id, body as any);
      if (!updated) return res.status(404).json({ message: "Class not found" });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json(zodErrorToResponse(err));
      throw err;
    }
  });

  app.delete(api.classes.delete.path, isAuthenticated, async (req: any, res) => {
    const teacherId = getTeacherId(req);
    const id = Number(req.params.id);
    const ok = await storage.deleteClass(teacherId, id);
    if (!ok) return res.status(404).json({ message: "Class not found" });
    res.status(204).end();
  });

  // Students
  app.get(api.students.listByClass.path, isAuthenticated, async (req: any, res) => {
    const teacherId = getTeacherId(req);
    const classId = Number(req.params.classId);
    const rows = await storage.listStudentsByClass(teacherId, classId);
    if (!rows) return res.status(404).json({ message: "Class not found" });
    res.json(rows);
  });

  app.post(api.students.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const teacherId = getTeacherId(req);
      const classId = Number(req.params.classId);
      const body = insertStudentSchema.omit({ classId: true }).parse(req.body);
      const created = await storage.createStudent(teacherId, classId, body);
      if (!created) return res.status(404).json({ message: "Class not found" });
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json(zodErrorToResponse(err));
      throw err;
    }
  });

  app.put(api.students.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const teacherId = getTeacherId(req);
      const id = Number(req.params.id);
      const body = insertStudentSchema.partial().omit({ classId: true }).parse(req.body);
      const updated = await storage.updateStudent(teacherId, id, body);
      if (!updated) return res.status(404).json({ message: "Student not found" });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json(zodErrorToResponse(err));
      throw err;
    }
  });

  app.delete(api.students.delete.path, isAuthenticated, async (req: any, res) => {
    const teacherId = getTeacherId(req);
    const id = Number(req.params.id);
    const ok = await storage.deleteStudent(teacherId, id);
    if (!ok) return res.status(404).json({ message: "Student not found" });
    res.status(204).end();
  });

  // Academic years
  app.get(api.academic.years.list.path, isAuthenticated, async (req: any, res) => {
    const teacherId = getTeacherId(req);
    const rows = await storage.listAcademicYears(teacherId);
    res.json(rows);
  });

  app.post(api.academic.years.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const teacherId = getTeacherId(req);
      const body = insertAcademicYearSchema.parse({ ...req.body, teacherId });
      const created = await storage.createAcademicYear(teacherId, body as any);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json(zodErrorToResponse(err));
      throw err;
    }
  });

  app.put(api.academic.years.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const teacherId = getTeacherId(req);
      const id = Number(req.params.id);
      const body = insertAcademicYearSchema.partial().parse(req.body);
      const updated = await storage.updateAcademicYear(teacherId, id, body as any);
      if (!updated) return res.status(404).json({ message: "Academic year not found" });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json(zodErrorToResponse(err));
      throw err;
    }
  });

  app.delete(api.academic.years.delete.path, isAuthenticated, async (req: any, res) => {
    const teacherId = getTeacherId(req);
    const id = Number(req.params.id);
    const ok = await storage.deleteAcademicYear(teacherId, id);
    if (!ok) return res.status(404).json({ message: "Academic year not found" });
    res.status(204).end();
  });

  // Terms
  app.get(api.academic.terms.listByYear.path, isAuthenticated, async (req: any, res) => {
    const teacherId = getTeacherId(req);
    const academicYearId = Number(req.params.academicYearId);
    const rows = await storage.listTermsByYear(teacherId, academicYearId);
    if (!rows) return res.status(404).json({ message: "Academic year not found" });
    res.json(rows);
  });

  app.post(api.academic.terms.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const teacherId = getTeacherId(req);
      const academicYearId = Number(req.params.academicYearId);
      const body = insertTermSchema.omit({ academicYearId: true }).parse(req.body);
      const created = await storage.createTerm(teacherId, academicYearId, body);
      if (!created) return res.status(404).json({ message: "Academic year not found" });
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json(zodErrorToResponse(err));
      throw err;
    }
  });

  // Weeks
  app.get(api.academic.weeks.listByTerm.path, isAuthenticated, async (req: any, res) => {
    const teacherId = getTeacherId(req);
    const termId = Number(req.params.termId);
    const rows = await storage.listWeeksByTerm(teacherId, termId);
    if (!rows) return res.status(404).json({ message: "Term not found" });
    res.json(rows);
  });

  app.post(api.academic.weeks.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const teacherId = getTeacherId(req);
      const termId = Number(req.params.termId);
      const body = insertWeekSchema.omit({ termId: true }).parse(req.body);
      const created = await storage.createWeek(teacherId, termId, body);
      if (!created) return res.status(404).json({ message: "Term not found" });
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json(zodErrorToResponse(err));
      throw err;
    }
  });

  // Lessons
  app.get(api.academic.lessons.listByWeek.path, isAuthenticated, async (req: any, res) => {
    const teacherId = getTeacherId(req);
    const weekId = Number(req.params.weekId);
    const rows = await storage.listLessonsByWeek(teacherId, weekId);
    if (!rows) return res.status(404).json({ message: "Week not found" });
    res.json(rows);
  });

  app.post(api.academic.lessons.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const teacherId = getTeacherId(req);
      const weekId = Number(req.params.weekId);
      const body = insertLessonSchema.omit({ weekId: true }).parse(req.body);
      const created = await storage.createLesson(teacherId, weekId, body);
      if (!created) return res.status(404).json({ message: "Week not found" });
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json(zodErrorToResponse(err));
      throw err;
    }
  });

  // Outcomes
  app.get(api.academic.outcomes.listByLesson.path, isAuthenticated, async (req: any, res) => {
    const teacherId = getTeacherId(req);
    const lessonId = Number(req.params.lessonId);
    const rows = await storage.listOutcomesByLesson(teacherId, lessonId);
    if (!rows) return res.status(404).json({ message: "Lesson not found" });
    res.json(rows);
  });

  app.post(api.academic.outcomes.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const teacherId = getTeacherId(req);
      const lessonId = Number(req.params.lessonId);
      const body = insertOutcomeSchema.omit({ lessonId: true }).parse(req.body);
      const created = await storage.createOutcome(teacherId, lessonId, body);
      if (!created) return res.status(404).json({ message: "Lesson not found" });
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json(zodErrorToResponse(err));
      throw err;
    }
  });

  // Assessments
  app.get(api.assessments.listByClass.path, isAuthenticated, async (req: any, res) => {
    const teacherId = getTeacherId(req);
    const classId = Number(req.params.classId);
    const rows = await storage.listAssessmentsByClass(teacherId, classId);
    if (!rows) return res.status(404).json({ message: "Class not found" });
    res.json(rows);
  });

  app.post(api.assessments.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const teacherId = getTeacherId(req);
      const classId = Number(req.params.classId);
      const body = insertAssessmentSchema
        .omit({ classId: true })
        .extend({
          totalScore: z.coerce.number(),
          lessonId: z.coerce.number().optional().nullable(),
          outcomeId: z.coerce.number().optional().nullable(),
          date: z.coerce.date(),
        })
        .parse(req.body);

      const created = await storage.createAssessment(teacherId, classId, {
        ...body,
        lessonId: body.lessonId ?? null,
        outcomeId: body.outcomeId ?? null,
      });
      if (!created) return res.status(404).json({ message: "Class not found" });
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json(zodErrorToResponse(err));
      throw err;
    }
  });

  app.put(api.assessments.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const teacherId = getTeacherId(req);
      const id = Number(req.params.id);
      const body = insertAssessmentSchema
        .partial()
        .omit({ classId: true })
        .extend({
          totalScore: z.coerce.number().optional(),
          lessonId: z.coerce.number().optional().nullable(),
          outcomeId: z.coerce.number().optional().nullable(),
          date: z.coerce.date().optional(),
        })
        .parse(req.body);

      const updated = await storage.updateAssessment(teacherId, id, {
        ...body,
        lessonId: body.lessonId ?? undefined,
        outcomeId: body.outcomeId ?? undefined,
      });
      if (!updated) return res.status(404).json({ message: "Assessment not found" });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json(zodErrorToResponse(err));
      throw err;
    }
  });

  app.delete(api.assessments.delete.path, isAuthenticated, async (req: any, res) => {
    const teacherId = getTeacherId(req);
    const id = Number(req.params.id);
    const ok = await storage.deleteAssessment(teacherId, id);
    if (!ok) return res.status(404).json({ message: "Assessment not found" });
    res.status(204).end();
  });

  // Scores
  app.put(api.scores.upsert.path, isAuthenticated, async (req: any, res) => {
    try {
      const teacherId = getTeacherId(req);
      const assessmentId = Number(req.params.assessmentId);
      const body = api.scores.upsert.input.parse(req.body);
      const saved = await storage.upsertAssessmentScores(teacherId, assessmentId, body.scores);
      if (!saved) return res.status(404).json({ message: "Assessment not found" });
      res.json(saved);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json(zodErrorToResponse(err));
      throw err;
    }
  });

  // Mastery
  app.get(api.mastery.student.path, isAuthenticated, async (req: any, res) => {
    const teacherId = getTeacherId(req);
    const id = Number(req.params.id);
    const mastery = await storage.getStudentMastery(teacherId, id);
    if (!mastery) return res.status(404).json({ message: "Student not found" });
    res.json(mastery);
  });

  // Reports: generate PDF and return a URL
  app.post(api.reports.generateStudent.path, isAuthenticated, async (req: any, res) => {
    const teacherId = getTeacherId(req);
    const id = Number(req.params.id);

    const mastery = await storage.getStudentMastery(teacherId, id);
    if (!mastery) return res.status(404).json({ message: "Student not found" });

    const reportsDir = ensureReportsDir();
    const fileName = `mastery_report_student_${id}_${Date.now()}.pdf`;
    const filePath = path.join(reportsDir, fileName);

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      doc.fontSize(18).text("Student Performance Report", { align: "center" });
      doc.moveDown();
      doc.fontSize(12).text(`Overall Mastery: ${mastery.overall.toFixed(1)}%`);
      doc.text(`Mastery Level: ${mastery.masteryLevel}`);
      doc.text(`Trend: ${mastery.trend}`);
      doc.moveDown();

      doc.fontSize(14).text("Strengths", { underline: true });
      mastery.strengths.forEach((s) => {
        doc.fontSize(11).text(`- ${s.outcomeDescription}: ${s.score.toFixed(1)}%`);
      });
      doc.moveDown();

      doc.fontSize(14).text("Areas for Improvement", { underline: true });
      mastery.needsSupport.forEach((s) => {
        doc.fontSize(11).text(`- ${s.outcomeDescription}: ${s.score.toFixed(1)}%`);
      });
      doc.moveDown();

      doc.fontSize(14).text("Lesson Breakdown", { underline: true });
      mastery.byLesson.forEach((l) => {
        doc.fontSize(11).text(`- ${l.lessonTitle}: ${l.score.toFixed(1)}%`);
      });
      doc.moveDown();

      doc.fontSize(14).text("AI Insight", { underline: true });
      doc.fontSize(11).text(generateInsight(mastery.trend, mastery.overall, mastery.needsSupport));
      doc.moveDown();

      doc.fontSize(12).text("Teacher Comment:");
      doc.moveDown(2);
      doc.text("Signature: __________________________");

      doc.end();

      stream.on("finish", () => resolve());
      stream.on("error", (e) => reject(e));
    });

    // Serve via static URL under /api/reports/:file
    res.status(201).json({
      studentId: id,
      fileName,
      url: `/api/reports/${fileName}`,
    });
  });

  app.get("/api/reports/:fileName", isAuthenticated, async (_req: any, res) => {
    const fileName = String(_req.params.fileName || "");
    const reportsDir = ensureReportsDir();
    const filePath = path.join(reportsDir, fileName);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "Report not found" });
    res.sendFile(filePath);
  });

  return httpServer;
}
