import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { CreateClassRequest, UpdateClassRequest } from "@shared/schema";
import { parseWithLogging, readJson } from "@/hooks/use-api-helpers";

export function useClasses() {
  return useQuery({
    queryKey: [api.classes.list.path],
    queryFn: async () => {
      const res = await fetch(api.classes.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch classes");
      const json = await readJson(res);
      return parseWithLogging(api.classes.list.responses[200], json, "classes.list");
    },
  });
}

export function useCreateClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateClassRequest) => {
      const validated = api.classes.create.input.parse(input);
      const res = await fetch(api.classes.create.path, {
        method: api.classes.create.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const json = await readJson(res);
          const err = parseWithLogging(
            api.classes.create.responses[400],
            json,
            "classes.create.400",
          );
          throw new Error(err.message);
        }
        throw new Error("Failed to create class");
      }

      const json = await readJson(res);
      return parseWithLogging(api.classes.create.responses[201], json, "classes.create");
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [api.classes.list.path] });
    },
  });
}

export function useUpdateClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateClassRequest) => {
      const validated = api.classes.update.input.parse(updates);
      const url = buildUrl(api.classes.update.path, { id });
      const res = await fetch(url, {
        method: api.classes.update.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const json = await readJson(res);
          const err = parseWithLogging(
            api.classes.update.responses[400],
            json,
            "classes.update.400",
          );
          throw new Error(err.message);
        }
        if (res.status === 404) {
          const json = await readJson(res);
          const err = parseWithLogging(
            api.classes.update.responses[404],
            json,
            "classes.update.404",
          );
          throw new Error(err.message);
        }
        throw new Error("Failed to update class");
      }

      const json = await readJson(res);
      return parseWithLogging(api.classes.update.responses[200], json, "classes.update");
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [api.classes.list.path] });
    },
  });
}

export function useDeleteClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.classes.delete.path, { id });
      const res = await fetch(url, {
        method: api.classes.delete.method,
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 404) {
          const json = await readJson(res);
          const err = parseWithLogging(
            api.classes.delete.responses[404],
            json,
            "classes.delete.404",
          );
          throw new Error(err.message);
        }
        throw new Error("Failed to delete class");
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [api.classes.list.path] });
    },
  });
}
