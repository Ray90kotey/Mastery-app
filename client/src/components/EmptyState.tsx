import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function EmptyState(props: {
  icon: ReactNode;
  title: string;
  description?: string;
  primaryAction?: { label: string; onClick: () => void; testId: string };
  secondaryAction?: { label: string; onClick: () => void; testId: string };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 bg-card/60 p-6 sm:p-8 text-center shadow-sm",
        props.className,
      )}
      data-testid="empty-state"
    >
      <div className="mx-auto w-12 h-12 rounded-2xl bg-muted grid place-items-center text-muted-foreground">
        {props.icon}
      </div>
      <h3 className="mt-4 text-lg font-bold">{props.title}</h3>
      {props.description ? (
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
          {props.description}
        </p>
      ) : null}

      {(props.primaryAction || props.secondaryAction) && (
        <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
          {props.primaryAction ? (
            <Button
              onClick={props.primaryAction.onClick}
              data-testid={props.primaryAction.testId}
              className="rounded-xl shadow-sm hover:shadow-md transition-all"
            >
              {props.primaryAction.label}
            </Button>
          ) : null}
          {props.secondaryAction ? (
            <Button
              variant="secondary"
              onClick={props.secondaryAction.onClick}
              data-testid={props.secondaryAction.testId}
              className="rounded-xl"
            >
              {props.secondaryAction.label}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
