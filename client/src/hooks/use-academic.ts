import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type {
  CreateAcademicYearRequest,
  UpdateAcademicYearRequest,
  CreateTermRequest,
  CreateWeekRequest,
  CreateLessonRequest,
  CreateOutcomeRequest,
} from "@shared/schema";
import { parseWithLogging, readJson } from "@/hooks/use-api-helpers";

export function useAcademicYears() {
  return useQuery({
    queryKey: [api.academic.years.list.path],
    queryFn: async () => {
      const res = await fetch(api.academic.years.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch academic years");
      const json = await readJson(res);
      return parseWithLogging(api.academic.years.list.responses[200], json, "academic.years.list");
    },
  });
}

export function useCreateAcademicYear() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAcademicYearRequest) => {
      const validated = api.academic.years.create.input.parse(input);
      const res = await fetch(api.academic.years.create.path, {
        method: api.academic.years.create.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(validated),
      });
      if (!res.ok) {
        if (res.status === 400) {
          const json = await readJson(res);
          const err = parseWithLogging(api.academic.years.create.responses[400], json, "academic.years.create.400");
          throw new Error(err.message);
        }
        throw new Error("Failed to create academic year");
      }
      const json = await readJson(res);
      return parseWithLogging(api.academic.years.create.responses[201], json, "academic.years.create");
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [api.academic.years.list.path] });
    },
  });
}

export function useUpdateAcademicYear() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateAcademicYearRequest) => {
      const validated = api.academic.years.update.input.parse(updates);
      const url = buildUrl(api.academic.years.update.path, { id });
      const res = await fetch(url, {
        method: api.academic.years.update.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(validated),
      });
      if (!res.ok) {
        if (res.status === 400) {
          const json = await readJson(res);
          const err = parseWithLogging(api.academic.years.update.responses[400], json, "academic.years.update.400");
          throw new Error(err.message);
        }
        if (res.status === 404) {
          const json = await readJson(res);
          const err = parseWithLogging(api.academic.years.update.responses[404], json, "academic.years.update.404");
          throw new Error(err.message);
        }
        throw new Error("Failed to update academic year");
      }
      const json = await readJson(res);
      return parseWithLogging(api.academic.years.update.responses[200], json, "academic.years.update");
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [api.academic.years.list.path] });
    },
  });
}

export function useDeleteAcademicYear() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.academic.years.delete.path, { id });
      const res = await fetch(url, { method: api.academic.years.delete.method, credentials: "include" });
      if (!res.ok) {
        if (res.status === 404) {
          const json = await readJson(res);
          const err = parseWithLogging(api.academic.years.delete.responses[404], json, "academic.years.delete.404");
          throw new Error(err.message);
        }
        throw new Error("Failed to delete academic year");
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [api.academic.years.list.path] });
    },
  });
}

export function useTermsByYear(academicYearId: number | null) {
  return useQuery({
    enabled: typeof academicYearId === "number",
    queryKey: [api.academic.terms.listByYear.path, academicYearId],
    queryFn: async () => {
      const url = buildUrl(api.academic.terms.listByYear.path, { academicYearId: academicYearId as number });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 404) {
          const json = await readJson(res);
          const err = parseWithLogging(api.academic.terms.listByYear.responses[404], json, "academic.terms.listByYear.404");
          throw new Error(err.message);
        }
        throw new Error("Failed to fetch terms");
      }
      const json = await readJson(res);
      return parseWithLogging(api.academic.terms.listByYear.responses[200], json, "academic.terms.listByYear");
    },
  });
}

export function useCreateTerm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ academicYearId, ...input }: { academicYearId: number } & Omit<CreateTermRequest, "academicYearId">) => {
      const validated = api.academic.terms.create.input.parse(input);
      const url = buildUrl(api.academic.terms.create.path, { academicYearId });
      const res = await fetch(url, {
        method: api.academic.terms.create.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(validated),
      });
      if (!res.ok) {
        if (res.status === 400) {
          const json = await readJson(res);
          const err = parseWithLogging(api.academic.terms.create.responses[400], json, "academic.terms.create.400");
          throw new Error(err.message);
        }
        if (res.status === 404) {
          const json = await readJson(res);
          const err = parseWithLogging(api.academic.terms.create.responses[404], json, "academic.terms.create.404");
          throw new Error(err.message);
        }
        throw new Error("Failed to create term");
      }
      const json = await readJson(res);
      return parseWithLogging(api.academic.terms.create.responses[201], json, "academic.terms.create");
    },
    onSuccess: async (_data, vars) => {
      const academicYearId = (vars as any).academicYearId as number;
      await qc.invalidateQueries({ queryKey: [api.academic.terms.listByYear.path, academicYearId] });
    },
  });
}

export function useWeeksByTerm(termId: number | null) {
  return useQuery({
    enabled: typeof termId === "number",
    queryKey: [api.academic.weeks.listByTerm.path, termId],
    queryFn: async () => {
      const url = buildUrl(api.academic.weeks.listByTerm.path, { termId: termId as number });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 404) {
          const json = await readJson(res);
          const err = parseWithLogging(api.academic.weeks.listByTerm.responses[404], json, "academic.weeks.listByTerm.404");
          throw new Error(err.message);
        }
        throw new Error("Failed to fetch weeks");
      }
      const json = await readJson(res);
      return parseWithLogging(api.academic.weeks.listByTerm.responses[200], json, "academic.weeks.listByTerm");
    },
  });
}

export function useCreateWeek() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ termId, ...input }: { termId: number } & Omit<CreateWeekRequest, "termId">) => {
      const validated = api.academic.weeks.create.input.parse(input);
      const url = buildUrl(api.academic.weeks.create.path, { termId });
      const res = await fetch(url, {
        method: api.academic.weeks.create.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(validated),
      });
      if (!res.ok) {
        if (res.status === 400) {
          const json = await readJson(res);
          const err = parseWithLogging(api.academic.weeks.create.responses[400], json, "academic.weeks.create.400");
          throw new Error(err.message);
        }
        if (res.status === 404) {
          const json = await readJson(res);
          const err = parseWithLogging(api.academic.weeks.create.responses[404], json, "academic.weeks.create.404");
          throw new Error(err.message);
        }
        throw new Error("Failed to create week");
      }
      const json = await readJson(res);
      return parseWithLogging(api.academic.weeks.create.responses[201], json, "academic.weeks.create");
    },
    onSuccess: async (_data, vars) => {
      const termId = (vars as any).termId as number;
      await qc.invalidateQueries({ queryKey: [api.academic.weeks.listByTerm.path, termId] });
    },
  });
}

export function useLessonsByWeek(weekId: number | null) {
  return useQuery({
    enabled: typeof weekId === "number",
    queryKey: [api.academic.lessons.listByWeek.path, weekId],
    queryFn: async () => {
      const url = buildUrl(api.academic.lessons.listByWeek.path, { weekId: weekId as number });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 404) {
          const json = await readJson(res);
          const err = parseWithLogging(api.academic.lessons.listByWeek.responses[404], json, "academic.lessons.listByWeek.404");
          throw new Error(err.message);
        }
        throw new Error("Failed to fetch lessons");
      }
      const json = await readJson(res);
      return parseWithLogging(api.academic.lessons.listByWeek.responses[200], json, "academic.lessons.listByWeek");
    },
  });
}

export function useCreateLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ weekId, ...input }: { weekId: number } & Omit<CreateLessonRequest, "weekId">) => {
      const validated = api.academic.lessons.create.input.parse(input);
      const url = buildUrl(api.academic.lessons.create.path, { weekId });
      const res = await fetch(url, {
        method: api.academic.lessons.create.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(validated),
      });
      if (!res.ok) {
        if (res.status === 400) {
          const json = await readJson(res);
          const err = parseWithLogging(api.academic.lessons.create.responses[400], json, "academic.lessons.create.400");
          throw new Error(err.message);
        }
        if (res.status === 404) {
          const json = await readJson(res);
          const err = parseWithLogging(api.academic.lessons.create.responses[404], json, "academic.lessons.create.404");
          throw new Error(err.message);
        }
        throw new Error("Failed to create lesson");
      }
      const json = await readJson(res);
      return parseWithLogging(api.academic.lessons.create.responses[201], json, "academic.lessons.create");
    },
    onSuccess: async (_data, vars) => {
      const weekId = (vars as any).weekId as number;
      await qc.invalidateQueries({ queryKey: [api.academic.lessons.listByWeek.path, weekId] });
    },
  });
}

export function useOutcomesByLesson(lessonId: number | null) {
  return useQuery({
    enabled: typeof lessonId === "number",
    queryKey: [api.academic.outcomes.listByLesson.path, lessonId],
    queryFn: async () => {
      const url = buildUrl(api.academic.outcomes.listByLesson.path, { lessonId: lessonId as number });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 404) {
          const json = await readJson(res);
          const err = parseWithLogging(api.academic.outcomes.listByLesson.responses[404], json, "academic.outcomes.listByLesson.404");
          throw new Error(err.message);
        }
        throw new Error("Failed to fetch outcomes");
      }
      const json = await readJson(res);
      return parseWithLogging(api.academic.outcomes.listByLesson.responses[200], json, "academic.outcomes.listByLesson");
    },
  });
}

export function useCreateOutcome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lessonId, ...input }: { lessonId: number } & Omit<CreateOutcomeRequest, "lessonId">) => {
      const validated = api.academic.outcomes.create.input.parse(input);
      const url = buildUrl(api.academic.outcomes.create.path, { lessonId });
      const res = await fetch(url, {
        method: api.academic.outcomes.create.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(validated),
      });
      if (!res.ok) {
        if (res.status === 400) {
          const json = await readJson(res);
          const err = parseWithLogging(api.academic.outcomes.create.responses[400], json, "academic.outcomes.create.400");
          throw new Error(err.message);
        }
        if (res.status === 404) {
          const json = await readJson(res);
          const err = parseWithLogging(api.academic.outcomes.create.responses[404], json, "academic.outcomes.create.404");
          throw new Error(err.message);
        }
        throw new Error("Failed to create outcome");
      }
      const json = await readJson(res);
      return parseWithLogging(api.academic.outcomes.create.responses[201], json, "academic.outcomes.create");
    },
    onSuccess: async (_data, vars) => {
      const lessonId = (vars as any).lessonId as number;
      await qc.invalidateQueries({ queryKey: [api.academic.outcomes.listByLesson.path, lessonId] });
    },
  });
}
