import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { UpsertTeacherSettingsRequest } from "@shared/schema";
import { parseWithLogging, readJson } from "@/hooks/use-api-helpers";

export function useSettings() {
  return useQuery({
    queryKey: [api.settings.get.path],
    queryFn: async () => {
      const res = await fetch(api.settings.get.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch settings");
      const json = await readJson(res);
      return parseWithLogging(api.settings.get.responses[200], json, "settings.get");
    },
  });
}

export function useUpsertSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpsertTeacherSettingsRequest) => {
      const validated = api.settings.upsert.input.parse(input);
      const res = await fetch(api.settings.upsert.path, {
        method: api.settings.upsert.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const json = await readJson(res);
          const err = parseWithLogging(
            api.settings.upsert.responses[400],
            json,
            "settings.upsert.400",
          );
          throw new Error(err.message);
        }
        throw new Error("Failed to save settings");
      }

      const json = await readJson(res);
      return parseWithLogging(api.settings.upsert.responses[200], json, "settings.upsert");
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [api.settings.get.path] });
    },
  });
}
