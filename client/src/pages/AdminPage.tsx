import { useState } from "react";
import AppShell from "@/components/AppShell";
import { useMySchool, useSchoolMembers, useSchoolInvitations, useCreateInvitation, useDeleteInvitation, useRemoveMember, useSchoolOverview, useClassesMastery } from "@/hooks/use-school";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowUpDown, Copy, Link2, Plus, Trash2, UserMinus, Users, School, BarChart3, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import type { SchoolRole } from "@shared/schema";

function roleBadge(role: SchoolRole) {
  const map: Record<SchoolRole, { label: string; className: string }> = {
    admin: { label: "Admin", className: "bg-primary/10 text-primary border-primary/20" },
    school_head: { label: "School Head", className: "bg-accent/10 text-amber-700 border-accent/20" },
    teacher: { label: "Teacher", className: "bg-blue-50 text-blue-700 border-blue-200" },
    student: { label: "Student", className: "bg-green-50 text-green-700 border-green-200" },
  };
  const { label, className } = map[role] ?? { label: role, className: "" };
  return <Badge variant="outline" className={className}>{label}</Badge>;
}

function userInitials(firstName?: string | null, lastName?: string | null, email?: string | null) {
  const raw = [firstName, lastName].filter(Boolean).join(" ").trim() || (email?.split("@")[0] ?? "?");
  const parts = raw.split(" ");
  return (parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "");
}

export default function AdminPage() {
  const { user } = useAuth();
  const { data: mySchool, isLoading: schoolLoading } = useMySchool();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const isAdminRole = mySchool?.role === "admin";
  const isHeadRole = mySchool?.role === "school_head";

  const [sortCol, setSortCol] = useState<"className" | "studentCount" | "avgScore">("avgScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data: members, isLoading: membersLoading } = useSchoolMembers(!schoolLoading && (isAdminRole || isHeadRole));
  const { data: invitations, isLoading: invLoading } = useSchoolInvitations(!schoolLoading && isAdminRole);
  const { data: overview } = useSchoolOverview(!schoolLoading && (isAdminRole || isHeadRole));
  const { data: classesMastery, isLoading: masteryLoading } = useClassesMastery(!schoolLoading && (isAdminRole || isHeadRole));

  const createInv = useCreateInvitation();
  const deleteInv = useDeleteInvitation();
  const removeMember = useRemoveMember();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<string>("teacher");
  const [inviteeName, setInviteeName] = useState("");

  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  if (schoolLoading) {
    return (
      <AppShell>
        <div className="space-y-4 p-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
        </div>
      </AppShell>
    );
  }

  if (!mySchool) {
    setLocation("/app");
    return null;
  }

  if (mySchool.role !== "admin" && mySchool.role !== "school_head") {
    setLocation("/app");
    return null;
  }

  function inviteLink(token: string) {
    return `${window.location.origin}/invite/${token}`;
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(inviteLink(token)).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
      toast({ title: "Link copied!", description: "Share this link with the person you are inviting." });
    });
  }

  async function handleCreateInvite() {
    if (!inviteRole) return;
    await createInv.mutateAsync({ role: inviteRole, inviteeName: inviteeName.trim() || undefined });
    setInviteOpen(false);
    setInviteeName("");
    setInviteRole("teacher");
    toast({ title: "Invitation created", description: "Copy the link and share it with the person." });
  }

  async function handleDeleteInv(id: number) {
    await deleteInv.mutateAsync(id);
    toast({ title: "Invitation deleted" });
  }

  async function handleRemoveMember(userId: string, name: string) {
    await removeMember.mutateAsync(userId);
    toast({ title: `${name} removed from school` });
  }

  const pendingInvs = (invitations ?? []).filter((i) => i.used === "no");
  const usedInvs = (invitations ?? []).filter((i) => i.used === "yes");

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
              {mySchool.school.name}
            </h1>
            <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1.5">
              {roleBadge(mySchool.role)}
              <span>·</span>
              <School className="h-3.5 w-3.5" /> School Administration
            </p>
          </div>
          {isAdminRole && (
            <Button onClick={() => setInviteOpen(true)} data-testid="button-invite-user" className="gap-2">
              <Plus className="h-4 w-4" />
              Invite Someone
            </Button>
          )}
        </div>

        {/* Stats */}
        {overview && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Members", value: overview.memberCount, icon: Users },
              { label: "Teachers", value: overview.teacherCount, icon: Users },
              { label: "Classes", value: overview.totalClasses, icon: BarChart3 },
              { label: "Students", value: overview.totalStudents, icon: BarChart3 },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border/70 bg-card p-4">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold mt-1" style={{ fontFamily: "var(--font-display)" }}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Members */}
        <section>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Members ({members?.length ?? 0})
          </h2>
          <div className="divide-y divide-border/60 rounded-xl border border-border/70 overflow-hidden bg-card">
            {membersLoading
              ? [1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))
              : members?.map((m) => {
                  const name = [m.firstName, m.lastName].filter(Boolean).join(" ").trim() || m.email || m.userId.slice(0, 8);
                  const isMe = m.userId === user?.id;
                  return (
                    <div key={m.id} className="flex items-center gap-3 p-4" data-testid={`row-member-${m.id}`}>
                      <Avatar className="h-10 w-10 border border-border/60">
                        <AvatarImage src={m.profileImageUrl ?? undefined} alt={name} />
                        <AvatarFallback className="bg-muted text-xs">
                          {userInitials(m.firstName, m.lastName, m.email).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {name} {isMe && <span className="text-muted-foreground text-xs">(you)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{m.email ?? "No email"}</p>
                        {m.studentName && (
                          <p className="text-xs text-muted-foreground">Student: {m.studentName}</p>
                        )}
                      </div>
                      {roleBadge(m.role as SchoolRole)}
                      {isAdminRole && !isMe && m.role !== "admin" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveMember(m.userId, name)}
                          data-testid={`button-remove-member-${m.id}`}
                          title="Remove member"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
          </div>
        </section>

        {/* Invitations (admin only) */}
        {isAdminRole && (
          <section>
            <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              Pending Invitations ({pendingInvs.length})
            </h2>
            {invLoading ? (
              <Skeleton className="h-24 w-full rounded-xl" />
            ) : pendingInvs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center border border-border/70 rounded-xl bg-card">
                No pending invitations. Click "Invite Someone" to create one.
              </p>
            ) : (
              <div className="divide-y divide-border/60 rounded-xl border border-border/70 overflow-hidden bg-card">
                {pendingInvs.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-3 p-4" data-testid={`row-invitation-${inv.id}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {inv.inviteeName || `Unnamed ${inv.role}`}
                      </p>
                      <p className="text-xs text-muted-foreground">Role: {inv.role} · Created {new Date(inv.createdAt).toLocaleDateString()}</p>
                    </div>
                    {roleBadge(inv.role as SchoolRole)}
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 shrink-0"
                      onClick={() => copyLink(inv.token)}
                      data-testid={`button-copy-invite-${inv.id}`}
                    >
                      {copiedToken === inv.token ? (
                        <><CheckCircle className="h-3.5 w-3.5 text-green-600" /> Copied</>
                      ) : (
                        <><Copy className="h-3.5 w-3.5" /> Copy Link</>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => handleDeleteInv(inv.id)}
                      data-testid={`button-delete-invite-${inv.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {usedInvs.length > 0 && (
              <details className="mt-3">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  Show {usedInvs.length} used invitation{usedInvs.length !== 1 ? "s" : ""}
                </summary>
                <div className="mt-2 divide-y divide-border/60 rounded-xl border border-border/70 overflow-hidden bg-muted/30">
                  {usedInvs.map((inv) => (
                    <div key={inv.id} className="flex items-center gap-3 p-3 opacity-60">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{inv.inviteeName || `Unnamed ${inv.role}`}</p>
                        <p className="text-xs text-muted-foreground">Used · {inv.role}</p>
                      </div>
                      {roleBadge(inv.role as SchoolRole)}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </section>
        )}

        {/* T3: Class Comparison Table */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Class Comparison
            </h2>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowUpDown className="h-3 w-3" />
              Click column headers to sort
            </div>
          </div>

          {masteryLoading ? (
            <Skeleton className="h-40 w-full rounded-xl" />
          ) : !classesMastery || classesMastery.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center border border-border/70 rounded-xl bg-card">
              No classes found. Teachers need to create classes first.
            </p>
          ) : (() => {
            const sorted = [...classesMastery].sort((a, b) => {
              const va = a[sortCol] ?? 0;
              const vb = b[sortCol] ?? 0;
              if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
              return sortDir === "asc" ? va - vb : vb - va;
            });
            const toggleSort = (col: typeof sortCol) => {
              if (sortCol === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
              else { setSortCol(col); setSortDir("desc"); }
            };
            const bandColors: Record<string, string> = {
              Mastered: "bg-emerald-500",
              Proficient: "bg-blue-500",
              Developing: "bg-amber-400",
              "Needs Support": "bg-rose-500",
              "No Data": "bg-muted",
            };
            return (
              <div className="rounded-xl border border-border/70 overflow-hidden bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30">
                      <th
                        className="text-left px-4 py-3 font-semibold text-xs cursor-pointer hover:text-primary select-none"
                        onClick={() => toggleSort("className")}
                        data-testid="sort-classname"
                      >
                        Class {sortCol === "className" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                      </th>
                      <th
                        className="text-center px-3 py-3 font-semibold text-xs cursor-pointer hover:text-primary select-none"
                        onClick={() => toggleSort("studentCount")}
                        data-testid="sort-students"
                      >
                        Students {sortCol === "studentCount" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                      </th>
                      <th
                        className="text-center px-3 py-3 font-semibold text-xs cursor-pointer hover:text-primary select-none"
                        onClick={() => toggleSort("avgScore")}
                        data-testid="sort-avgscore"
                      >
                        Avg Score {sortCol === "avgScore" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                      </th>
                      <th className="px-4 py-3 font-semibold text-xs text-left">Band Distribution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {sorted.map((cls) => {
                      const total = cls.studentCount || 1;
                      const avgPct = cls.avgScore;
                      const bandColor =
                        avgPct >= 85 ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                        : avgPct >= 70 ? "text-blue-700 bg-blue-50 border-blue-200"
                        : avgPct >= 50 ? "text-amber-700 bg-amber-50 border-amber-200"
                        : cls.assessmentCount === 0 ? "text-muted-foreground bg-muted border-border"
                        : "text-rose-700 bg-rose-50 border-rose-200";
                      return (
                        <tr key={cls.classId} className="hover:bg-muted/20 transition-colors" data-testid={`row-class-mastery-${cls.classId}`}>
                          <td className="px-4 py-3 font-medium">{cls.className}</td>
                          <td className="px-3 py-3 text-center text-muted-foreground">{cls.studentCount}</td>
                          <td className="px-3 py-3 text-center">
                            {cls.assessmentCount === 0 ? (
                              <span className="text-xs text-muted-foreground">No data</span>
                            ) : (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${bandColor}`}>
                                {avgPct}%
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="h-2.5 rounded-full overflow-hidden flex w-full min-w-[80px] bg-muted">
                              {(["Mastered","Proficient","Developing","Needs Support","No Data"] as const).map((band) => {
                                const count = cls.bands[band] ?? 0;
                                const pct = (count / total) * 100;
                                if (pct === 0) return null;
                                return (
                                  <div
                                    key={band}
                                    className={`${bandColors[band]} transition-all`}
                                    style={{ width: `${pct}%` }}
                                    title={`${band}: ${count} student${count !== 1 ? "s" : ""}`}
                                  />
                                );
                              })}
                            </div>
                            <div className="flex flex-wrap gap-x-2 mt-1">
                              {(["Mastered","Proficient","Developing","Needs Support"] as const).map((band) => {
                                const count = cls.bands[band] ?? 0;
                                if (count === 0) return null;
                                return <span key={band} className="text-[10px] text-muted-foreground">{band.split(" ")[0]} {count}</span>;
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </section>
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Someone to {mySchool.school.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger data-testid="select-invite-role" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="school_head">School Head</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Name (optional)</Label>
              <Input
                data-testid="input-invitee-name"
                className="mt-1.5"
                placeholder={inviteRole === "student" ? "Student's full name" : "Person's name"}
                value={inviteeName}
                onChange={(e) => setInviteeName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreateInvite}
              disabled={createInv.isPending}
              data-testid="button-confirm-invite"
            >
              {createInv.isPending ? "Creating…" : "Create Invitation Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
