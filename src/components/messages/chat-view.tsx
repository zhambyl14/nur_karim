"use client";

import { Fragment, useEffect, useEffectEvent, useRef, useState, type KeyboardEvent } from "react";
import { AlertCircle, Check, Loader2, RotateCcw, SendHorizontal } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useI18n } from "@/lib/i18n/client";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { formatDate, formatTime, storeDateKey } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSession } from "@/components/session";
import { MESSAGE_MAX_LENGTH, type ChatMessage, type SendMessageResult } from "./types";

type Outgoing = { tempId: string; body: string; status: "sending" | "failed"; createdAt: string };

/**
 * Realtime chat between a client and the store.
 * `viewer` decides which side is "mine": the client sees their own messages
 * on the right, the admin sees every admin message on the right.
 */
export function ChatView({
  conversationId,
  initialMessages,
  viewer,
  send,
  labels,
}: {
  conversationId: string;
  initialMessages: ChatMessage[];
  viewer: "client" | "admin";
  send: (input: { conversationId: string; body: string }) => Promise<SendMessageResult>;
  labels: { mine: string; theirs: string; placeholder: string; hint: string };
}) {
  const { t, locale } = useI18n();
  const { refreshCounters } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [outgoing, setOutgoing] = useState<Outgoing[]>([]);
  const [draft, setDraft] = useState("");
  const [live, setLive] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isMine = (m: ChatMessage) => (viewer === "admin" ? m.is_admin : !m.is_admin);

  const markRead = useEffectEvent(() => {
    void getSupabaseBrowser()
      .rpc("mark_conversation_read", { p_conversation_id: conversationId })
      .then(() => refreshCounters())
      .then(undefined, () => undefined);
  });

  const onIncoming = useEffectEvent((message: ChatMessage) => {
    setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    // Our own message can arrive through realtime before the action returns:
    // drop the matching pending bubble so it is not shown twice.
    if (isMine(message)) {
      setOutgoing((prev) => {
        const index = prev.findIndex((o) => o.status === "sending" && o.body === message.body);
        return index === -1 ? prev : prev.filter((_, i) => i !== index);
      });
    }
    if (!isMine(message) && document.visibilityState === "visible") markRead();
  });

  // Mark as read on open, subscribe to new messages
  useEffect(() => {
    markRead();
    const supabase = getSupabaseBrowser();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    // Realtime checks RLS with the user's JWT: make sure the socket carries
    // the session token before joining (otherwise it joins as anon).
    void supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      if (data.session) await supabase.realtime.setAuth(data.session.access_token);
      if (cancelled) return;
      channel = supabase
        .channel(`messages:${conversationId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
          (payload) => onIncoming(payload.new as ChatMessage),
        )
        .subscribe((status) => setLive(status === "SUBSCRIBED"));
    });

    const onVisible = () => {
      if (document.visibilityState === "visible") markRead();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Keep the newest message in view
  const total = messages.length + outgoing.length;
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: total > 0 ? "smooth" : "auto" });
  }, [total]);

  const deliver = async (item: Outgoing) => {
    let result: SendMessageResult;
    try {
      result = await send({ conversationId, body: item.body });
    } catch {
      result = { ok: false, error: "network" };
    }
    if (result.ok) {
      const saved = result.message;
      setOutgoing((prev) => prev.filter((o) => o.tempId !== item.tempId));
      setMessages((prev) => (prev.some((m) => m.id === saved.id) ? prev : [...prev, saved]));
    } else {
      setOutgoing((prev) => prev.map((o) => (o.tempId === item.tempId ? { ...o, status: "failed" } : o)));
    }
  };

  const submit = () => {
    const body = draft.trim();
    if (!body || body.length > MESSAGE_MAX_LENGTH) return;
    const item: Outgoing = {
      tempId: `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      body,
      status: "sending",
      createdAt: new Date().toISOString(),
    };
    setOutgoing((prev) => [...prev, item]);
    setDraft("");
    textareaRef.current?.focus();
    void deliver(item);
  };

  const retry = (item: Outgoing) => {
    const next = { ...item, status: "sending" as const };
    setOutgoing((prev) => prev.map((o) => (o.tempId === item.tempId ? next : o)));
    void deliver(next);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const now = new Date();
  const todayKey = storeDateKey(now);
  const yesterdayKey = storeDateKey(new Date(now.getTime() - 86_400_000));
  const dayLabel = (iso: string) => {
    const key = storeDateKey(iso);
    if (key === todayKey) return t("messages.chat.today");
    if (key === yesterdayKey) return t("messages.chat.yesterday");
    return formatDate(iso, locale);
  };

  const tooLong = draft.trim().length > MESSAGE_MAX_LENGTH;
  const entries = [
    ...messages.map((m) => ({ key: m.id, createdAt: m.created_at, message: m, outgoing: null })),
    ...outgoing.map((o) => ({ key: o.tempId, createdAt: o.createdAt, message: null, outgoing: o })),
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={listRef}
        className="nk-scroll min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-4 sm:px-5"
        role="log"
        aria-label={t("messages.chat.messageList")}
        aria-live="polite"
      >
        {messages.length === 0 && outgoing.length === 0 && (
          <p className="py-10 text-center text-sm font-medium text-muted">{t("messages.chat.noMessages")}</p>
        )}
        {entries.map((entry, index) => {
          const day = storeDateKey(entry.createdAt);
          const separator = index === 0 || storeDateKey(entries[index - 1].createdAt) !== day;
          const { message, outgoing: item } = entry;
          return (
            <Fragment key={entry.key}>
              {separator && <DaySeparator label={dayLabel(entry.createdAt)} />}
              {message ? (
                <Bubble
                  mine={isMine(message)}
                  author={isMine(message) ? labels.mine : labels.theirs}
                  body={message.body}
                  time={formatTime(message.created_at, locale)}
                />
              ) : item ? (
                <Bubble
                  mine
                  author={labels.mine}
                  body={item.body}
                  time={formatTime(item.createdAt, locale)}
                  status={item.status}
                  onRetry={() => retry(item)}
                  statusLabels={{
                    sending: t("messages.chat.sending"),
                    failed: t("messages.chat.failed"),
                    retry: t("messages.chat.retry"),
                  }}
                />
              ) : null}
            </Fragment>
          );
        })}
      </div>

      <form
        className="shrink-0 border-t border-line bg-card px-3 pb-3 pt-3 sm:px-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="flex items-end gap-2">
          <label htmlFor={`chat-input-${conversationId}`} className="sr-only">
            {labels.placeholder}
          </label>
          <textarea
            id={`chat-input-${conversationId}`}
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={labels.placeholder}
            rows={1}
            maxLength={MESSAGE_MAX_LENGTH + 200}
            aria-invalid={tooLong || undefined}
            className="nk-scroll max-h-40 min-h-[48px] flex-1 resize-none rounded-[14px] border border-line bg-card-2 px-4 py-3 text-[15px] leading-snug text-ink outline-none transition placeholder:text-faint focus:border-wine-line focus:ring-2 focus:ring-wine/15 [field-sizing:content]"
          />
          <button
            type="submit"
            disabled={!draft.trim() || tooLong}
            aria-label={t("messages.chat.send")}
            title={t("messages.chat.send")}
            className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-wine text-white transition hover:bg-wine-hover active:scale-95 disabled:opacity-40"
          >
            <SendHorizontal className="size-5" aria-hidden />
          </button>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-3 text-[11.5px] font-semibold">
          <span className={cn(tooLong ? "text-danger" : "text-faint")}>
            {tooLong ? t("messages.chat.tooLong") : labels.hint}
          </span>
          <span className={cn("inline-flex shrink-0 items-center gap-1.5", live ? "text-success" : "text-faint")}>
            <span className={cn("size-1.5 rounded-full", live ? "bg-success" : "bg-line-strong")} aria-hidden />
            <span className="hidden sm:inline">{t("messages.chat.live")}</span>
          </span>
        </div>
      </form>
    </div>
  );
}

function DaySeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-2" role="separator">
      <span className="h-px flex-1 bg-line" aria-hidden />
      <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-faint">{label}</span>
      <span className="h-px flex-1 bg-line" aria-hidden />
    </div>
  );
}

function Bubble({
  mine,
  author,
  body,
  time,
  status,
  onRetry,
  statusLabels,
}: {
  mine: boolean;
  author: string;
  body: string;
  time: string;
  status?: "sending" | "failed";
  onRetry?: () => void;
  statusLabels?: { sending: string; failed: string; retry: string };
}) {
  return (
    <div className={cn("flex animate-fade-in", mine ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[85%] sm:max-w-[70%]", mine ? "items-end" : "items-start", "flex flex-col")}>
        <span className="sr-only">{author}</span>
        <div
          className={cn(
            "whitespace-pre-wrap break-words px-4 py-2.5 text-[14.5px] leading-relaxed",
            mine
              ? "rounded-[18px_18px_6px_18px] bg-primary text-on-primary"
              : "rounded-[18px_18px_18px_6px] border border-line bg-card text-ink",
            status === "sending" && "opacity-70",
            status === "failed" && "ring-2 ring-danger/40",
          )}
        >
          {body}
        </div>
        <div className="mt-1 flex items-center gap-1.5 px-1 text-[11px] font-semibold text-faint">
          {status === "sending" ? (
            <>
              <Loader2 className="size-3 animate-spin" aria-hidden />
              {statusLabels?.sending}
            </>
          ) : status === "failed" ? (
            <>
              <AlertCircle className="size-3 text-danger" aria-hidden />
              <span className="text-danger">{statusLabels?.failed}</span>
              <button
                type="button"
                onClick={onRetry}
                className="ml-1 inline-flex items-center gap-1 rounded-md px-1 font-bold text-wine-ink hover:underline"
              >
                <RotateCcw className="size-3" aria-hidden />
                {statusLabels?.retry}
              </button>
            </>
          ) : (
            <>
              {time}
              {mine && <Check className="size-3" aria-hidden />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
