import { useState } from "react";
import AppShell from "@/components/AppShell";
import Meta from "@/components/Meta";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSubjects, useCreateSubject } from "@/hooks/use-subjects";
import { BookOpen, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SubjectsPage() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const subjectsQ = useSubjects();
  const createSubject = useCreateSubject();

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await createSubject.mutateAsync(name.trim());
      setName("");
      toast({ title: "Subject created" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <AppShell>
      <Meta title="Subjects • Mastery" description="Manage subjects for your classes." />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold">Subjects</h1>
          <p className="text-muted-foreground mt-1">Define subjects that can be assigned to your classes.</p>
        </div>

        <Card className="p-6 rounded-3xl border-border/70 bg-card/70">
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="subjectName">Subject Name</Label>
              <Input
                id="subjectName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mathematics, Science"
                className="rounded-xl"
              />
            </div>
            <Button onClick={handleCreate} disabled={createSubject.isPending || !name.trim()} className="rounded-xl">
              {createSubject.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Add Subject
            </Button>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjectsQ.isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin mx-auto col-span-full" />
          ) : subjectsQ.data?.map((s) => (
            <Card key={s.id} className="p-4 rounded-2xl border-border/50 hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-primary" />
                <span className="font-bold text-lg">{s.name}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
