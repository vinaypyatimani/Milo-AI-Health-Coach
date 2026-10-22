import { useState } from "react";
import { api } from "../lib/api";
import { getQueryData, invalidate, setQueryData, useQuery } from "../lib/query";
import type { ChatMessage, ChatTarget } from "../lib/types";

export const conversationKey = (t: ChatTarget) =>
  t.mode === "coaching" ? "conv:coaching" : `conv:checkin:${t.week}`;

/**
 * Everything one conversation needs: saved messages (cached, so switching
 * pages keeps the chat instantly), the reply being streamed right now,
 * and send/start actions. No extra request after a reply: the final
 * message arrives in the stream's last event.
 */
export function useConversation(target: ChatTarget, onPlanSaved: () => void) {
  const key = conversationKey(target);
  const { data, error: loadError } = useQuery(key, () => api.conversation(target));
  const [streaming, setStreaming] = useState<string | null>(null); // null = Milo isn't writing
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [urgent, setUrgent] = useState<string | null>(null);

  const run = async (text: string | null): Promise<boolean> => {
    setError(null);
    setStatus(null);
    setStreaming("");
    if (text === null) setQueryData<ChatMessage[]>(key, []);
    else setQueryData<ChatMessage[]>(key, [...(getQueryData<ChatMessage[]>(key) ?? []), { role: "user", content: text }]);
    try {
      const done = await api.chatStream(target, text, {
        onMeta: (m) => setUrgent(m.urgent_banner),
        onDelta: (d) => setStreaming((s) => (s ?? "") + d),
        onStatus: setStatus,
      });
      setQueryData<ChatMessage[]>(key, [...(getQueryData<ChatMessage[]>(key) ?? []), done.message]);
      if (done.plan_error) setError(`Milo's plan couldn't be saved: ${done.plan_error}`);
      if (done.plan_saved) onPlanSaved();
      return true;
    } catch (e) {
      setError((e as Error).message);
      invalidate(key); // reload what the server actually saved
      return false;
    } finally {
      setStreaming(null);
      setStatus(null);
    }
  };

  return {
    messages: data ?? [],
    loading: !data && !loadError,
    busy: streaming !== null,
    streaming,
    status,
    error: error ?? loadError?.message ?? null,
    urgent,
    start: () => run(null),
    send: (text: string) => run(text),
  };
}
