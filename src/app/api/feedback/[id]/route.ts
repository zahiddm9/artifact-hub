import { NextResponse } from "next/server";

// Feedback deletion is handled via Next.js Server Actions (src/lib/actions/feedback.ts).
// This public HTTP endpoint is intentionally closed.
export function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
