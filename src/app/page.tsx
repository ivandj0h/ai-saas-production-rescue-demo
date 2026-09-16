"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Ticket = {
  id: string;
  workspace_id: string;
  customer_name: string;
  customer_email: string;
  message: string;
  status: string;
  created_at: string;
  ai_summary: string | null;
  suggested_reply: string | null;
};

type GeneratedReply = {
  summary: string;
  reply: string;
};

export default function Home() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generated, setGenerated] = useState<Record<string, GeneratedReply>>({});

  useEffect(() => {
    async function loadTickets() {
      const { data } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      setTickets(data ?? []);
      setLoading(false);
    }

    loadTickets();
  }, []);

  async function generateReply(ticket: Ticket) {
    setGeneratingId(ticket.id);

    const response = await fetch("/api/generate-reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: ticket.message,
      }),
    });

    const data = await response.json();

    await supabase
      .from("support_tickets")
      .update({
        ai_summary: data.summary,
        suggested_reply: data.reply,
      })
      .eq("id", ticket.id);

    setGenerated((current) => ({
      ...current,
      [ticket.id]: data,
    }));

    setGeneratingId(null);
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="text-sm text-zinc-500">SupportPilot AI</p>
          <h1 className="mt-2 text-3xl font-bold">Support Tickets</h1>
          <p className="mt-2 text-zinc-400">
            AI-assisted customer support dashboard
          </p>
        </div>

        {loading ? (
          <p className="text-zinc-400">Loading tickets...</p>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-semibold">{ticket.customer_name}</h2>
                    <p className="text-sm text-zinc-500">
                      {ticket.customer_email}
                    </p>
                  </div>

                  <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs">
                    {ticket.status}
                  </span>
                </div>

                <p className="mt-5 text-zinc-300">{ticket.message}</p>

                <button
                  onClick={() => generateReply(ticket)}
                  disabled={generatingId === ticket.id}
                  className="mt-5 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
                >
                  {generatingId === ticket.id
                    ? "Generating..."
                    : "Generate AI Reply"}
                </button>

                {generated[ticket.id] && (
                  <div className="mt-5 rounded-lg bg-zinc-950 p-4">
                    <p className="text-xs font-semibold uppercase text-zinc-500">
                      AI Suggested Reply
                    </p>
                    <p className="mt-2 text-sm text-zinc-300">
                      {generated[ticket.id].reply}
                    </p>
                  </div>
                )}

                <div className="mt-5 border-t border-zinc-800 pt-4 text-xs text-zinc-600">
                  Workspace: {ticket.workspace_id}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
