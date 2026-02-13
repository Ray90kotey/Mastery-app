import { useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { parseWithLogging, readJson } from "@/hooks/use-api-helpers";

export function useGenerateStudentReport() {
  return useMutation({
    mutationFn: async (input: { studentId: number; termId?: number }) => {
      const url = buildUrl(api.reports.generateStudent.path, { id: input.studentId });
      const validated = api.reports.generateStudent.input.parse({ termId: input.termId });

      const res = await fetch(url, {
        method: api.reports.generateStudent.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 404) {
          const json = await readJson(res);
          const err = parseWithLogging(api.reports.generateStudent.responses[404], json, "reports.generateStudent.404");
          throw new Error(err.message);
        }
        throw new Error("Failed to generate report");
      }

      const json = await readJson(res);
      return parseWithLogging(api.reports.generateStudent.responses[201], json, "reports.generateStudent");
    },
  });
}
