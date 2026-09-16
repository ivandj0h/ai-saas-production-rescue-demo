import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authorization.slice(7);

  // User-scoped client: still protected by RLS
  const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: allowed, error: rateLimitError } = await userClient.rpc(
    "consume_rate_limit",
    {
      p_route: "/api/generate-reply",
      p_limit: 5,
      p_window_seconds: 60,
    }
  );

  if (rateLimitError) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 }
    );
  }

  const body = await request.json();

  if (typeof body.ticketId !== "string" || !body.ticketId.trim()) {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }

  // This SELECT is protected by RLS.
  // User cannot retrieve another workspace's ticket.
  const { data: ticket, error: ticketError } = await userClient
    .from("support_tickets")
    .select("id, message")
    .eq("id", body.ticketId)
    .maybeSingle();

  if (ticketError) {
    return NextResponse.json(
      { error: "Failed to load ticket" },
      { status: 500 }
    );
  }

  if (!ticket) {
    return NextResponse.json(
      { error: "Ticket not found or access denied" },
      { status: 404 }
    );
  }

  const message = ticket.message.trim();

  const summary = `Customer issue: ${message}`;
  const reply =
    `Thanks for reaching out. We've received your message: "${message}". Our team will help you shortly.`;

  // Server-only privileged client.
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

  const { error: updateError } = await adminClient
    .from("support_tickets")
    .update({
      ai_summary: summary,
      suggested_reply: reply,
    })
    .eq("id", ticket.id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update ticket" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    summary,
    reply,
  });
}
