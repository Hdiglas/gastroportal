import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { url, anonKey } = await request.json();

    if (!url || !anonKey) {
      return NextResponse.json(
        { error: "url and anonKey are required" },
        { status: 400 }
      );
    }

    const supabase = createClient(url, anonKey);

    const { data, error } = await supabase.rpc("", {}).maybeSingle();

    if (error && error.code !== "PGRST202") {
      const { error: healthError } = await supabase
        .from("_health_check")
        .select("*")
        .limit(1);

      if (
        healthError &&
        !healthError.message.includes("does not exist") &&
        !healthError.message.includes("relation")
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Connection failed",
            details: healthError.message,
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Supabase connection successful",
      url,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to connect to Supabase",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
