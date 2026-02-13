import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import LandingPage from "@/pages/LandingPage";
import DashboardPage from "@/pages/DashboardPage";
import { useToast } from "@/hooks/use-toast";
import { redirectToLogin } from "@/lib/auth-utils";

export default function AppIndexPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // If user is logged in and hits "/", keep them inside the app.
    if (!isLoading && isAuthenticated && user) {
      setLocation("/app");
    }
  }, [isAuthenticated, isLoading, setLocation, user]);

  if (isLoading) {
    return <LandingPage />;
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  // Safety: if authenticated but user missing, redirect to login
  if (!user) {
    redirectToLogin(toast as any);
    return null;
  }

  return <DashboardPage />;
}
