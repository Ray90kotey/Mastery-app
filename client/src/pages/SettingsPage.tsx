import { useEffect, useState } from "react";
import Meta from "@/components/Meta";
import AppShell from "@/components/AppShell";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError, redirectToLogin } from "@/lib/auth-utils";
import { useSettings, useUpsertSettings } from "@/hooks/use-settings";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Save } from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();
  const settingsQ = useSettings();
  const upsert = useUpsertSettings();

  const [schoolName, setSchoolName] = useState("");

  useEffect(() => {
    if (settingsQ.data?.schoolName !== undefined) {
      setSchoolName(settingsQ.data.schoolName ?? "");
    }
  }, [settingsQ.data?.schoolName]);

  return (
    <AppShell>
      <Meta
        title="Settings • Mastery"
        description="Configure your school name and workspace settings."
      />

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Workspace</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold">Settings</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            Keep your school name consistent across reports and exports.
          </p>
        </div>
      </div>

      <Separator className="my-6" />

      <Card className="rounded-3xl border border-border/70 bg-card/70 p-5 sm:p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-2xl bg-primary/10 grid place-items-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="font-extrabold text-lg">School profile</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This name appears on reports and helps families recognize your school.
            </p>
          </div>
        </div>

        <Separator className="my-5" />

        {settingsQ.isLoading ? (
          <div className="space-y-3" data-testid="settings-loading">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
        ) : settingsQ.isError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm" data-testid="settings-error">
            <p className="font-semibold text-destructive">Failed to load settings</p>
            <p className="mt-1 text-muted-foreground">{(settingsQ.error as any)?.message ?? "Try again."}</p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="settings-form">
            <div className="space-y-2">
              <Label htmlFor="schoolName">School name</Label>
              <Input
                id="schoolName"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="e.g., Asokwa Primary School"
                className="rounded-xl bg-background/70"
                data-testid="settings-schoolname"
              />
              <p className="text-xs text-muted-foreground">
                Tip: Use the official name used by parents.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <Button
                onClick={async () => {
                  try {
                    await upsert.mutateAsync({
                      teacherId: "me",
                      schoolName: schoolName.trim(),
                    } as any);
                    toast({ title: "Settings saved" });
                  } catch (e: any) {
                    if (isUnauthorizedError(e)) return redirectToLogin(toast as any);
                    toast({ title: "Could not save settings", description: e?.message ?? "Try again", variant: "destructive" });
                  }
                }}
                disabled={upsert.isPending}
                data-testid="settings-save"
                className="rounded-xl shadow-sm hover:shadow-md transition-all"
              >
                <Save className="h-4.5 w-4.5 mr-2" />
                {upsert.isPending ? "Saving..." : "Save"}
              </Button>

              <Button
                variant="secondary"
                onClick={() => setSchoolName(settingsQ.data?.schoolName ?? "")}
                data-testid="settings-reset"
                className="rounded-xl"
              >
                Reset
              </Button>
            </div>
          </div>
        )}
      </Card>
    </AppShell>
  );
}
