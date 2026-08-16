import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  RotateCcw,
  Search,
  Settings2,
  BarChart3,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CommandPalette } from "@/components/tms/CommandPalette";
import { cn } from "@/lib/utils";
import { useTms } from "@/lib/tms/store";
import {
  currentUser,
  logout,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/tms/services";
import {
  canManageAssignments,
  canManageTestCases,
  canManageUsers,
  canViewReports,
  canViewReview,
} from "@/lib/tms/permissions";
import { ROLE_LABELS, type User } from "@/types/domain";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  show: (user: User) => boolean;
}

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: () => true },
  { to: "/my-tests", label: "My Tests", icon: ClipboardList, show: (u) => u.role === "tester" },
  { to: "/reviews", label: "Review Queue", icon: ClipboardCheck, show: (u) => canViewReview(u) },
  { to: "/reports", label: "Reports", icon: BarChart3, show: (u) => canViewReports(u) },
  {
    to: "/admin",
    label: "Administration",
    icon: Settings2,
    show: (u) => canManageUsers(u) || canManageTestCases(u) || canManageAssignments(u),
  },
];

function NavLinks({ user, onNavigate }: { user: User; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="space-y-0.5" aria-label="Primary">
      {NAV.filter((item) => item.show(user)).map((item) => {
        const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-primary pl-[10px] font-medium"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <item.icon className="size-4" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function NotificationCenter({ userId }: { userId: string }) {
  const { state, update } = useTms();
  const navigate = useNavigate();
  const items = state.notifications
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unread = items.filter((n) => !n.read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications (${unread} unread)`}
        >
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="label-caps">Notifications</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => update((s) => markAllNotificationsRead(s, userId))}
            disabled={!unread}
          >
            Mark all read
          </Button>
        </div>
        <ScrollArea className="max-h-80">
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              You have no notifications.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    className={cn(
                      "w-full px-3 py-2.5 text-left transition-colors hover:bg-accent",
                      !n.read && "bg-primary/5",
                    )}
                    onClick={() => {
                      update((s) => markNotificationRead(s, n.id));
                      void navigate({ to: n.href });
                    }}
                  >
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {!n.read && <span className="size-1.5 rounded-full bg-primary" aria-hidden />}
                      {n.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { state, ready, update, resetDemoData } = useTms();
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const user = currentUser(state);

  useEffect(() => {
    if (ready && !user) void navigate({ to: "/", replace: true });
  }, [ready, user, navigate]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading workspace…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
          <div className="flex items-center gap-2.5 border-b border-sidebar-border px-4 py-4">
            <div className="grid size-8 place-items-center rounded-sm bg-primary text-primary-foreground">
              <span className="text-sm font-bold">TE</span>
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Tata Electronics</p>
              <p className="text-[11px] text-muted-foreground">Test Management</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <NavLinks user={user} />
          </div>
          <div className="border-t border-sidebar-border p-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-xs"
              onClick={resetDemoData}
            >
              <RotateCcw className="size-3.5" /> Reset demo data
            </Button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
            <div className="flex items-center gap-2 px-4 py-2.5">
              <Sheet open={mobileNav} onOpenChange={setMobileNav}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    aria-label="Open navigation"
                  >
                    <Menu className="size-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-4">
                  <SheetTitle className="mb-4 text-sm">Tata Electronics TMS</SheetTitle>
                  <NavLinks user={user} onNavigate={() => setMobileNav(false)} />
                </SheetContent>
              </Sheet>

              <button
                onClick={() => setPaletteOpen(true)}
                className="flex h-9 flex-1 max-w-md items-center gap-2 rounded-sm border border-border bg-background px-3 text-sm text-muted-foreground transition-colors hover:border-primary/50"
              >
                <Search className="size-4" />
                <span className="truncate">Search tests, executions, testers…</span>
                <kbd className="ml-auto hidden rounded border border-border px-1.5 text-[10px] sm:block">
                  Ctrl K
                </kbd>
              </button>

              <div className="ml-auto flex items-center gap-1">
                <NotificationCenter userId={user.id} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-9 gap-2 px-2">
                      <span className="grid size-6 place-items-center rounded-full bg-accent text-[11px] font-semibold">
                        {user.name
                          .split(" ")
                          .map((p) => p[0])
                          .join("")}
                      </span>
                      <span className="hidden text-left leading-tight sm:block">
                        <span className="block text-xs font-medium">{user.name}</span>
                        <span className="block text-[10px] text-muted-foreground">
                          {ROLE_LABELS[user.role]}
                        </span>
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="mono-id text-xs text-muted-foreground">{user.employeeId}</p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => {
                        update(logout);
                        void navigate({ to: "/", replace: true });
                      }}
                    >
                      <LogOut className="size-4" /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <div className="border-b border-border bg-surface/40 px-4 py-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-lg font-semibold">{title}</h1>
                {description && (
                  <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
                )}
              </div>
              {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>
          </div>

          <main className="px-4 py-5 sm:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
