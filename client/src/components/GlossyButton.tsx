import { cn } from "@/lib/utils";

interface GlossyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  size?: "default" | "sm";
  fullWidth?: boolean;
}

export default function GlossyButton({
  children,
  className,
  size = "default",
  fullWidth = false,
  disabled,
  ...props
}: GlossyButtonProps) {
  return (
    <button
      className={cn(
        "glossy-btn",
        size === "sm" && "glossy-btn-sm",
        fullWidth && "glossy-btn-full",
        className,
      )}
      disabled={disabled}
      {...props}
    >
      <div className="glossy-blob" />
      <div className="glossy-inner">{children}</div>
    </button>
  );
}
