import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type {
  CreateStudentRequest,
  UpdateStudentRequest,
} from "@shared/schema";
import { parseWithLogging, readJson } from "@/hooks/use-api-helpers";

export function useStudentsByClass(classId: number | null) {
  return useQuery({
    enabled: typeof classId === "number",
    queryKey: [api.students.listByClass.path, classId],
    queryFn: async () => {
      const url = buildUrl(api.students.listByClass.path, { classId: classId as number });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 404) {
          const json = await readJson(res);
          const err = parseWithLogging(
            api.students.listByClass.responses[404],
            json,
            "students.listByClass.404",
          );
          throw new Error(err.message);
        }
        throw new Error("Failed to fetch students");
      }
      const json = await readJson(res);
      return parseWithLogging(api.students.listByClass.responses[200], json, "students.listByClass");
    },
  });
}

export function useCreateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      classId,
      ...input
    }: { classId: number } & Omit<CreateStudentRequest, "classId">) => {
      const validated = api.students.create.input.parse(input);
      const url = buildUrl(api.students.create.path, { classId });
      const res = await fetch(url, {
        method: api.students.create.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const json = await readJson(res);
          const err = parseWithLogging(api.students.create.responses[400], json, "students.create.400");
          throw new Error(err.message);
        }
        if (res.status === 404) {
          const json = await readJson(res);
          const err = parseWithLogging(api.students.create.responses[404], json, "students.create.404");
          throw new Error(err.message);
        }
        throw new Error("Failed to create student");
      }

      const json = await readJson(res);
      return parseWithLogging(api.students.create.responses[201], json, "students.create");
    },
    onSuccess: async (_data, vars) => {
      const classId = (vars as any).classId as number;
      await qc.invalidateQueries({ queryKey: [api.students.listByClass.path, classId] });
    },
  });
}

export function useUpdateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: { id: number } & UpdateStudentRequest) => {
      const validated = api.students.update.input.parse(updates);
      const url = buildUrl(api.students.update.path, { id });
      const res = await fetch(url, {
        method: api.students.update.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const json = await readJson(res);
          const err = parseWithLogging(api.students.update.responses[400], json, "students.update.400");
          throw new Error(err.message);
        }
        if (res.status === 404) {
          const json = await readJson(res);
          const err = parseWithLogging(api.students.update.responses[404], json, "students.update.404");
          throw new Error(err.message);
        }
        throw new Error("Failed to update student");
      }

      const json = await readJson(res);
      return parseWithLogging(api.students.update.responses[200], json, "students.update");
    },
    onSuccess: async () => {
      // Conservative invalidate: students lists are keyed by (path, classId)
      await qc.invalidateQueries({ queryKey: [api.students.listByClass.path] });
    },
  });
}

export function useDeleteStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.students.delete.path, { id });
      const res = await fetch(url, {
        method: api.students.delete.method,
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 404) {
          const json = await readJson(res);
          const err = parseWithLogging(api.students.delete.responses[404], json, "students.delete.404");
          throw new Error(err.message);
        }
        throw new Error("Failed to delete student");
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [api.students.listByClass.path] });
    },
  });
}
