import { z } from "zod";

export function parseWithLogging<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  label: string,
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

export async function readJson(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("[HTTP] Failed to parse JSON:", text);
    throw e;
  }
}

export function toSearchParams(obj: Record<string, unknown>) {
  const params = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    params.set(k, String(v));
  });
  return params;
}
