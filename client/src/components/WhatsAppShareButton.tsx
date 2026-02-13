import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

function buildWhatsAppUrl(message: string) {
  const base = "https://wa.me/";
  const url = `${base}?text=${encodeURIComponent(message)}`;
  return url;
}

export default function WhatsAppShareButton(props: {
  message: string;
  label?: string;
  testId: string;
  variant?: "default" | "secondary";
}) {
  return (
    <Button
      variant={props.variant ?? "default"}
      onClick={() => {
        const url = buildWhatsAppUrl(props.message);
        window.open(url, "_blank", "noopener,noreferrer");
      }}
      data-testid={props.testId}
      className="rounded-xl shadow-sm hover:shadow-md transition-all"
    >
      <MessageCircle className="h-4.5 w-4.5 mr-2" />
      {props.label ?? "Share via WhatsApp"}
    </Button>
  );
}
