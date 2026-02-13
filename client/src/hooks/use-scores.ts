import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { CreateStudentScoreRequest } from "@shared/schema";
import { parseWithLogging, readJson } from "@/hooks/use-api-helpers";

export function useUpsertScores() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      assessmentId,
      scores,
    }: {
      assessmentId: number;
      scores: Array<Omit<CreateStudentScoreRequest, "assessmentId">>;
    }) => {
      const validated = api.scores.upsert.input.parse({ scores });
      const url = buildUrl(api.scores.upsert.path, { assessmentId });

      const res = await fetch(url, {
        method: api.scores.upsert.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const json = await readJson(res);
          const err = parseWithLogging(api.scores.upsert.responses[400], json, "scores.upsert.400");
          throw new Error(err.message);
        }
        if (res.status === 404) {
          const json = await readJson(res);
          const err = parseWithLogging(api.scores.upsert.responses[404], json, "scores.upsert.404");
          throw new Error(err.message);
        }
        throw new Error("Failed to save scores");
      }

      const json = await readJson(res);
      return parseWithLogging(api.scores.upsert.responses[200], json, "scores.upsert");
    },
    onSuccess: async () => {
      // Invalidate mastery + students lists that may show averages elsewhere
      await qc.invalidateQueries({ queryKey: [api.mastery.student.path] });
    },
  });
}
