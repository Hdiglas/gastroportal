import { NextResponse } from "next/server";
import { batchCategorizeEmails } from "@/lib/ai/batch-categorize";

export async function POST() {
  try {
    const { processed, errors } = await batchCategorizeEmails(20);
    return NextResponse.json({
      processed,
      total: processed + errors.length,
      errors,
      message: processed > 0 ? `${processed} E-Mails kategorisiert` : "No uncategorized emails",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Batch categorization failed",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}
