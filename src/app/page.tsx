"use client";

import { FormEvent, useEffect, useState } from "react";
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
  const [email, setEmail] = useState("alpha@supportpilot.demo");
  const [password, setPassword] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authError, setAuthError] = useState("");
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generated, setGenerated] = useState<Record<string, GeneratedReply>>({});

  async function loadTickets() {
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setTickets([]);
      return;
    }

    setTickets(data ?? []);
  }

  useEffect(() => {
    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setUserEmail(session?.user.email ?? null);

      if (session) {
        await loadTickets();
      }

      setLoading(false);
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUserEmail(session?.user.email ?? null);

      if (session) {
        await loadTickets();
      } else {
        setTickets([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setAuthError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setAuthError(error.message);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  async function generateReply(ticket: Ticket) {
    setGeneratingId(ticket.id);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setGeneratingId(null);
      return;
    }

    const response = await fetch("/api/generate-reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        ticketId: ticket.id,
        message: ticket.message,
      }),
    });

    const data = await response.json();

    setGenerated((current) => ({
      ...current,
      [ticket.id]: data,
    }));

    setGeneratingId(null);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 p-10 text-white">
        Loading...
      </main>
    );
  }

  if (!userEmail) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-white">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6"
        >
          <p className="text-sm text-zinc-500">SupportPilot AI</p>
          <h1 className="mt-2 text-2xl font-bold">Sign in</h1>

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-6 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3"
            type="email"
            placeholder="Email"
          />

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3"
            type="password"
            placeholder="Password"
          />

          {authError && (
            <p className="mt-3 text-sm text-red-400">{authError}</p>
          )}

          <button className="mt-5 w-full rounded-lg bg-white p-3 font-medium text-black">
            Sign in
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="text-sm text-zinc-500">SupportPilot AI</p>
            <h1 className="mt-2 text-3xl font-bold">Support Tickets</h1>
            <p className="mt-2 text-zinc-400">{userEmail}</p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm"
          >
            Sign out
          </button>
        </div>

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
      </div>
    </main>
  );
}
