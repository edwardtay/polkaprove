"use client";

import { useCallback, useRef, useState } from "react";

export type Message = {
  role: "user" | "assistant";
  content: string;
};

export function useAgent(address?: `0x${string}`, ss58Address?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (message: string) => {
      if (!message.trim()) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setError(null);
      setIsLoading(true);

      const walletCtx = [
        address ? `EVM wallet: ${address}` : null,
        ss58Address ? `Polkadot SS58 address: ${ss58Address}` : null,
      ].filter(Boolean).join("\n");
      const userContent = walletCtx
        ? `[${walletCtx}]\n\n${message}`
        : message;

      setMessages((prev) => [...prev, { role: "user", content: message }]);
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userContent }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`Request failed: ${res.status}`);

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            let data: any;
            try { data = JSON.parse(line.slice(6)); } catch { continue; }

            if (data.type === "text") {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + data.text,
                  };
                }
                return updated;
              });
            }

            if (data.type === "error") {
              setError(data.error);
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          const msg = String(err);
          setError(msg);
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant" && !last.content) {
              updated.pop();
            }
            return updated;
          });
        }
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [address, ss58Address]
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setIsLoading(false);
  }, []);

  return { messages, send, isLoading, error, reset };
}
