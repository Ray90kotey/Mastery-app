import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { parseWithLogging, readJson } from "@/hooks/use-api-helpers";

export function useStudentMastery(studentId: number | null) {
  return useQuery({
    enabled: typeof studentId === "number",
    queryKey: [api.mastery.student.path, studentId],
    queryFn: async () => {
      const url = buildUrl(api.mastery.student.path, { id: studentId as number });
      const res = await fetch(url, { credentials: "include" });

      if (!res.ok) {
        if (res.status === 404) {
          const json = await readJson(res);
          const err = parseWithLogging(api.mastery.student.responses[404], json, "mastery.student.404");
          throw new Error(err.message);
        }
        throw new Error("Failed to fetch mastery");
      }

      const json = await readJson(res);
      return parseWithLogging(api.mastery.student.responses[200], json, "mastery.student");
    },
  });
}
