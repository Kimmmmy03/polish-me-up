"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  CalendarDays,
  LayoutDashboard,
  Package,
  Receipt,
  Users,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
};

type NavItemWithBadge = NavItem & { badge?: string };

const navItems: NavItemWithBadge[] = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/bookings", label: "Bookings", Icon: CalendarDays },
  { href: "/customers", label: "Customers", Icon: Users },
  { href: "/items", label: "Items", Icon: Package },
  { href: "/sales", label: "Sales", Icon: Receipt },
  { href: "/availability", label: "Availability", Icon: Calendar, badge: "Soon" },
];

export function SidebarNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {navItems.map(({ href, label, Icon, badge }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-[#FDF2F4] font-medium text-[#E91E63]"
                : "text-[#2D2D2D] hover:bg-[#FDF2F4]",
            )}
          >
            <Icon className="size-4" />
            <span className="flex-1">{label}</span>
            {badge && (
              <span className="rounded-full bg-[#F8BBD0]/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#E91E63]">
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
