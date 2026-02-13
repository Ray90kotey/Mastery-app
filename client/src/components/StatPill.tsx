import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function StatPill(props: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "primary" | "accent" | "muted";
  testId: string;
}) {
  const tone =
    props.tone === "accent"
      ? "border-accent/30 bg-accent/10"
      : props.tone === "muted"
        ? "border-border/70 bg-muted/40"
        : "border-primary/25 bg-primary/10";

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 shadow-sm backdrop-blur-sm",
        tone,
      )}
      data-testid={props.testId}
    >
      <div className="text-xs text-muted-foreground">{props.label}</div>
      <div className="mt-1 text-lg font-bold leading-none">{props.value}</div>
      {props.hint ? (
        <div className="mt-1 text-xs text-muted-foreground">{props.hint}</div>
      ) : null}
    </div>
  );
}
