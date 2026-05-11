import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { MySchoolResponse, SchoolMemberWithUser, InvitationWithDetails, InvitePreviewResponse } from "@shared/schema";

export function useMySchool() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  return useQuery<MySchoolResponse | null>({
    queryKey: ["/api/school"],
    queryFn: async () => {
      const res = await fetch("/api/school", { credentials: "include" });
      if (res.status === 404) return null;  // no school yet
      if (!res.ok) return null;             // 401 or other error — treat as no school, but gate prevents modal
      return res.json();
    },
    enabled: !authLoading && isAuthenticated,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
}

export function useSchoolMembers(enabled = true) {
  return useQuery<SchoolMemberWithUser[]>({
    queryKey: ["/api/admin/members"],
    queryFn: async () => {
      const res = await fetch("/api/admin/members", { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled,
    staleTime: 1000 * 30,
  });
}

export function useSchoolInvitations(enabled = true) {
  return useQuery<InvitationWithDetails[]>({
    queryKey: ["/api/admin/invitations"],
    queryFn: async () => {
      const res = await fetch("/api/admin/invitations", { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled,
    staleTime: 1000 * 30,
  });
}

export function useSchoolOverview(enabled = true) {
  return useQuery({
    queryKey: ["/api/school/overview"],
    queryFn: async () => {
      const res = await fetch("/api/school/overview", { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled,
    staleTime: 1000 * 60,
  });
}

export function useStudentPortal() {
  return useQuery({
    queryKey: ["/api/student/portal"],
    queryFn: async () => {
      const res = await fetch("/api/student/portal", { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    staleTime: 1000 * 60,
  });
}

export function useInvitePreview(token: string | null) {
  return useQuery<InvitePreviewResponse | null>({
    queryKey: ["/api/invite", token],
    queryFn: async () => {
      if (!token) return null;
      const res = await fetch(`/api/invite/${token}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!token,
    retry: false,
    staleTime: Infinity,
  });
}

export function useCreateSchool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => apiRequest("POST", "/api/school", { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/school"] });
    },
  });
}

export function useCreateInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { role: string; inviteeName?: string; linkedStudentId?: number }) =>
      apiRequest("POST", "/api/admin/invitations", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/invitations"] });
    },
  });
}

export function useDeleteInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/invitations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/invitations"] });
    },
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => apiRequest("DELETE", `/api/admin/members/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/members"] });
    },
  });
}

export function useClassesMastery(enabled = true) {
  return useQuery<any[]>({
    queryKey: ["/api/school/classes-mastery"],
    queryFn: async () => {
      const res = await fetch("/api/school/classes-mastery", { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled,
    staleTime: 1000 * 60 * 2,
  });
}

export function useAcceptInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => apiRequest("POST", `/api/invite/${token}/accept`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/school"] });
    },
  });
}
