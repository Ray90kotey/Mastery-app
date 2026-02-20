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
    const termsList = await storage.listTerms(teacherId, yearId);
    res.json(termsList);
  });

  app.post(api.academic.terms.create.path, isAuthenticated, async (req, res) => {
    try {
      const teacherId = getTeacherId(req);
      const yearId = Number(req.params.academicYearId);
      const body = api.academic.terms.create.input.parse(req.body);
      const created = await storage.createTerm(teacherId, { ...body, academicYearId: yearId });
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Validation failed", errors: err.errors });
      throw err;
    }
  });

  app.get(api.academic.weeks.listByTerm.path, isAuthenticated, async (req, res) => {
    const teacherId = getTeacherId(req);
    const termId = Number(req.params.termId);
    const weeksList = await storage.listWeeks(teacherId, termId);
    res.json(weeksList);
  });

  app.post(api.academic.weeks.create.path, isAuthenticated, async (req, res) => {
    try {
      const teacherId = getTeacherId(req);
      const termId = Number(req.params.termId);
      const body = api.academic.weeks.create.input.parse(req.body);
      const created = await storage.createWeek(teacherId, { ...body, termId });
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Validation failed", errors: err.errors });
      throw err;
    }
  });

  app.get(api.academic.lessons.listByWeek.path, isAuthenticated, async (req, res) => {
    const teacherId = getTeacherId(req);
    const weekId = Number(req.params.weekId);
    const lessonsList = await storage.listLessons(teacherId, weekId);
    res.json(lessonsList);
  });

  app.post(api.academic.lessons.create.path, isAuthenticated, async (req, res) => {
    try {
      const teacherId = getTeacherId(req);
      const weekId = Number(req.params.weekId);
      const body = api.academic.lessons.create.input.parse(req.body);
      const created = await storage.createLesson(teacherId, { ...body, weekId });
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Validation failed", errors: err.errors });
      throw err;
    }
  });

  app.get(api.academic.outcomes.listByLesson.path, isAuthenticated, async (req, res) => {
    const teacherId = getTeacherId(req);
    const lessonId = Number(req.params.lessonId);
    const outcomesList = await storage.listOutcomes(teacherId, lessonId);
    res.json(outcomesList);
  });

  app.post(api.academic.outcomes.create.path, isAuthenticated, async (req, res) => {
    try {
      const teacherId = getTeacherId(req);
      const lessonId = Number(req.params.lessonId);
      const body = api.academic.outcomes.create.input.parse(req.body);
      const created = await storage.createOutcome(teacherId, { ...body, lessonId });
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
    const assessmentsList = await storage.listAssessments(teacherId, classId);
    res.json(assessmentsList);
  });

  app.post(api.assessments.create.path, isAuthenticated, async (req, res) => {
    try {
      const teacherId = getTeacherId(req);
      const classId = Number(req.params.classId);
      const body = api.assessments.create.input.parse(req.body);
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

  // Reports: generate PDF and return a URL
  app.post(api.reports.generateStudent.path, isAuthenticated, async (req: any, res) => {
    const teacherId = getTeacherId(req);
    const id = Number(req.params.id);

    const masteryData = await storage.getStudentMastery(teacherId, id);
    if (!masteryData) return res.status(404).json({ message: "Student not found" });

    const teacherSettings = await storage.getSettings(teacherId);

    const reportsDir = ensureReportsDir();
    const fileName = `mastery_report_student_${id}_${Date.now()}.pdf`;
    const filePath = path.join(reportsDir, fileName);

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // --- Header Section ---
      doc.rect(0, 0, 595.28, 80).fill("#0F4C5C");
      
      if (teacherSettings?.schoolLogo) {
        try {
          const logoBuffer = Buffer.from(teacherSettings.schoolLogo.split(",")[1], "base64");
          doc.image(logoBuffer, 50, 15, { height: 50 });
          doc.fillColor("#FFFFFF").fontSize(20).font("Helvetica-Bold").text("MASTERY PERFORMANCE", 120, 32);
        } catch (e) {
          doc.fillColor("#FFFFFF").fontSize(24).font("Helvetica-Bold").text("MASTERY PERFORMANCE REPORT", 50, 30);
        }
      } else {
        doc.fillColor("#FFFFFF").fontSize(24).font("Helvetica-Bold").text("MASTERY PERFORMANCE REPORT", 50, 30);
      }
      
      doc.fillColor("#000000").font("Helvetica").fontSize(10);
      doc.moveDown(4);

      // School Info
      const schoolName = teacherSettings?.schoolName || masteryData.schoolName || "Academic Institution";
      doc.fontSize(14).font("Helvetica-Bold").text(schoolName.toUpperCase(), { align: "right" });
      doc.fontSize(10).font("Helvetica").text("Academic Performance Division", { align: "right" });
      doc.moveDown();

      // Student Info Box
      doc.rect(50, 110, 495, 60).stroke("#E2E8F0");
      doc.fontSize(10).font("Helvetica-Bold").text("STUDENT NAME:", 65, 125);
      doc.font("Helvetica").text(masteryData.studentName || "N/A", 160, 125);
      
      doc.font("Helvetica-Bold").text("REPORT DATE:", 350, 125);
      doc.font("Helvetica").text(new Date().toLocaleDateString(), 440, 125);

      doc.font("Helvetica-Bold").text("MASTERY LEVEL:", 65, 145);
      const levelColor = masteryData.overall >= 85 ? "#0F4C5C" : masteryData.overall >= 70 ? "#F4A300" : "#E53E3E";
      doc.fillColor(levelColor).text(masteryData.masteryLevel.toUpperCase(), 160, 145);
      doc.fillColor("#000000");

      doc.font("Helvetica-Bold").text("TREND:", 350, 145);
      doc.font("Helvetica").text(masteryData.trend.toUpperCase(), 440, 145);

      doc.moveDown(5);

      // --- Score Highlights ---
      doc.rect(50, 190, 495, 40).fill("#F4A300");
      doc.fillColor("#FFFFFF").fontSize(16).font("Helvetica-Bold").text("OVERALL MASTERY SCORE", 65, 202);
      doc.fontSize(20).text(`${masteryData.overall.toFixed(1)}%`, 450, 200, { align: "right", width: 80 });
      doc.fillColor("#000000");

      doc.moveDown(4);

      // --- Performance Tables ---
      const drawTableHeaders = (y: number, title: string) => {
        doc.fontSize(12).font("Helvetica-Bold").text(title.toUpperCase(), 50, y);
        doc.rect(50, y + 15, 495, 20).fill("#F1F5F9");
        doc.fillColor("#475569").fontSize(9).text("DESCRIPTION", 65, y + 21);
        doc.text("SCORE", 480, y + 21, { align: "right", width: 50 });
        doc.fillColor("#000000");
        return y + 35;
      };

      let currentY = 260;
      currentY = drawTableHeaders(currentY, "Lesson Breakdown");
      
      masteryData.byLesson.forEach((l) => {
        doc.fontSize(10).font("Helvetica").text(l.lessonTitle, 65, currentY);
        doc.font("Helvetica-Bold").text(`${l.score.toFixed(1)}%`, 480, currentY, { align: "right", width: 50 });
        doc.moveTo(50, currentY + 15).lineTo(545, currentY + 15).stroke("#F1F5F9");
        currentY += 25;
      });

      currentY += 20;
      currentY = drawTableHeaders(currentY, "Outcome Analysis");
      masteryData.byOutcome.forEach((o) => {
        doc.fontSize(10).font("Helvetica").text(o.outcomeDescription, 65, currentY);
        doc.font("Helvetica-Bold").text(`${o.score.toFixed(1)}%`, 480, currentY, { align: "right", width: 50 });
        doc.moveTo(50, currentY + 15).lineTo(545, currentY + 15).stroke("#F1F5F9");
        currentY += 25;
      });

      // --- Insights & Comments ---
      currentY += 30;
      doc.rect(50, currentY, 495, 80).stroke("#0F4C5C");
      doc.fontSize(11).font("Helvetica-Bold").text("ACADEMIC INSIGHTS", 65, currentY + 15);
      doc.fontSize(10).font("Helvetica").text(generateInsight(masteryData.trend, masteryData.overall, masteryData.needsSupport), 65, currentY + 35, { width: 465 });

      // --- Footer ---
      doc.fontSize(10).font("Helvetica-Bold").text("TEACHER SIGNATURE:", 50, 720);
      
      if (teacherSettings?.handwrittenSignature) {
        try {
          const sigBuffer = Buffer.from(teacherSettings.handwrittenSignature.split(",")[1], "base64");
          doc.image(sigBuffer, 180, 690, { height: 40 });
        } catch (e) {
          doc.moveTo(180, 732).lineTo(350, 732).stroke("#000000");
        }
      } else {
        doc.moveTo(180, 732).lineTo(350, 732).stroke("#000000");
      }
      
      doc.fontSize(8).font("Helvetica").text("This report is an official record of student mastery performance.", 50, 750, { align: "center", width: 495 });

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

  app.post(api.reports.generateClass.path, isAuthenticated, async (req: any, res) => {
    const teacherId = getTeacherId(req);
    const id = Number(req.params.id);

    const masteryData = await storage.getClassMastery(teacherId, id);
    if (!masteryData) return res.status(404).json({ message: "Class not found" });

    const teacherSettings = await storage.getSettings(teacherId);

    const reportsDir = ensureReportsDir();
    const fileName = `mastery_report_class_${id}_${Date.now()}.pdf`;
    const filePath = path.join(reportsDir, fileName);

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // --- Header Section ---
      doc.rect(0, 0, 595.28, 80).fill("#0F4C5C");
      
      if (teacherSettings?.schoolLogo) {
        try {
          const logoBuffer = Buffer.from(teacherSettings.schoolLogo.split(",")[1], "base64");
          doc.image(logoBuffer, 50, 15, { height: 50 });
          doc.fillColor("#FFFFFF").fontSize(20).font("Helvetica-Bold").text("CLASS PERFORMANCE", 120, 32);
        } catch (e) {
          doc.fillColor("#FFFFFF").fontSize(24).font("Helvetica-Bold").text("CLASS PERFORMANCE REPORT", 50, 30);
        }
      } else {
        doc.fillColor("#FFFFFF").fontSize(24).font("Helvetica-Bold").text("CLASS PERFORMANCE REPORT", 50, 30);
      }
      
      doc.fillColor("#000000").font("Helvetica").fontSize(10);
      doc.moveDown(4);

      // Class Info Box
      doc.rect(50, 110, 495, 60).stroke("#E2E8F0");
      doc.fontSize(10).font("Helvetica-Bold").text("CLASS NAME:", 65, 125);
      doc.font("Helvetica").text(masteryData.className || "N/A", 160, 125);
      
      doc.font("Helvetica-Bold").text("REPORT DATE:", 350, 125);
      doc.font("Helvetica").text(new Date().toLocaleDateString(), 440, 125);

      doc.font("Helvetica-Bold").text("TOTAL STUDENTS:", 65, 145);
      doc.font("Helvetica").text(String(masteryData.totalStudents), 160, 145);

      doc.font("Helvetica-Bold").text("AVG MASTERY:", 350, 145);
      doc.font("Helvetica").text(`${masteryData.averageMastery.toFixed(1)}%`, 440, 145);

      doc.moveDown(5);

      // --- Performance Summary Blocks ---
      const blockWidth = 150;
      const blockHeight = 60;
      const startX = 50;
      const startY = 190;

      // Performing
      doc.rect(startX, startY, blockWidth, blockHeight).fill("#0F4C5C");
      doc.fillColor("#FFFFFF").fontSize(10).font("Helvetica-Bold").text("PERFORMING", startX + 10, startY + 15);
      doc.fontSize(18).text(String(masteryData.performingCount), startX + 10, startY + 30);

      // Mid-Level
      doc.rect(startX + blockWidth + 22, startY, blockWidth, blockHeight).fill("#F4A300");
      doc.fillColor("#FFFFFF").fontSize(10).font("Helvetica-Bold").text("MID-LEVEL", startX + blockWidth + 32, startY + 15);
      doc.fontSize(18).text(String(masteryData.midLevelCount), startX + blockWidth + 32, startY + 30);

      // Remediation
      doc.rect(startX + (blockWidth + 22) * 2, startY, blockWidth, blockHeight).fill("#E53E3E");
      doc.fillColor("#FFFFFF").fontSize(10).font("Helvetica-Bold").text("REMEDIATION", startX + (blockWidth + 22) * 2 + 10, startY + 15);
      doc.fontSize(18).text(String(masteryData.remediationCount), startX + (blockWidth + 22) * 2 + 10, startY + 30);

      doc.fillColor("#000000");
      doc.moveDown(6);

      // --- Student Breakdown Table ---
      doc.fontSize(12).font("Helvetica-Bold").text("STUDENT PERFORMANCE BREAKDOWN", 50, 280);
      doc.rect(50, 295, 495, 20).fill("#F1F5F9");
      doc.fillColor("#475569").fontSize(9).text("STUDENT NAME", 65, 301);
      doc.text("MASTERY", 400, 301, { align: "right", width: 60 });
      doc.text("LEVEL", 480, 301, { align: "right", width: 50 });
      
      let curY = 320;
      
      // Group students by level for the sections
      const masteredList = masteryData.studentBreakdown.filter((s: any) => s.level === "Mastered" || s.level === "Proficient");
      const developingList = masteryData.studentBreakdown.filter((s: any) => s.level === "Developing");
      const supportList = masteryData.studentBreakdown.filter((s: any) => s.level === "Needs Support");

      const drawSection = (students: any[], title: string, color: string) => {
        if (students.length === 0) return;
        
        if (curY > 700) {
          doc.addPage();
          curY = 50;
        }

        doc.fillColor(color).fontSize(11).font("Helvetica-Bold").text(title.toUpperCase(), 50, curY);
        curY += 20;

        students.forEach((s: any) => {
          if (curY > 750) {
            doc.addPage();
            curY = 50;
          }
          doc.fillColor("#000000").fontSize(10).font("Helvetica").text(s.fullName, 65, curY);
          doc.font("Helvetica-Bold").text(`${s.overall.toFixed(1)}%`, 400, curY, { align: "right", width: 60 });
          doc.font("Helvetica").text(s.level, 480, curY, { align: "right", width: 50 });
          doc.moveTo(50, curY + 15).lineTo(545, currentY + 15).stroke("#F1F5F9");
          curY += 25;
        });
        curY += 10;
      };

      drawSection(masteredList, "Mastered / Performing", "#0F4C5C");
      drawSection(developingList, "Developing / Mid-Level", "#F4A300");
      drawSection(supportList, "Needs Support / Remediation", "#E53E3E");

      // --- Footer ---
      if (teacherSettings?.handwrittenSignature) {
        try {
          const sigBuffer = Buffer.from(teacherSettings.handwrittenSignature.split(",")[1], "base64");
          doc.image(sigBuffer, 180, curY > 700 ? (doc.addPage(), 50) : curY + 20, { height: 40 });
        } catch (e) {}
      }

      doc.fontSize(8).font("Helvetica").text("Generated by Mastery Education SaaS. This report reflects live classroom performance data.", 50, 780, { align: "center", width: 495 });

      doc.end();

      stream.on("finish", () => resolve());
      stream.on("error", (e) => reject(e));
    });

    res.status(201).json({
      classId: id,
      fileName,
      url: `/api/reports/${fileName}`,
    });
  });

  app.get("/api/reports/:fileName", isAuthenticated, async (req: any, res) => {
    const fileName = String(req.params.fileName || "");
    const reportsDir = ensureReportsDir();
    const filePath = path.join(reportsDir, fileName);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "Report not found" });
    res.sendFile(filePath);
  });
}
