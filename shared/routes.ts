import { z } from "zod";
import {
  insertAcademicYearSchema,
  insertAssessmentSchema,
  insertClassSchema,
  insertLessonSchema,
  insertOutcomeSchema,
  insertStudentSchema,
  insertStudentScoreSchema,
  insertTermSchema,
  insertWeekSchema,
  type AcademicYear,
  type Assessment,
  type Class,
  type Lesson,
  type Outcome,
  type Student,
  type StudentMasteryResponse,
  type StudentScore,
  type TeacherSettings,
  upsertSettingsSchema,
} from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  settings: {
    get: {
      method: "GET" as const,
      path: "/api/settings" as const,
      responses: {
        200: z.custom<TeacherSettings>(),
      },
    },
    upsert: {
      method: "PUT" as const,
      path: "/api/settings" as const,
      input: upsertSettingsSchema,
      responses: {
        200: z.custom<TeacherSettings>(),
        400: errorSchemas.validation,
      },
    },
  },

  classes: {
    list: {
      method: "GET" as const,
      path: "/api/classes" as const,
      responses: {
        200: z.array(z.custom<Class>()),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/classes" as const,
      input: insertClassSchema,
      responses: {
        201: z.custom<Class>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: "PUT" as const,
      path: "/api/classes/:id" as const,
      input: insertClassSchema.partial(),
      responses: {
        200: z.custom<Class>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/classes/:id" as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },

  students: {
    listByClass: {
      method: "GET" as const,
      path: "/api/classes/:classId/students" as const,
      responses: {
        200: z.array(z.custom<Student>()),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/classes/:classId/students" as const,
      input: insertStudentSchema.omit({ classId: true }),
      responses: {
        201: z.custom<Student>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: "PUT" as const,
      path: "/api/students/:id" as const,
      input: insertStudentSchema.partial().omit({ classId: true }),
      responses: {
        200: z.custom<Student>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/students/:id" as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },

  academic: {
    years: {
      list: {
        method: "GET" as const,
        path: "/api/academic-years" as const,
        responses: {
          200: z.array(z.custom<AcademicYear>()),
        },
      },
      create: {
        method: "POST" as const,
        path: "/api/academic-years" as const,
        input: insertAcademicYearSchema,
        responses: {
          201: z.custom<AcademicYear>(),
          400: errorSchemas.validation,
        },
      },
      update: {
        method: "PUT" as const,
        path: "/api/academic-years/:id" as const,
        input: insertAcademicYearSchema.partial(),
        responses: {
          200: z.custom<AcademicYear>(),
          400: errorSchemas.validation,
          404: errorSchemas.notFound,
        },
      },
      delete: {
        method: "DELETE" as const,
        path: "/api/academic-years/:id" as const,
        responses: {
          204: z.void(),
          404: errorSchemas.notFound,
        },
      },
    },

    terms: {
      listByYear: {
        method: "GET" as const,
        path: "/api/academic-years/:academicYearId/terms" as const,
        responses: {
          200: z.array(z.custom<{ id: number; academicYearId: number; name: string; createdAt: Date }>()),
          404: errorSchemas.notFound,
        },
      },
      create: {
        method: "POST" as const,
        path: "/api/academic-years/:academicYearId/terms" as const,
        input: insertTermSchema.omit({ academicYearId: true }),
        responses: {
          201: z.custom<{ id: number; academicYearId: number; name: string; createdAt: Date }>(),
          400: errorSchemas.validation,
          404: errorSchemas.notFound,
        },
      },
    },

    weeks: {
      listByTerm: {
        method: "GET" as const,
        path: "/api/terms/:termId/weeks" as const,
        responses: {
          200: z.array(z.custom<{ id: number; termId: number; weekNumber: number; createdAt: Date }>()),
          404: errorSchemas.notFound,
        },
      },
      create: {
        method: "POST" as const,
        path: "/api/terms/:termId/weeks" as const,
        input: insertWeekSchema.omit({ termId: true }),
        responses: {
          201: z.custom<{ id: number; termId: number; weekNumber: number; createdAt: Date }>(),
          400: errorSchemas.validation,
          404: errorSchemas.notFound,
        },
      },
    },

    lessons: {
      listByWeek: {
        method: "GET" as const,
        path: "/api/weeks/:weekId/lessons" as const,
        responses: {
          200: z.array(z.custom<Lesson>()),
          404: errorSchemas.notFound,
        },
      },
      create: {
        method: "POST" as const,
        path: "/api/weeks/:weekId/lessons" as const,
        input: insertLessonSchema.omit({ weekId: true }),
        responses: {
          201: z.custom<Lesson>(),
          400: errorSchemas.validation,
          404: errorSchemas.notFound,
        },
      },
    },

    outcomes: {
      listByLesson: {
        method: "GET" as const,
        path: "/api/lessons/:lessonId/outcomes" as const,
        responses: {
          200: z.array(z.custom<Outcome>()),
          404: errorSchemas.notFound,
        },
      },
      create: {
        method: "POST" as const,
        path: "/api/lessons/:lessonId/outcomes" as const,
        input: insertOutcomeSchema.omit({ lessonId: true }),
        responses: {
          201: z.custom<Outcome>(),
          400: errorSchemas.validation,
          404: errorSchemas.notFound,
        },
      },
    },
  },

  assessments: {
    listByClass: {
      method: "GET" as const,
      path: "/api/classes/:classId/assessments" as const,
      responses: {
        200: z.array(z.custom<Assessment>()),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/classes/:classId/assessments" as const,
      input: insertAssessmentSchema.omit({ classId: true }),
      responses: {
        201: z.custom<Assessment>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: "PUT" as const,
      path: "/api/assessments/:id" as const,
      input: insertAssessmentSchema.partial().omit({ classId: true }),
      responses: {
        200: z.custom<Assessment>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/assessments/:id" as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },

  scores: {
    upsert: {
      method: "PUT" as const,
      path: "/api/assessments/:assessmentId/scores" as const,
      input: z.object({
        scores: z.array(
          insertStudentScoreSchema
            .omit({ assessmentId: true })
            .extend({ studentId: z.coerce.number(), score: z.coerce.number() }),
        ),
      }),
      responses: {
        200: z.array(z.custom<StudentScore>()),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
  },

  mastery: {
    student: {
      method: "GET" as const,
      path: "/api/students/:id/mastery" as const,
      responses: {
        200: z.custom<StudentMasteryResponse>(),
        404: errorSchemas.notFound,
      },
    },
    class: {
      method: "GET" as const,
      path: "/api/classes/:id/mastery" as const,
      responses: {
        200: z.custom<any>(), // ClassMasteryResponse
        404: errorSchemas.notFound,
      },
    },
  },

  reports: {
    generateStudent: {
      method: "POST" as const,
      path: "/api/students/:id/report" as const,
      input: z.object({
        termId: z.coerce.number().optional(),
      }),
      responses: {
        201: z.object({
          studentId: z.number(),
          fileName: z.string(),
          url: z.string(),
        }),
        404: errorSchemas.notFound,
      },
    },
    generateClass: {
      method: "POST" as const,
      path: "/api/classes/:id/report" as const,
      input: z.object({
        termId: z.coerce.number().optional(),
      }),
      responses: {
        201: z.object({
          classId: z.number(),
          fileName: z.string(),
          url: z.string(),
        }),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(
  path: string,
  params?: Record<string, string | number>,
): string {
  let url = path;
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url = url.replace(`:${key}`, String(value));
    }
  }
  return url;
}

export type ValidationError = z.infer<typeof errorSchemas.validation>;
export type NotFoundError = z.infer<typeof errorSchemas.notFound>;
export type InternalError = z.infer<typeof errorSchemas.internal>;
export type UnauthorizedError = z.infer<typeof errorSchemas.unauthorized>;
