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
import { Building2, Save, Upload, X } from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();
  const settingsQ = useSettings();
  const upsert = useUpsertSettings();

  const [schoolName, setSchoolName] = useState("");
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
  const [handwrittenSignature, setHandwrittenSignature] = useState<string | null>(null);

  useEffect(() => {
    if (settingsQ.data) {
      setSchoolName(settingsQ.data.schoolName ?? "");
      setSchoolLogo(settingsQ.data.schoolLogo ?? null);
      setHandwrittenSignature(settingsQ.data.handwrittenSignature ?? null);
    }
  }, [settingsQ.data]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string | null) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) { // 1MB limit
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 1MB.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setter(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <AppShell>
      <Meta
        title="Settings • Mastery"
        description="Configure your school profile and report customization."
      />

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Workspace</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold">Settings</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            Customize how your school and reports appear to parents and students.
          </p>
        </div>
      </div>

      <Separator className="my-6" />

      <div className="grid grid-cols-1 gap-6">
        <Card className="rounded-3xl border border-border/70 bg-card/70 p-5 sm:p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-2xl bg-primary/10 grid place-items-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="font-extrabold text-lg">School Profile & Reports</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Customize the branding and authenticity of your generated reports.
              </p>
            </div>
          </div>

          <Separator className="my-5" />

          {settingsQ.isLoading ? (
            <div className="space-y-6" data-testid="settings-loading">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : settingsQ.isError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm" data-testid="settings-error">
              <p className="font-semibold text-destructive">Failed to load settings</p>
              <p className="mt-1 text-muted-foreground">{(settingsQ.error as any)?.message ?? "Try again."}</p>
            </div>
          ) : (
            <div className="space-y-6" data-testid="settings-form">
              <div className="space-y-2">
                <Label htmlFor="schoolName">School Name</Label>
                <Input
                  id="schoolName"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="e.g., Asokwa Primary School"
                  className="rounded-xl bg-background/70"
                  data-testid="settings-schoolname"
                />
                <p className="text-xs text-muted-foreground">
                  Appears as the main header on all reports.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label>School Logo</Label>
                  <div className="flex flex-col items-center gap-4 p-4 rounded-2xl border border-dashed border-border/70 bg-muted/20">
                    {schoolLogo ? (
                      <div className="relative group">
                        <img src={schoolLogo} alt="School Logo" className="h-24 w-24 object-contain rounded-xl bg-white shadow-sm" />
                        <button 
                          onClick={() => setSchoolLogo(null)}
                          className="absolute -top-2 -right-2 p-1 bg-destructive text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="h-24 w-24 rounded-2xl bg-muted/40 grid place-items-center">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="text-center">
                      <Button variant="outline" size="sm" className="rounded-xl relative">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Logo
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="absolute inset-0 opacity-0 cursor-pointer" 
                          onChange={(e) => handleFileUpload(e, setSchoolLogo)}
                        />
                      </Button>
                      <p className="mt-2 text-[10px] text-muted-foreground">Recommended: Square PNG/JPG, max 1MB</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Handwritten Signature</Label>
                  <div className="flex flex-col items-center gap-4 p-4 rounded-2xl border border-dashed border-border/70 bg-muted/20">
                    {handwrittenSignature ? (
                      <div className="relative group">
                        <img src={handwrittenSignature} alt="Signature" className="h-24 w-48 object-contain rounded-xl bg-white shadow-sm" />
                        <button 
                          onClick={() => setHandwrittenSignature(null)}
                          className="absolute -top-2 -right-2 p-1 bg-destructive text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="h-24 w-48 rounded-2xl bg-muted/40 grid place-items-center">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="text-center">
                      <Button variant="outline" size="sm" className="rounded-xl relative">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Signature
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="absolute inset-0 opacity-0 cursor-pointer" 
                          onChange={(e) => handleFileUpload(e, setHandwrittenSignature)}
                        />
                      </Button>
                      <p className="mt-2 text-[10px] text-muted-foreground">Upload a clear photo of your signature on white paper.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:items-center pt-2">
                <Button
                  onClick={async () => {
                    try {
                      await upsert.mutateAsync({
                        teacherId: "me",
                        schoolName: schoolName.trim(),
                        schoolLogo: schoolLogo,
                        handwrittenSignature: handwrittenSignature,
                      } as any);
                      toast({ title: "Settings saved successfully" });
                    } catch (e: any) {
                      if (isUnauthorizedError(e)) return redirectToLogin(toast as any);
                      toast({ title: "Could not save settings", description: e?.message ?? "Try again", variant: "destructive" });
                    }
                  }}
                  disabled={upsert.isPending}
                  data-testid="settings-save"
                  className="rounded-xl shadow-sm hover:shadow-md transition-all h-11"
                >
                  <Save className="h-4.5 w-4.5 mr-2" />
                  {upsert.isPending ? "Saving Changes..." : "Save All Settings"}
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => {
                    setSchoolName(settingsQ.data?.schoolName ?? "");
                    setSchoolLogo(settingsQ.data?.schoolLogo ?? null);
                    setHandwrittenSignature(settingsQ.data?.handwrittenSignature ?? null);
                  }}
                  data-testid="settings-reset"
                  className="rounded-xl h-11"
                >
                  Discard Changes
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
