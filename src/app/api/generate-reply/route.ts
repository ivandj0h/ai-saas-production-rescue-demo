import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();

  const message = body.message;

  return NextResponse.json({
    summary: `Customer issue: ${message}`,
    reply: `Thanks for reaching out. We've received your message: "${message}". Our team will help you shortly.`,
  });
}
