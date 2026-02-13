import Meta from "@/components/Meta";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, FileQuestion } from "lucide-react";

export default function NotFoundPremium() {
  return (
    <div className="min-h-screen app-surface grid place-items-center px-4 py-10">
      <Meta
        title="Page not found • Mastery"
        description="The page you are looking for does not exist."
      />
      <Card className="glass grain-overlay rounded-3xl shadow-premium border border-border/60 p-6 sm:p-8 max-w-lg w-full">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-muted grid place-items-center">
            <FileQuestion className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold">Page not found</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The link may be broken, or the page was moved.
            </p>
            <div className="mt-5 flex flex-col sm:flex-row gap-2">
              <Link href="/" className="w-full sm:w-auto">
                <Button className="w-full rounded-xl shadow-sm hover:shadow-md transition-all" data-testid="404-go-home">
                  <ArrowLeft className="h-4.5 w-4.5 mr-2" />
                  Back to home
                </Button>
              </Link>
              <Link href="/app" className="w-full sm:w-auto">
                <Button variant="secondary" className="w-full rounded-xl" data-testid="404-go-app">
                  Go to dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
