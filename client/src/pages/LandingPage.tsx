import Meta from "@/components/Meta";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, CheckCircle2, ClipboardList, GraduationCap, LineChart, Shield, Users } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen app-surface">
      <Meta
        title="Mastery — Student progress, made simple"
        description="Track mastery, enter assessment scores, and share student reports with families via WhatsApp."
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <header className="flex items-center justify-between gap-4 animate-in-up">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-2xl bg-primary relative shadow-premium">
              <Check className="h-5 w-5 text-primary-foreground absolute top-1.5 left-1.5" />
              <GraduationCap className="h-6 w-6 text-primary-foreground absolute bottom-1.5 right-1.5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Education SaaS</p>
              <h1 className="text-xl sm:text-2xl font-bold leading-none">
                Mastery
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => (window.location.href = "/api/login")}
              data-testid="landing-login-secondary"
              className="rounded-xl"
            >
              Log in
            </Button>
            <Button
              onClick={() => (window.location.href = "/api/login")}
              data-testid="landing-login-primary"
              className="rounded-xl shadow-sm hover:shadow-md transition-all bg-primary"
            >
              Get started
            </Button>
          </div>
        </header>

        <main className="mt-8 sm:mt-10 grid grid-cols-1 lg:grid-cols-[1.15fr_.85fr] gap-6 lg:gap-8 items-start">
          <section className="glass grain-overlay rounded-3xl p-6 sm:p-8 shadow-premium border border-border/60 animate-in-up">
            <p className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Built for busy teachers • Mobile-first
            </p>

            <h2 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-[1.05] text-balance">
              Turn assessment scores into clear mastery — and share it in seconds.
            </h2>

            <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl">
              Enter scores, track strengths and support needs, then generate a clean PDF report for families.
              Sharing via WhatsApp is built in, because that’s how communication actually works.
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-primary/10 grid place-items-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Class-ready</p>
                    <p className="text-xs text-muted-foreground">Students & parents</p>
                  </div>
                </div>
              </Card>

              <Card className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-accent/10 grid place-items-center">
                    <ClipboardList className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Assessments</p>
                    <p className="text-xs text-muted-foreground">Bulk score entry</p>
                  </div>
                </div>
              </Card>

              <Card className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-chart-3/10 grid place-items-center">
                    <LineChart className="h-5 w-5 text-[hsl(var(--chart-3))]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Mastery</p>
                    <p className="text-xs text-muted-foreground">Trends + insights</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => (window.location.href = "/api/login")}
                data-testid="landing-cta"
                className="rounded-xl shadow-sm hover:shadow-md transition-all bg-primary"
              >
                Log in to your workspace
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  const el = document.getElementById("features");
                  el?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                data-testid="landing-scroll-features"
                className="rounded-xl"
              >
                See features
              </Button>
            </div>

            <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                "Free to start • No credit card required",
                "Share reports with families on WhatsApp",
                "Designed for low-bandwidth, mobile-first use",
                "Clear mastery bands, not confusing spreadsheets",
              ].map((t) => (
                <div key={t} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4.5 w-4.5 text-primary mt-0.5" />
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </section>

          <section id="features" className="space-y-4 animate-in-up">
            <Card className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-premium">
              <h3 className="text-lg font-bold">What you can do</h3>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <p>
                  <span className="font-semibold text-foreground">Classes</span>: add students, keep parent contacts.
                </p>
                <p>
                  <span className="font-semibold text-foreground">Academic setup</span>: structure your year → term → week → lessons → outcomes.
                </p>
                <p>
                  <span className="font-semibold text-foreground">Assessments</span>: record scores quickly and consistently.
                </p>
                <p>
                  <span className="font-semibold text-foreground">Reports</span>: generate a PDF and share instantly.
                </p>
              </div>
            </Card>

            <Card className="rounded-3xl border border-border/70 bg-secondary p-6 shadow-premium">
              <h3 className="text-lg font-bold">A workflow that feels calm</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Minimal clicks. Clear labels. Strong contrast. Everything tuned for real classrooms.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
                  <p className="text-xs text-muted-foreground">Fast entry</p>
                  <p className="mt-1 font-semibold">Scores in bulk</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
                  <p className="text-xs text-muted-foreground">Sharing</p>
                  <p className="mt-1 font-semibold">WhatsApp-ready</p>
                </div>
              </div>
            </Card>
          </section>
        </main>

        <footer className="mt-10 sm:mt-12 text-xs text-muted-foreground flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <p data-testid="landing-footer">
            © {new Date().getFullYear()} Mastery. Designed for modern classrooms.
          </p>
          <Button
            variant="ghost"
            onClick={() => (window.location.href = "/api/login")}
            data-testid="landing-footer-login"
            className="justify-start sm:justify-center rounded-xl"
          >
            Log in
          </Button>
        </footer>
      </div>
    </div>
  );
}
