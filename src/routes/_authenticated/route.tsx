import { createFileRoute, Outlet, redirect, useLocation, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, UserCog, CreditCard, Gift, ScanLine, ChartNoAxesCombined, LogOut, Menu, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth" });
  },
  component: AuthenticatedLayout,
});

const navigation = [
  { label: "Panoramica", href: "/dashboard#overview", icon: LayoutDashboard, section: "overview" },
  { label: "Clienti", href: "/dashboard#customers", icon: Users, section: "customers" },
  { label: "Collaboratori", href: "/dashboard#staff", icon: UserCog, section: "staff" },
  { label: "Carta fedeltà", href: "/dashboard#card", icon: CreditCard, section: "card" },
  { label: "Premi", href: "/dashboard#rewards", icon: Gift, section: "rewards" },
  { label: "Statistiche", href: "/dashboard#analytics", icon: ChartNoAxesCombined, section: "analytics" },
];

function AuthenticatedLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const staffRoleQuery = useQuery({
    queryKey: ["layout-staff-role", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_staff_venue");
      if (error) throw error;
      return Boolean(data?.length);
    },
  });
  // Hide owner-only sections until the role is known; fail closed if the role lookup fails.
  const showManagerNavigation =
    !staffRoleQuery.isPending && !staffRoleQuery.isError && !staffRoleQuery.data;
  const [hash, setHash] = useState(typeof window === "undefined" ? "#overview" : window.location.hash || "#overview");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const update = () => setHash(window.location.hash || "#overview");
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);

  if (location.pathname === "/admin") return <Outlet />;

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    window.location.assign("/auth");
  }

  const active = hash.replace("#", "");
  const nav = (
    <>
      {showManagerNavigation && navigation.map(({ label, href, icon: Icon, section }) => (
        <a key={section} href={href} onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${location.pathname === "/dashboard" && active === section ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
          <Icon className="size-[18px]" /> {label}
        </a>
      ))}
      <Link to="/scan" onClick={() => setMobileOpen(false)}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${location.pathname === "/scan" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
        <ScanLine className="size-[18px]" /> Scansiona carta
      </Link>
    </>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r bg-background px-4 py-6 lg:flex">
        <div className="px-2"><BrandLogo linked={false} /></div>
        <p className="mb-3 mt-10 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Gestione locale</p>
        <nav className="flex-1 space-y-1">{nav}</nav>
        <div className="mt-6 border-t pt-4">
          <div className="mb-3 truncate px-3 text-xs text-muted-foreground">{user?.email ?? "Account"}</div>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={signOut}><LogOut className="mr-3 size-4" /> Esci</Button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="lg:hidden"><BrandLogo compact linked={false} /></div>
          <div className="hidden text-sm text-muted-foreground lg:block">Area gestione</div>
          <div className="flex items-center gap-2">
            <span className="hidden max-w-56 truncate text-xs text-muted-foreground sm:block">{user?.email}</span>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label={mobileOpen ? "Chiudi menu" : "Apri menu"} onClick={() => setMobileOpen(v => !v)}>
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
            <Button variant="ghost" size="sm" className="hidden text-muted-foreground lg:inline-flex" onClick={signOut}><LogOut className="mr-2 size-4" /> Esci</Button>
          </div>
        </header>
        {mobileOpen && <div className="fixed inset-0 z-40 bg-background p-4 pt-20 lg:hidden">
          <nav className="space-y-1">{nav}</nav>
          <Button variant="outline" className="mt-6 w-full" onClick={signOut}><LogOut className="mr-2 size-4" /> Esci</Button>
        </div>}
        <main className="min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
          <div className="mx-auto max-w-6xl"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}