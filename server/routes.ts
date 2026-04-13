import { Express, Request, Response, NextFunction, RequestHandler } from "express";
import { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { isAuthenticated } from "./replit_integrations/auth/replitAuth";

function getTeacherId(req: any): string {
  return req.user?.claims?.sub || "demo-teacher";
}

function ensureReportsDir() {
  const reportsDir = path.join(process.cwd(), "reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  return reportsDir;
}

function generateInsight(trend: string, score: number, needsSupport: any[]): string {
  if (score >= 85) return "Exceptional performance! The student has a solid grasp of all concepts and can work independently.";
  if (score >= 70) return "Good progress. The student understands core concepts but would benefit from more practice in complex areas.";
  if (score >= 50) return `Showing steady progress. Focus on: ${needsSupport.slice(0, 2).map(n => n.outcomeDescription).join(", ") || "core fundamentals"}.`;
  return "Requires immediate attention and focused remediation to bridge understanding gaps.";
}

export async function registerRoutes(_server: Server, app: Express) {
  // Auth
  app.get("/api/auth/user", (req: any, res) => {
    if (!req.isAuthenticated()) return res.json(null);
    res.json(req.user);
  });

  // Settings
  app.get(api.settings.get.path, isAuthenticated, async (req, res) => {
    const teacherId = getTeacherId(req);
    const settings = await storage.getSettings(teacherId);
    res.json(settings || { teacherId, schoolName: "" });
  });

  app.put(api.settings.upsert.path, isAuthenticated, async (req, res) => {
    try {
      const teacherId = getTeacherId(req);
      const body = api.settings.upsert.input.parse(req.body);
      const settings = await storage.upsertSettings(teacherId, body);
      res.json(settings);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Validation failed", errors: err.errors });
      throw err;
    }
  });

  // Classes
  app.get(api.classes.list.path, isAuthenticated, async (req, res) => {
    const teacherId = getTeacherId(req);
    const classesList = await storage.listClasses(teacherId);
    res.json(classesList);
  });

  app.post(api.classes.create.path, isAuthenticated, async (req, res) => {
    try {
      const teacherId = getTeacherId(req);
      const body = api.classes.create.input.parse(req.body);
      const created = await storage.createClass(teacherId, body);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Validation failed", errors: err.errors });
      throw err;
    }
  });

  app.get(api.classes.get.path, isAuthenticated, async (req, res) => {
    const teacherId = getTeacherId(req);
    const id = Number(req.params.id);
    const cls = await storage.getClass(teacherId, id);
    if (!cls) return res.status(404).json({ message: "Class not found" });
    res.json(cls);
  });

  app.delete(api.classes.delete.path, isAuthenticated, async (req, res) => {
    const teacherId = getTeacherId(req);
    const id = Number(req.params.id);
    const ok = await storage.deleteClass(teacherId, id);
    if (!ok) return res.status(404).json({ message: "Class not found" });
    res.status(204).end();
  });

  // Students
  app.get(api.students.listByClass.path, isAuthenticated, async (req, res) => {
    try {
      const teacherId = getTeacherId(req);
      const classId = Number(req.params.classId);
      const studentsList = await storage.listStudentsByClass(teacherId, classId);
      if (studentsList === undefined) return res.status(404).json({ message: "Class not found" });
      res.json(studentsList);
    } catch (err) {
      console.error("Error listing students:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.students.create.path, isAuthenticated, async (req, res) => {
    try {
      const teacherId = getTeacherId(req);
      const classId = Number(req.params.classId);
      const body = api.students.create.input.parse(req.body);
      const created = await storage.createStudent(teacherId, classId, body);
      if (!created) return res.status(404).json({ message: "Class not found" });
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Validation failed", errors: err.errors });
      console.error("Error creating student:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.students.get.path, isAuthenticated, async (req, res) => {
    const teacherId = getTeacherId(req);
    const id = Number(req.params.id);
    const student = await storage.getStudent(teacherId, id);
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json(student);
  });

  app.delete(api.students.delete.path, isAuthenticated, async (req, res) => {
    const teacherId = getTeacherId(req);
    const id = Number(req.params.id);
    const ok = await storage.deleteStudent(teacherId, id);
    if (!ok) return res.status(404).json({ message: "Student not found" });
    res.status(204).end();
  });

  // Academic Structure
  app.get(api.academic.years.list.path, isAuthenticated, async (req, res) => {
    const teacherId = getTeacherId(req);
    const years = await storage.listAcademicYears(teacherId);
    res.json(years);
  });

  app.post(api.academic.years.create.path, isAuthenticated, async (req, res) => {
    try {
      const teacherId = getTeacherId(req);
      const body = api.academic.years.create.input.parse(req.body);
      const created = await storage.createAcademicYear(teacherId, body);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Validation failed", errors: err.errors });
      throw err;
    }
  });

  app.get(api.academic.terms.listByYear.path, isAuthenticated, async (req, res) => {
    const teacherId = getTeacherId(req);
    const yearId = Number(req.params.academicYearId);
    const termsList = await storage.listTermsByYear(teacherId, yearId);
    res.json(termsList);
  });

  app.post(api.academic.terms.create.path, isAuthenticated, async (req, res) => {
    try {
      const teacherId = getTeacherId(req);
      const yearId = Number(req.params.academicYearId);
      const body = api.academic.terms.create.input.parse(req.body);
      const created = await storage.createTerm(teacherId, yearId, body);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Validation failed", errors: err.errors });
      throw err;
    }
  });

  app.get(api.academic.weeks.listByTerm.path, isAuthenticated, async (req, res) => {
    const teacherId = getTeacherId(req);
    const termId = Number(req.params.termId);
    const weeksList = await storage.listWeeksByTerm(teacherId, termId);
    res.json(weeksList);
  });

  app.post(api.academic.weeks.create.path, isAuthenticated, async (req, res) => {
    try {
      const teacherId = getTeacherId(req);
      const termId = Number(req.params.termId);
      const body = api.academic.weeks.create.input.parse(req.body);
      const created = await storage.createWeek(teacherId, termId, body);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Validation failed", errors: err.errors });
      throw err;
    }
  });

  app.get(api.academic.lessons.listByWeek.path, isAuthenticated, async (req, res) => {
    const teacherId = getTeacherId(req);
    const weekId = Number(req.params.weekId);
    const lessonsList = await storage.listLessonsByWeek(teacherId, weekId);
    res.json(lessonsList);
  });

  app.post(api.academic.lessons.create.path, isAuthenticated, async (req, res) => {
    try {
      const teacherId = getTeacherId(req);
      const weekId = Number(req.params.weekId);
      const body = api.academic.lessons.create.input.parse(req.body);
      const created = await storage.createLesson(teacherId, weekId, body);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Validation failed", errors: err.errors });
      throw err;
    }
  });

  app.get(api.academic.outcomes.listByLesson.path, isAuthenticated, async (req, res) => {
    const teacherId = getTeacherId(req);
    const lessonId = Number(req.params.lessonId);
    const outcomesList = await storage.listOutcomesByLesson(teacherId, lessonId);
    res.json(outcomesList);
  });

  app.post(api.academic.outcomes.create.path, isAuthenticated, async (req, res) => {
    try {
      const teacherId = getTeacherId(req);
      const lessonId = Number(req.params.lessonId);
      const body = api.academic.outcomes.create.input.parse(req.body);
      const created = await storage.createOutcome(teacherId, lessonId, body);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Validation failed", errors: err.errors });
      throw err;
    }
  });

  // Assessments
  app.get(api.assessments.listByClass.path, isAuthenticated, async (req, res) => {
    const teacherId = getTeacherId(req);
    const classId = Number(req.params.classId);
    const assessmentsList = await storage.listAssessmentsByClass(teacherId, classId);
    res.json(assessmentsList);
  });

  app.post(api.assessments.create.path, isAuthenticated, async (req, res) => {
    try {
      const teacherId = getTeacherId(req);
      const classId = Number(req.params.classId);
      // Convert date string to Date object before validation
      const bodyWithDateParsed = {
        ...req.body,
        date: req.body.date ? new Date(req.body.date) : new Date(),
      };
      const body = api.assessments.create.input.parse(bodyWithDateParsed);
      const created = await storage.createAssessment(teacherId, { ...body, classId });
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Validation failed", errors: err.errors });
      throw err;
    }
  });

  app.get(api.assessments.get.path, isAuthenticated, async (req, res) => {
    const teacherId = getTeacherId(req);
    const id = Number(req.params.id);
    const assessment = await storage.getAssessment(teacherId, id);
    if (!assessment) return res.status(404).json({ message: "Assessment not found" });
    res.json(assessment);
  });

  app.delete(api.assessments.delete.path, isAuthenticated, async (req, res) => {
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
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Validation failed", errors: err.errors });
      throw err;
    }
  });

  // Subjects
  app.get(api.subjects.list.path, isAuthenticated, async (req, res) => {
    const teacherId = getTeacherId(req);
    const subjectsList = await storage.listSubjects(teacherId);
    res.json(subjectsList);
  });

  app.post(api.subjects.create.path, isAuthenticated, async (req, res) => {
    try {
      const teacherId = getTeacherId(req);
      const body = api.subjects.create.input.parse(req.body);
      const created = await storage.createSubject(teacherId, body);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Validation failed", errors: err.errors });
      throw err;
    }
  });

  // Subject Lessons scoped to a class
  app.get("/api/classes/:classId/subjects/:subjectId/lessons", isAuthenticated, async (req: any, res) => {
    const teacherId = getTeacherId(req);
    const subjectId = Number(req.params.subjectId);
    const classId = Number(req.params.classId);
    const result = await storage.listLessonsBySubject(teacherId, subjectId, classId);
    if (!result) return res.status(404).json({ message: "Not found" });
    res.json(result);
  });

  app.post("/api/classes/:classId/subjects/:subjectId/lessons", isAuthenticated, async (req: any, res) => {
    const teacherId = getTeacherId(req);
    const subjectId = Number(req.params.subjectId);
    const classId = Number(req.params.classId);
    const title = String(req.body?.title || "").trim();
    if (!title) return res.status(400).json({ message: "Lesson title is required" });
    const weekId = req.body?.weekId != null ? Number(req.body.weekId) : undefined;
    const created = await storage.createSubjectLesson(teacherId, subjectId, classId, title, weekId);
    if (!created) return res.status(404).json({ message: "Not found" });
    res.status(201).json(created);
  });

  // Class Curriculum (JSON for UI)
  app.get("/api/classes/:classId/curriculum", isAuthenticated, async (req: any, res) => {
    const teacherId = getTeacherId(req);
    const classId = Number(req.params.classId);
    const curriculum = await storage.getClassCurriculum(teacherId, classId);
    if (!curriculum) return res.status(404).json({ message: "Class not found" });
    res.json(curriculum);
  });

  // Class Curriculum PDF
  app.post("/api/classes/:classId/curriculum-pdf", isAuthenticated, async (req: any, res) => {
    const teacherId = getTeacherId(req);
    const classId = Number(req.params.classId);

    const curriculum = await storage.getClassCurriculum(teacherId, classId);
    if (!curriculum) return res.status(404).json({ message: "Class not found" });

    const teacherSettings = await storage.getSettings(teacherId);
    const schoolName = teacherSettings?.schoolName || "Academic Institution";

    const reportsDir = ensureReportsDir();
    const fileName = `curriculum_class_${classId}_${Date.now()}.pdf`;
    const filePath = path.join(reportsDir, fileName);

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: MARGIN, autoFirstPage: true });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      let logoBuffer: Buffer | null = null;
      if (teacherSettings?.schoolLogo) {
        try { logoBuffer = Buffer.from(teacherSettings.schoolLogo.split(",")[1], "base64"); } catch {}
      }

      const pageTitle = `CURRICULUM — ${curriculum.class.name.toUpperCase()}`;
      drawPageHeader(doc, schoolName, logoBuffer, pageTitle);
      let y = 106;

      if (curriculum.subjects.length === 0) {
        doc.fillColor("#64748B").fontSize(11).font("Helvetica").text("No lessons have been added for this class yet.", MARGIN, y + 20);
        doc.end();
        stream.on("finish", () => resolve());
        stream.on("error", (e: any) => reject(e));
        return;
      }

      const SUBJECT_COLORS = ["#0F4C5C", "#1E6A7A", "#2A8BA0", "#C97B00", "#1B5E73", "#E8920A"];

      curriculum.subjects.forEach((subjectObj: any, subIdx: number) => {
        // Page break check
        if (y > PAGE_H - 140) { doc.addPage(); drawPageHeader(doc, schoolName, logoBuffer, pageTitle); y = 106; }

        // Subject header bar
        const subjectColor = SUBJECT_COLORS[subIdx % SUBJECT_COLORS.length];
        doc.rect(MARGIN, y, CONTENT_W, 30).fill(subjectColor);
        doc.fillColor("#FFFFFF").fontSize(12).font("Helvetica-Bold").text(subjectObj.subject.name.toUpperCase(), MARGIN + 14, y + 9);
        const totalLessons = subjectObj.lessons.length;
        const scheduled = subjectObj.lessons.filter((l: any) => l.weekId).length;
        doc.fillColor("rgba(255,255,255,0.7)").fontSize(8).font("Helvetica").text(
          `${totalLessons} lesson${totalLessons !== 1 ? "s" : ""} • ${scheduled} scheduled`,
          MARGIN + CONTENT_W - 130, y + 11
        );
        y += 30 + 6;

        // Group lessons by weekId (null = unscheduled)
        const weekGroups: Map<string, any[]> = new Map();
        for (const lesson of subjectObj.lessons) {
          const key = lesson.weekId ? `${lesson.weekLabel}||${lesson.weekId}` : "unscheduled";
          if (!weekGroups.has(key)) weekGroups.set(key, []);
          weekGroups.get(key)!.push(lesson);
        }

        // Sort: scheduled weeks first (by weekNumber), unscheduled last
        const sortedKeys = Array.from(weekGroups.keys()).sort((a, b) => {
          if (a === "unscheduled") return 1;
          if (b === "unscheduled") return -1;
          const wna = weekGroups.get(a)![0].weekNumber ?? 0;
          const wnb = weekGroups.get(b)![0].weekNumber ?? 0;
          return wna - wnb;
        });

        for (const key of sortedKeys) {
          const groupLessons = weekGroups.get(key)!;
          const isUnscheduled = key === "unscheduled";
          const weekLabel = isUnscheduled ? "Unscheduled" : groupLessons[0].weekLabel;

          if (y > PAGE_H - 100) { doc.addPage(); drawPageHeader(doc, schoolName, logoBuffer, pageTitle); y = 106; }

          // Week group header
          doc.rect(MARGIN + 2, y, CONTENT_W - 2, 20).fill(isUnscheduled ? "#F1F5F9" : "#EBF4F7");
          doc.fillColor(isUnscheduled ? "#94A3B8" : "#0F4C5C").fontSize(9).font("Helvetica-Bold").text(
            weekLabel.toUpperCase(), MARGIN + 14, y + 6
          );
          doc.fillColor("#94A3B8").fontSize(8).font("Helvetica").text(
            `${groupLessons.length} lesson${groupLessons.length !== 1 ? "s" : ""}`,
            MARGIN + CONTENT_W - 70, y + 6
          );
          y += 20 + 4;

          for (const lesson of groupLessons) {
            if (y > PAGE_H - 70) { doc.addPage(); drawPageHeader(doc, schoolName, logoBuffer, pageTitle); y = 106; }

            const outcomesHeight = Math.max(22, 22 + lesson.outcomes.length * 14);
            doc.rect(MARGIN + 12, y, CONTENT_W - 12, outcomesHeight).fill("#FFFFFF");

            // Bullet
            doc.circle(MARGIN + 24, y + 10, 3).fill(subjectColor);
            // Lesson title
            doc.fillColor("#0F172A").fontSize(9.5).font("Helvetica-Bold").text(lesson.title, MARGIN + 32, y + 3, { width: CONTENT_W - 50 });
            y += 18;

            for (const outcome of lesson.outcomes) {
              if (y > PAGE_H - 50) { doc.addPage(); drawPageHeader(doc, schoolName, logoBuffer, pageTitle); y = 106; }
              doc.fillColor("#94A3B8").fontSize(8).font("Helvetica").text("›", MARGIN + 36, y);
              doc.fillColor("#475569").fontSize(8).font("Helvetica").text(outcome.description, MARGIN + 46, y, { width: CONTENT_W - 62 });
              y += 13;
            }

            if (lesson.outcomes.length === 0) {
              doc.fillColor("#CBD5E1").fontSize(7.5).font("Helvetica").text("No outcomes added", MARGIN + 46, y);
              y += 12;
            }

            y += 4;
            doc.moveTo(MARGIN + 12, y).lineTo(MARGIN + CONTENT_W, y).lineWidth(0.2).stroke("#E2E8F0");
          }

          y += 10;
        }

        y += 12;
      });

      // Summary footer
      if (y < PAGE_H - 80) {
        const totalLessons = curriculum.subjects.reduce((s: number, sub: any) => s + sub.lessons.length, 0);
        const totalOutcomes = curriculum.subjects.reduce((s: number, sub: any) => s + sub.lessons.reduce((ls: number, l: any) => ls + l.outcomes.length, 0), 0);
        y += 6;
        doc.rect(MARGIN, y, CONTENT_W, 24).fill("#F8FAFC").stroke("#E2E8F0");
        doc.fillColor("#475569").fontSize(8).font("Helvetica").text(
          `${curriculum.subjects.length} subject${curriculum.subjects.length !== 1 ? "s" : ""} • ${totalLessons} lessons • ${totalOutcomes} outcomes`,
          MARGIN + 12, y + 8
        );
        doc.fillColor("#94A3B8").fontSize(8).font("Helvetica").text(
          new Date().toLocaleDateString("en-GH", { year: "numeric", month: "long", day: "numeric" }),
          MARGIN + CONTENT_W - 130, y + 8
        );
      }

      const footerY = PAGE_H - 45;
      doc.moveTo(MARGIN, footerY).lineTo(PAGE_W - MARGIN, footerY).lineWidth(0.5).stroke("#E2E8F0");
      doc.fillColor("#94A3B8").fontSize(7).font("Helvetica").text(
        "This curriculum was generated by Mastery.",
        MARGIN, footerY + 10, { align: "center", width: CONTENT_W }
      );

      doc.end();
      stream.on("finish", () => resolve());
      stream.on("error", (e: any) => reject(e));
    });

    res.status(201).json({ classId, fileName, url: `/api/reports/${fileName}` });
  });

  // Class Subjects
  app.get(api.classSubjects.list.path, isAuthenticated, async (req, res) => {
    const teacherId = getTeacherId(req);
    const classId = Number(req.params.classId);
    const list = await storage.listClassSubjects(teacherId, classId);
    if (list === undefined) return res.status(404).json({ message: "Class not found" });
    res.json(list);
  });

  app.post(api.classSubjects.assign.path, isAuthenticated, async (req, res) => {
    try {
      const teacherId = getTeacherId(req);
      const classId = Number(req.params.classId);
      const body = api.classSubjects.assign.input.parse(req.body);
      const created = await storage.assignSubjectToClass(teacherId, classId, body);
      if (!created) return res.status(404).json({ message: "Class not found" });
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Validation failed", errors: err.errors });
      throw err;
    }
  });

  // Mastery
  app.get(api.mastery.student.path, isAuthenticated, async (req: any, res) => {
    const teacherId = getTeacherId(req);
    const id = Number(req.params.id);
    const masteryData = await storage.getStudentMastery(teacherId, id);
    if (!masteryData) return res.status(404).json({ message: "Student not found" });
    res.json(masteryData);
  });

  app.get(api.mastery.class.path, isAuthenticated, async (req: any, res) => {
    const teacherId = getTeacherId(req);
    const id = Number(req.params.id);
    const masteryData = await storage.getClassMastery(teacherId, id);
    if (!masteryData) return res.status(404).json({ message: "Class not found" });
    res.json(masteryData);
  });

  // PDF helpers
  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const MARGIN = 50;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  function levelColor(score: number): string {
    if (score >= 85) return "#16A34A";
    if (score >= 70) return "#D97706";
    if (score >= 50) return "#CA8A04";
    return "#DC2626";
  }

  function levelBg(score: number): string {
    if (score >= 85) return "#DCFCE7";
    if (score >= 70) return "#FEF9C3";
    if (score >= 50) return "#FEF3C7";
    return "#FEE2E2";
  }

  function drawPageHeader(doc: any, schoolName: string, logoBuffer: Buffer | null, title: string) {
    // Teal header bar
    doc.rect(0, 0, PAGE_W, 88).fill("#0F4C5C");
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, MARGIN, 16, { height: 56 });
        doc.fillColor("#FFFFFF").fontSize(9).font("Helvetica").text(schoolName.toUpperCase(), MARGIN + 68, 22, { width: 360 });
        doc.fillColor("#FFFFFF").fontSize(17).font("Helvetica-Bold").text(title, MARGIN + 68, 40, { width: 360 });
      } catch {
        doc.fillColor("#FFFFFF").fontSize(9).font("Helvetica").text(schoolName.toUpperCase(), MARGIN, 20, { width: CONTENT_W });
        doc.fillColor("#FFFFFF").fontSize(18).font("Helvetica-Bold").text(title, MARGIN, 42, { width: CONTENT_W });
      }
    } else {
      doc.fillColor("#FFFFFF").fontSize(9).font("Helvetica").text(schoolName.toUpperCase(), MARGIN, 20, { width: CONTENT_W });
      doc.fillColor("#FFFFFF").fontSize(18).font("Helvetica-Bold").text(title, MARGIN, 40, { width: CONTENT_W });
    }
    // Gold accent bar
    doc.rect(0, 88, PAGE_W, 6).fill("#F4A300");
  }

  function drawFooter(doc: any, signatureBuffer: Buffer | null) {
    const footerY = PAGE_H - 65;
    doc.moveTo(MARGIN, footerY).lineTo(PAGE_W - MARGIN, footerY).lineWidth(0.5).stroke("#E2E8F0");
    doc.fillColor("#1E293B").fontSize(8).font("Helvetica-Bold").text("TEACHER SIGNATURE:", MARGIN, footerY + 10);
    if (signatureBuffer) {
      try {
        doc.image(signatureBuffer, MARGIN + 120, footerY - 5, { height: 35 });
      } catch {
        doc.moveTo(MARGIN + 120, footerY + 28).lineTo(MARGIN + 280, footerY + 28).lineWidth(0.5).stroke("#94A3B8");
      }
    } else {
      doc.moveTo(MARGIN + 120, footerY + 28).lineTo(MARGIN + 280, footerY + 28).lineWidth(0.5).stroke("#94A3B8");
    }
    doc.fillColor("#94A3B8").fontSize(7).font("Helvetica").text(
      "This report is an official record of student mastery performance generated by Mastery.",
      MARGIN, footerY + 45, { align: "center", width: CONTENT_W }
    );
  }

  // Reports: generate PDF and return a URL
  app.post(api.reports.generateStudent.path, isAuthenticated, async (req: any, res) => {
    const teacherId = getTeacherId(req);
    const id = Number(req.params.id);

    const masteryData = await storage.getStudentMastery(teacherId, id);
    if (!masteryData) return res.status(404).json({ message: "Student not found" });

    const teacherSettings = await storage.getSettings(teacherId);
    const schoolName = teacherSettings?.schoolName || masteryData.schoolName || "Academic Institution";

    const reportsDir = ensureReportsDir();
    const fileName = `mastery_report_student_${id}_${Date.now()}.pdf`;
    const filePath = path.join(reportsDir, fileName);

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: MARGIN, autoFirstPage: true });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      let logoBuffer: Buffer | null = null;
      if (teacherSettings?.schoolLogo) {
        try { logoBuffer = Buffer.from(teacherSettings.schoolLogo.split(",")[1], "base64"); } catch {}
      }
      let sigBuffer: Buffer | null = null;
      if (teacherSettings?.handwrittenSignature) {
        try { sigBuffer = Buffer.from(teacherSettings.handwrittenSignature.split(",")[1], "base64"); } catch {}
      }

      drawPageHeader(doc, schoolName, logoBuffer, "STUDENT PROGRESS REPORT");

      let y = 106;

      // --- Student Info + Score Panel ---
      // Left card: student info
      doc.rect(MARGIN, y, 300, 90).fill("#F8FAFC").stroke("#E2E8F0");
      doc.fillColor("#64748B").fontSize(7.5).font("Helvetica-Bold").text("STUDENT NAME", MARGIN + 14, y + 12);
      doc.fillColor("#0F172A").fontSize(13).font("Helvetica-Bold").text(masteryData.studentName || "—", MARGIN + 14, y + 25, { width: 270 });
      doc.fillColor("#64748B").fontSize(7.5).font("Helvetica-Bold").text("MASTERY LEVEL", MARGIN + 14, y + 52);
      const lc = levelColor(masteryData.overall);
      doc.fillColor(lc).fontSize(11).font("Helvetica-Bold").text(masteryData.masteryLevel, MARGIN + 14, y + 64);

      // Right card: score
      doc.rect(MARGIN + 315, y, 180, 90).fill("#0F4C5C");
      doc.fillColor("#94D2E0").fontSize(7.5).font("Helvetica-Bold").text("OVERALL MASTERY", MARGIN + 329, y + 10);
      doc.fillColor("#F4A300").fontSize(30).font("Helvetica-Bold").text(`${masteryData.overall.toFixed(1)}%`, MARGIN + 329, y + 26);
      doc.fillColor("#FFFFFF").fontSize(7.5).font("Helvetica").text(`Trend: ${masteryData.trend}`, MARGIN + 329, y + 68);

      y += 106;

      // --- Mastery band bar ---
      const bands = [
        { label: "Needs Support", min: 0, max: 50, color: "#FCA5A5" },
        { label: "Developing", min: 50, max: 70, color: "#FDE68A" },
        { label: "Proficient", min: 70, max: 85, color: "#6EE7B7" },
        { label: "Mastered", min: 85, max: 100, color: "#34D399" },
      ];
      const barW = CONTENT_W;
      bands.forEach(band => {
        const segW = ((band.max - band.min) / 100) * barW;
        const segX = MARGIN + (band.min / 100) * barW;
        doc.rect(segX, y, segW, 10).fill(band.color);
      });
      // Indicator needle
      const needleX = MARGIN + (masteryData.overall / 100) * barW;
      doc.rect(needleX - 2, y - 3, 4, 16).fill("#0F4C5C");
      // Labels
      doc.fillColor("#64748B").fontSize(6.5).font("Helvetica").text("0%", MARGIN, y + 13);
      doc.text("50%", MARGIN + barW * 0.5 - 8, y + 13);
      doc.text("70%", MARGIN + barW * 0.7 - 8, y + 13);
      doc.text("85%", MARGIN + barW * 0.85 - 8, y + 13);
      doc.text("100%", MARGIN + barW - 14, y + 13);
      y += 32;

      // --- Section: Lesson Breakdown ---
      if (masteryData.byLesson.length > 0) {
        doc.fillColor("#0F4C5C").fontSize(10).font("Helvetica-Bold").text("LESSON BREAKDOWN", MARGIN, y);
        y += 14;
        doc.rect(MARGIN, y, CONTENT_W, 18).fill("#F1F5F9");
        doc.fillColor("#475569").fontSize(8).font("Helvetica-Bold").text("LESSON", MARGIN + 10, y + 5);
        doc.text("SCORE", MARGIN + CONTENT_W - 60, y + 5);
        y += 18;

        masteryData.byLesson.forEach((l: any, idx: number) => {
          if (y > PAGE_H - 100) { doc.addPage(); drawPageHeader(doc, schoolName, logoBuffer, "STUDENT PROGRESS REPORT"); y = 106; }
          if (idx % 2 === 0) doc.rect(MARGIN, y, CONTENT_W, 20).fill("#FAFAFA");
          doc.fillColor("#1E293B").fontSize(9).font("Helvetica").text(l.lessonTitle || "—", MARGIN + 10, y + 5, { width: CONTENT_W - 80 });
          const sc = levelColor(l.score);
          doc.fillColor(sc).font("Helvetica-Bold").text(`${l.score.toFixed(1)}%`, MARGIN + CONTENT_W - 60, y + 5);
          doc.moveTo(MARGIN, y + 20).lineTo(MARGIN + CONTENT_W, y + 20).lineWidth(0.3).stroke("#E2E8F0");
          y += 20;
        });
        y += 12;
      }

      // --- Section: Outcome Analysis ---
      if (masteryData.byOutcome.length > 0) {
        if (y > PAGE_H - 120) { doc.addPage(); drawPageHeader(doc, schoolName, logoBuffer, "STUDENT PROGRESS REPORT"); y = 106; }
        doc.fillColor("#0F4C5C").fontSize(10).font("Helvetica-Bold").text("LEARNING OUTCOME ANALYSIS", MARGIN, y);
        y += 14;
        doc.rect(MARGIN, y, CONTENT_W, 18).fill("#F1F5F9");
        doc.fillColor("#475569").fontSize(8).font("Helvetica-Bold").text("OUTCOME", MARGIN + 10, y + 5);
        doc.text("SCORE", MARGIN + CONTENT_W - 60, y + 5);
        y += 18;

        masteryData.byOutcome.forEach((o: any, idx: number) => {
          if (y > PAGE_H - 100) { doc.addPage(); drawPageHeader(doc, schoolName, logoBuffer, "STUDENT PROGRESS REPORT"); y = 106; }
          if (idx % 2 === 0) doc.rect(MARGIN, y, CONTENT_W, 20).fill("#FAFAFA");
          doc.fillColor("#1E293B").fontSize(9).font("Helvetica").text(o.outcomeDescription || "—", MARGIN + 10, y + 5, { width: CONTENT_W - 80 });
          const sc = levelColor(o.score);
          doc.fillColor(sc).font("Helvetica-Bold").text(`${o.score.toFixed(1)}%`, MARGIN + CONTENT_W - 60, y + 5);
          doc.moveTo(MARGIN, y + 20).lineTo(MARGIN + CONTENT_W, y + 20).lineWidth(0.3).stroke("#E2E8F0");
          y += 20;
        });
        y += 12;
      }

      // --- Strengths & Needs Support (side by side) ---
      if (masteryData.strengths.length > 0 || masteryData.needsSupport.length > 0) {
        if (y > PAGE_H - 130) { doc.addPage(); drawPageHeader(doc, schoolName, logoBuffer, "STUDENT PROGRESS REPORT"); y = 106; }
        const colW = (CONTENT_W - 15) / 2;

        // Strengths
        doc.rect(MARGIN, y, colW, 20).fill("#DCFCE7");
        doc.fillColor("#15803D").fontSize(8).font("Helvetica-Bold").text("★  STRENGTHS", MARGIN + 8, y + 6);
        y += 20;
        (masteryData.strengths as any[]).forEach((s, idx) => {
          if (idx % 2 === 0) doc.rect(MARGIN, y, colW, 18).fill("#F0FDF4");
          doc.fillColor("#166534").fontSize(8).font("Helvetica").text(s.outcomeDescription || "—", MARGIN + 8, y + 4, { width: colW - 16 });
          doc.fillColor("#15803D").font("Helvetica-Bold").text(`${s.score.toFixed(0)}%`, MARGIN + colW - 32, y + 4);
          y += 18;
        });

        // Needs Support (right column — reset y to align)
        const rightX = MARGIN + colW + 15;
        let ry = y - (masteryData.strengths.length * 18 + 20);
        doc.rect(rightX, ry, colW, 20).fill("#FEE2E2");
        doc.fillColor("#B91C1C").fontSize(8).font("Helvetica-Bold").text("⚠  NEEDS SUPPORT", rightX + 8, ry + 6);
        ry += 20;
        (masteryData.needsSupport as any[]).forEach((s, idx) => {
          if (idx % 2 === 0) doc.rect(rightX, ry, colW, 18).fill("#FFF5F5");
          doc.fillColor("#7F1D1D").fontSize(8).font("Helvetica").text(s.outcomeDescription || "—", rightX + 8, ry + 4, { width: colW - 16 });
          doc.fillColor("#B91C1C").font("Helvetica-Bold").text(`${s.score.toFixed(0)}%`, rightX + colW - 32, ry + 4);
          ry += 18;
        });

        y += 18;
      }

      // --- Academic Insights ---
      if (y > PAGE_H - 120) { doc.addPage(); drawPageHeader(doc, schoolName, logoBuffer, "STUDENT PROGRESS REPORT"); y = 106; }
      y += 10;
      const insightText = generateInsight(masteryData.trend, masteryData.overall, masteryData.needsSupport);
      const insightHeight = 60;
      doc.rect(MARGIN, y, CONTENT_W, insightHeight).fill("#EFF6FF").stroke("#BFDBFE");
      doc.fillColor("#1D4ED8").fontSize(8).font("Helvetica-Bold").text("ACADEMIC INSIGHTS", MARGIN + 12, y + 10);
      doc.fillColor("#1E3A8A").fontSize(9).font("Helvetica").text(insightText, MARGIN + 12, y + 24, { width: CONTENT_W - 24 });
      y += insightHeight + 8;

      // --- Report Date ---
      doc.fillColor("#94A3B8").fontSize(7.5).font("Helvetica").text(
        `Report generated on ${new Date().toLocaleDateString("en-GH", { year: "numeric", month: "long", day: "numeric" })}`,
        MARGIN, y
      );

      drawFooter(doc, sigBuffer);
      doc.end();
      stream.on("finish", () => resolve());
      stream.on("error", (e) => reject(e));
    });

    res.status(201).json({ studentId: id, fileName, url: `/api/reports/${fileName}` });
  });

  app.post(api.reports.generateClass.path, isAuthenticated, async (req: any, res) => {
    const teacherId = getTeacherId(req);
    const id = Number(req.params.id);

    const masteryData = await storage.getClassMastery(teacherId, id);
    if (!masteryData) return res.status(404).json({ message: "Class not found" });

    const teacherSettings = await storage.getSettings(teacherId);
    const schoolName = teacherSettings?.schoolName || "Academic Institution";

    const reportsDir = ensureReportsDir();
    const fileName = `mastery_report_class_${id}_${Date.now()}.pdf`;
    const filePath = path.join(reportsDir, fileName);

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: MARGIN, autoFirstPage: true });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      let logoBuffer: Buffer | null = null;
      if (teacherSettings?.schoolLogo) {
        try { logoBuffer = Buffer.from(teacherSettings.schoolLogo.split(",")[1], "base64"); } catch {}
      }
      let sigBuffer: Buffer | null = null;
      if (teacherSettings?.handwrittenSignature) {
        try { sigBuffer = Buffer.from(teacherSettings.handwrittenSignature.split(",")[1], "base64"); } catch {}
      }

      drawPageHeader(doc, schoolName, logoBuffer, "CLASS PERFORMANCE REPORT");

      let y = 106;

      // --- Class Info Bar ---
      doc.rect(MARGIN, y, CONTENT_W, 56).fill("#F8FAFC").stroke("#E2E8F0");
      // Row 1
      doc.fillColor("#64748B").fontSize(7.5).font("Helvetica-Bold").text("CLASS NAME", MARGIN + 14, y + 10);
      doc.fillColor("#0F172A").fontSize(12).font("Helvetica-Bold").text(masteryData.className || "—", MARGIN + 14, y + 22);
      doc.fillColor("#64748B").fontSize(7.5).font("Helvetica-Bold").text("REPORT DATE", MARGIN + 310, y + 10);
      doc.fillColor("#0F172A").fontSize(10).font("Helvetica-Bold").text(
        new Date().toLocaleDateString("en-GH", { year: "numeric", month: "long", day: "numeric" }),
        MARGIN + 310, y + 22
      );
      y += 56 + 18;

      // --- Performance Summary Tiles ---
      const totalStudents = masteryData.totalStudents || 1;
      const tiles = [
        {
          label: "MASTERED / PROFICIENT",
          count: masteryData.performingCount,
          pct: Math.round((masteryData.performingCount / totalStudents) * 100),
          bg: "#0F4C5C",
          text: "#FFFFFF",
          sub: "#94D2E0",
        },
        {
          label: "DEVELOPING",
          count: masteryData.midLevelCount,
          pct: Math.round((masteryData.midLevelCount / totalStudents) * 100),
          bg: "#F4A300",
          text: "#FFFFFF",
          sub: "#FEF9C3",
        },
        {
          label: "NEEDS SUPPORT",
          count: masteryData.remediationCount,
          pct: Math.round((masteryData.remediationCount / totalStudents) * 100),
          bg: "#DC2626",
          text: "#FFFFFF",
          sub: "#FEE2E2",
        },
        {
          label: "AVG MASTERY",
          count: null,
          pct: null,
          score: masteryData.averageMastery,
          bg: levelColor(masteryData.averageMastery),
          text: "#FFFFFF",
          sub: "#FFFFFF",
        },
      ];

      const tileW = (CONTENT_W - 15) / 4;
      const tileH = 76;
      tiles.forEach((tile, i) => {
        const tx = MARGIN + i * (tileW + 5);
        doc.rect(tx, y, tileW, tileH).fill(tile.bg);
        doc.fillColor(tile.sub).fontSize(7).font("Helvetica-Bold").text(tile.label, tx + 8, y + 10, { width: tileW - 16 });
        if (tile.count !== null) {
          doc.fillColor(tile.text).fontSize(26).font("Helvetica-Bold").text(String(tile.count), tx + 8, y + 26);
          doc.fillColor(tile.sub).fontSize(8).font("Helvetica").text(`${tile.pct}% of class`, tx + 8, y + 56);
        } else {
          doc.fillColor(tile.text).fontSize(24).font("Helvetica-Bold").text(`${tile.score!.toFixed(1)}%`, tx + 8, y + 28);
          doc.fillColor(tile.sub).fontSize(8).font("Helvetica").text(`${masteryData.totalStudents} students`, tx + 8, y + 56);
        }
      });

      y += tileH + 22;

      // --- Progress bar across full width ---
      const pctPerforming = masteryData.performingCount / totalStudents;
      const pctDeveloping = masteryData.midLevelCount / totalStudents;
      const pctSupport = masteryData.remediationCount / totalStudents;
      doc.rect(MARGIN, y, CONTENT_W * pctPerforming, 8).fill("#0F4C5C");
      doc.rect(MARGIN + CONTENT_W * pctPerforming, y, CONTENT_W * pctDeveloping, 8).fill("#F4A300");
      doc.rect(MARGIN + CONTENT_W * (pctPerforming + pctDeveloping), y, CONTENT_W * pctSupport, 8).fill("#DC2626");
      y += 18;

      // --- Student Breakdown Table ---
      doc.fillColor("#0F4C5C").fontSize(10).font("Helvetica-Bold").text("STUDENT PERFORMANCE BREAKDOWN", MARGIN, y);
      y += 14;

      // Table header
      doc.rect(MARGIN, y, CONTENT_W, 20).fill("#0F4C5C");
      doc.fillColor("#FFFFFF").fontSize(8).font("Helvetica-Bold").text("#", MARGIN + 8, y + 6);
      doc.text("STUDENT NAME", MARGIN + 28, y + 6, { width: 240 });
      doc.text("MASTERY SCORE", MARGIN + 340, y + 6);
      doc.text("LEVEL", MARGIN + 430, y + 6);
      y += 20;

      // Sort by overall descending
      const sorted = [...masteryData.studentBreakdown].sort((a: any, b: any) => b.overall - a.overall);

      sorted.forEach((s: any, idx: number) => {
        if (y > PAGE_H - 90) {
          doc.addPage();
          drawPageHeader(doc, schoolName, logoBuffer, "CLASS PERFORMANCE REPORT");
          y = 106;
          // Repeat table header
          doc.rect(MARGIN, y, CONTENT_W, 20).fill("#0F4C5C");
          doc.fillColor("#FFFFFF").fontSize(8).font("Helvetica-Bold").text("#", MARGIN + 8, y + 6);
          doc.text("STUDENT NAME", MARGIN + 28, y + 6, { width: 240 });
          doc.text("MASTERY SCORE", MARGIN + 340, y + 6);
          doc.text("LEVEL", MARGIN + 430, y + 6);
          y += 20;
        }

        const rowBg = idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC";
        doc.rect(MARGIN, y, CONTENT_W, 22).fill(rowBg);

        // Rank badge
        doc.fillColor("#94A3B8").fontSize(8).font("Helvetica").text(String(idx + 1), MARGIN + 8, y + 6);

        // Name
        doc.fillColor("#1E293B").fontSize(9).font("Helvetica-Bold").text(s.fullName, MARGIN + 28, y + 6, { width: 250 });

        // Score with mini progress bar
        const scoreBarW = 70;
        const scoreBarFill = Math.min(s.overall / 100, 1) * scoreBarW;
        doc.rect(MARGIN + 320, y + 8, scoreBarW, 6).fill("#E2E8F0");
        doc.rect(MARGIN + 320, y + 8, scoreBarFill, 6).fill(levelColor(s.overall));
        doc.fillColor(levelColor(s.overall)).fontSize(8).font("Helvetica-Bold").text(`${s.overall.toFixed(1)}%`, MARGIN + 396, y + 6);

        // Level badge
        const lbg = levelBg(s.overall);
        const lclr = levelColor(s.overall);
        doc.rect(MARGIN + 430, y + 4, 90, 14).fill(lbg);
        doc.fillColor(lclr).fontSize(7.5).font("Helvetica-Bold").text(s.level, MARGIN + 434, y + 7, { width: 82 });

        doc.moveTo(MARGIN, y + 22).lineTo(MARGIN + CONTENT_W, y + 22).lineWidth(0.2).stroke("#E2E8F0");
        y += 22;
      });

      y += 14;
      if (y < PAGE_H - 90) {
        doc.fillColor("#94A3B8").fontSize(7.5).font("Helvetica").text(
          `Report generated on ${new Date().toLocaleDateString("en-GH", { year: "numeric", month: "long", day: "numeric" })} • Total: ${masteryData.totalStudents} students`,
          MARGIN, y, { align: "center", width: CONTENT_W }
        );
      }

      drawFooter(doc, sigBuffer);
      doc.end();
      stream.on("finish", () => resolve());
      stream.on("error", (e) => reject(e));
    });

    res.status(201).json({ classId: id, fileName, url: `/api/reports/${fileName}` });
  });

  // Curriculum PDF: all lessons & outcomes for an academic year
  app.post("/api/academic-years/:id/curriculum-pdf", isAuthenticated, async (req: any, res) => {
    const teacherId = getTeacherId(req);
    const yearId = Number(req.params.id);

    const curriculum = await storage.getAcademicYearCurriculum(teacherId, yearId);
    if (!curriculum) return res.status(404).json({ message: "Academic year not found" });

    const teacherSettings = await storage.getSettings(teacherId);
    const schoolName = teacherSettings?.schoolName || "Academic Institution";

    const reportsDir = ensureReportsDir();
    const fileName = `curriculum_year_${yearId}_${Date.now()}.pdf`;
    const filePath = path.join(reportsDir, fileName);

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: MARGIN, autoFirstPage: true });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      let logoBuffer: Buffer | null = null;
      if (teacherSettings?.schoolLogo) {
        try { logoBuffer = Buffer.from(teacherSettings.schoolLogo.split(",")[1], "base64"); } catch {}
      }

      drawPageHeader(doc, schoolName, logoBuffer, `CURRICULUM OVERVIEW — ${curriculum.year.name}`);

      let y = 106;

      if (curriculum.terms.length === 0) {
        doc.fillColor("#64748B").fontSize(11).font("Helvetica").text("No terms, lessons or outcomes have been added yet.", MARGIN, y + 20);
        doc.end();
        stream.on("finish", () => resolve());
        stream.on("error", (e) => reject(e));
        return;
      }

      const TERM_COLORS = ["#0F4C5C", "#1E6A7A", "#2A8BA0", "#F4A300"];

      curriculum.terms.forEach((term: any, termIdx: number) => {
        // Page break check for term header
        if (y > PAGE_H - 120) { doc.addPage(); drawPageHeader(doc, schoolName, logoBuffer, `CURRICULUM OVERVIEW — ${curriculum.year.name}`); y = 106; }

        // Term header bar
        const termColor = TERM_COLORS[termIdx % TERM_COLORS.length];
        doc.rect(MARGIN, y, CONTENT_W, 28).fill(termColor);
        doc.fillColor("#FFFFFF").fontSize(11).font("Helvetica-Bold").text(term.name.toUpperCase(), MARGIN + 12, y + 8);
        y += 28 + 8;

        if (term.weeks.length === 0) {
          doc.fillColor("#94A3B8").fontSize(9).font("Helvetica").text("No weeks added.", MARGIN + 12, y);
          y += 20;
          return;
        }

        term.weeks.forEach((week: any) => {
          if (y > PAGE_H - 100) { doc.addPage(); drawPageHeader(doc, schoolName, logoBuffer, `CURRICULUM OVERVIEW — ${curriculum.year.name}`); y = 106; }

          // Week header
          doc.rect(MARGIN, y, CONTENT_W, 20).fill("#F1F5F9");
          doc.fillColor("#334155").fontSize(9).font("Helvetica-Bold").text(`WEEK ${week.weekNumber}`, MARGIN + 10, y + 6);
          doc.fillColor("#94A3B8").fontSize(8).font("Helvetica").text(`${week.lessons.length} lesson${week.lessons.length !== 1 ? "s" : ""}`, MARGIN + CONTENT_W - 70, y + 6);
          y += 20 + 4;

          if (week.lessons.length === 0) {
            doc.fillColor("#94A3B8").fontSize(8).font("Helvetica").text("No lessons added.", MARGIN + 20, y);
            y += 16;
            return;
          }

          week.lessons.forEach((lesson: any, lessonIdx: number) => {
            if (y > PAGE_H - 80) { doc.addPage(); drawPageHeader(doc, schoolName, logoBuffer, `CURRICULUM OVERVIEW — ${curriculum.year.name}`); y = 106; }

            // Lesson row
            const lessonBg = lessonIdx % 2 === 0 ? "#FFFFFF" : "#FAFAFA";
            const outcomesHeight = Math.max(22, 22 + lesson.outcomes.length * 15);
            doc.rect(MARGIN + 10, y, CONTENT_W - 10, outcomesHeight).fill(lessonBg);

            // Bullet dot
            doc.circle(MARGIN + 22, y + 11, 3).fill(termColor);

            // Lesson title
            doc.fillColor("#0F172A").fontSize(9.5).font("Helvetica-Bold").text(lesson.title, MARGIN + 30, y + 4, { width: CONTENT_W - 50 });
            y += 18;

            // Outcomes
            lesson.outcomes.forEach((outcome: any) => {
              if (y > PAGE_H - 60) { doc.addPage(); drawPageHeader(doc, schoolName, logoBuffer, `CURRICULUM OVERVIEW — ${curriculum.year.name}`); y = 106; }
              doc.fillColor("#94A3B8").fontSize(8).font("Helvetica").text("›", MARGIN + 34, y);
              doc.fillColor("#475569").fontSize(8).font("Helvetica").text(outcome.description, MARGIN + 44, y, { width: CONTENT_W - 60 });
              y += 14;
            });

            if (lesson.outcomes.length === 0) {
              doc.fillColor("#CBD5E1").fontSize(7.5).font("Helvetica").text("No outcomes added", MARGIN + 44, y);
              y += 13;
            }

            y += 4;
            doc.moveTo(MARGIN + 10, y).lineTo(MARGIN + CONTENT_W, y).lineWidth(0.2).stroke("#E2E8F0");
          });

          y += 12;
        });

        y += 10;
      });

      // Summary footer line
      if (y < PAGE_H - 80) {
        const totalLessons = curriculum.terms.reduce((s: number, t: any) => s + t.weeks.reduce((ws: number, w: any) => ws + w.lessons.length, 0), 0);
        const totalOutcomes = curriculum.terms.reduce((s: number, t: any) => s + t.weeks.reduce((ws: number, w: any) => ws + w.lessons.reduce((ls: number, l: any) => ls + l.outcomes.length, 0), 0), 0);
        y += 6;
        doc.rect(MARGIN, y, CONTENT_W, 24).fill("#F8FAFC").stroke("#E2E8F0");
        doc.fillColor("#475569").fontSize(8).font("Helvetica").text(
          `Total: ${curriculum.terms.length} term${curriculum.terms.length !== 1 ? "s" : ""} • ${totalLessons} lessons • ${totalOutcomes} outcomes`,
          MARGIN + 12, y + 8
        );
        doc.fillColor("#94A3B8").fontSize(8).font("Helvetica").text(
          new Date().toLocaleDateString("en-GH", { year: "numeric", month: "long", day: "numeric" }),
          MARGIN + CONTENT_W - 130, y + 8
        );
      }

      // Footer line
      const footerY = PAGE_H - 45;
      doc.moveTo(MARGIN, footerY).lineTo(PAGE_W - MARGIN, footerY).lineWidth(0.5).stroke("#E2E8F0");
      doc.fillColor("#94A3B8").fontSize(7).font("Helvetica").text(
        "This curriculum overview was generated by Mastery.",
        MARGIN, footerY + 10, { align: "center", width: CONTENT_W }
      );

      doc.end();
      stream.on("finish", () => resolve());
      stream.on("error", (e) => reject(e));
    });

    res.status(201).json({ yearId, fileName, url: `/api/reports/${fileName}` });
  });

  app.get("/api/reports/:fileName", isAuthenticated, async (req: any, res) => {
    const fileName = String(req.params.fileName || "");
    const reportsDir = ensureReportsDir();
    const filePath = path.join(reportsDir, fileName);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "Report not found" });
    res.sendFile(filePath);
  });
}
