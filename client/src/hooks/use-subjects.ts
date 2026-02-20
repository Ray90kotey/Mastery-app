import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { parseWithLogging, readJson } from "@/hooks/use-api-helpers";

export function useSubjects() {
  return useQuery({
    queryKey: [api.subjects.list.path],
    queryFn: async () => {
      const res = await fetch(api.subjects.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch subjects");
      const json = await readJson(res);
      return parseWithLogging(api.subjects.list.responses[200], json, "subjects.list");
    },
  });
}

export function useCreateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(api.subjects.list.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create subject");
      return await readJson(res);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [api.subjects.list.path] }),
  });
}

export function useClassSubjects(classId: number | null) {
  return useQuery({
    enabled: !!classId,
    queryKey: [api.classSubjects.list.path, classId],
    queryFn: async () => {
      const url = buildUrl(api.classSubjects.list.path, { classId: classId! });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch class subjects");
      const json = await readJson(res);
      return parseWithLogging(api.classSubjects.list.responses[200], json, "classSubjects.list");
    },
  });
}

export function useAssignSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ classId, subjectId, academicYearId }: { classId: number; subjectId: number; academicYearId: number }) => {
      const url = buildUrl(api.classSubjects.assign.path, { classId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, academicYearId }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to assign subject");
      return await readJson(res);
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: [api.classSubjects.list.path, vars.classId] }),
  });
}
