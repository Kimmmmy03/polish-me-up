"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createClient } from "@/lib/supabase/client";
import {
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRow,
} from "@/app/notifications/actions";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString();
}

export function NotificationBell({ userId }: { userId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [, startTransition] = useTransition();
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current) {
    supabaseRef.current = createClient();
  }

  const unreadCount = useMemo(
    () => items.filter((n) => n.read_at === null).length,
    [items],
  );

  const refresh = useCallback(async () => {
    const data = await listMyNotifications(20);
    setItems(data);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const supabase = supabaseRef.current;
    if (!supabase) return;
    // Unique channel name per mount avoids Supabase reusing an already-
    // subscribed channel under React strict mode double-invoke, which makes
    // .on() after .subscribe() throw.
    const channelName = `notifications:${userId}:${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_profile_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as NotificationRow;
          setItems((prev) => [row, ...prev].slice(0, 20));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `recipient_profile_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as NotificationRow;
          setItems((prev) => prev.map((n) => (n.id === row.id ? row : n)));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  async function handleClick(n: NotificationRow) {
    if (!n.read_at) {
      setItems((prev) =>
        prev.map((it) =>
          it.id === n.id ? { ...it, read_at: new Date().toISOString() } : it,
        ),
      );
      startTransition(() => {
        void markNotificationRead(n.id);
      });
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  async function handleMarkAllRead() {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    startTransition(() => {
      void markAllNotificationsRead();
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="Notifications"
        className="relative inline-flex size-10 items-center justify-center rounded-full text-[#3D1A2A] transition-colors hover:bg-[#FFE4EC]"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#EC4899] to-[#DB2777] px-1 text-[10px] font-semibold leading-none text-white shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 max-w-[calc(100vw-1.5rem)] p-0"
      >
        <div className="flex items-center justify-between border-b border-[#F8BBD0]/60 px-3 py-2.5">
          <p className="text-sm font-semibold text-[#3D1A2A]">Notifications</p>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-[11px] font-medium text-[#BE185D] hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-[#5C2D48]/70">
              You&apos;re all caught up.
            </p>
          ) : (
            <ul className="divide-y divide-[#F8BBD0]/40">
              {items.map((n) => {
                const Inner = (
                  <div className="flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors hover:bg-[#FFF5F8]">
                    <span
                      aria-hidden
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${
                        n.read_at ? "bg-transparent" : "bg-[#EC4899]"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#3D1A2A]">
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="line-clamp-2 text-xs text-[#5C2D48]/80">
                          {n.body}
                        </p>
                      )}
                      <p className="mt-0.5 text-[10px] text-[#5C2D48]/60">
                        {formatWhen(n.created_at)}
                      </p>
                    </div>
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.link ? (
                      <Link
                        href={n.link}
                        onClick={(e) => {
                          e.preventDefault();
                          void handleClick(n);
                        }}
                        className="block"
                      >
                        {Inner}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleClick(n)}
                        className="block w-full"
                      >
                        {Inner}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
