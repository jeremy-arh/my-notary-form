import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const messageSid = formData.get("MessageSid") as string | null;
    const messageStatus = (formData.get("MessageStatus") || formData.get("SmsStatus")) as string | null;
    const errorCode = formData.get("ErrorCode") as string | null;

    if (!messageSid || !messageStatus) {
      return NextResponse.json({ error: "Missing MessageSid or MessageStatus" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const updateData: Record<string, string | null> = {};
    if (messageStatus === "delivered") {
      updateData.delivered_at = new Date().toISOString();
    } else if (messageStatus === "failed" || messageStatus === "undelivered") {
      updateData.failed_at = new Date().toISOString();
      updateData.failed_reason = errorCode ? `Code ${errorCode}` : null;
    }

    if (Object.keys(updateData).length > 0) {
      await supabase
        .from("sms_sent")
        .update(updateData)
        .eq("twilio_message_sid", messageSid);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[webhook twilio-status]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
