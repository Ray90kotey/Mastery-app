import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type {
  CreateAssessmentRequest,
  UpdateAssessmentRequest,
} from "@shared/schema";
import { parseWithLogging, readJson } from "@/hooks/use-api-helpers";

export function useAssessmentsByClass(classId: number | null) {
  return useQuery({
    enabled: typeof classId === "number",
    queryKey: [api.assessments.listByClass.path, classId],
    queryFn: async () => {
      const url = buildUrl(api.assessments.listByClass.path, { classId: classId as number });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 404) {
          const json = await readJson(res);
          const err = parseWithLogging(api.assessments.listByClass.responses[404], json, "assessments.listByClass.404");
          throw new Error(err.message);
        }
        throw new Error("Failed to fetch assessments");
      }
      const json = await readJson(res);
      return parseWithLogging(api.assessments.listByClass.responses[200], json, "assessments.listByClass");
    },
  });
}

export function useCreateAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      classId,
      ...input
    }: { classId: number } & Omit<CreateAssessmentRequest, "classId">) => {
      const validated = api.assessments.create.input.parse(input);
      const url = buildUrl(api.assessments.create.path, { classId });
      const res = await fetch(url, {
        method: api.assessments.create.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const json = await readJson(res);
          const err = parseWithLogging(api.assessments.create.responses[400], json, "assessments.create.400");
          throw new Error(err.message);
        }
        if (res.status === 404) {
          const json = await readJson(res);
          const err = parseWithLogging(api.assessments.create.responses[404], json, "assessments.create.404");
          throw new Error(err.message);
        }
        throw new Error("Failed to create assessment");
      }

      const json = await readJson(res);
      return parseWithLogging(api.assessments.create.responses[201], json, "assessments.create");
    },
    onSuccess: async (_data, vars) => {
      const classId = (vars as any).classId as number;
      await qc.invalidateQueries({ queryKey: [api.assessments.listByClass.path, classId] });
    },
  });
}

export function useUpdateAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateAssessmentRequest) => {
      const validated = api.assessments.update.input.parse(updates);
      const url = buildUrl(api.assessments.update.path, { id });
      const res = await fetch(url, {
        method: api.assessments.update.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const json = await readJson(res);
          const err = parseWithLogging(api.assessments.update.responses[400], json, "assessments.update.400");
          throw new Error(err.message);
        }
        if (res.status === 404) {
          const json = await readJson(res);
          const err = parseWithLogging(api.assessments.update.responses[404], json, "assessments.update.404");
          throw new Error(err.message);
        }
        throw new Error("Failed to update assessment");
      }

      const json = await readJson(res);
      return parseWithLogging(api.assessments.update.responses[200], json, "assessments.update");
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [api.assessments.listByClass.path] });
    },
  });
}

export function useDeleteAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.assessments.delete.path, { id });
      const res = await fetch(url, { method: api.assessments.delete.method, credentials: "include" });

      if (!res.ok) {
        if (res.status === 404) {
          const json = await readJson(res);
          const err = parseWithLogging(api.assessments.delete.responses[404], json, "assessments.delete.404");
          throw new Error(err.message);
        }
        throw new Error("Failed to delete assessment");
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [api.assessments.listByClass.path] });
    },
  });
}
