import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Webhook ClickSend : rapports de livraison SMS (DLR - Delivery Report)
 * Configurer dans ClickSend Dashboard : URL = https://bo.mynotary.io/api/webhooks/clicksend-dlr
 *
 * Paramètres reçus (x-www-form-urlencoded) :
 * - message_id / messageid : ID du message
 * - status : SUCCESS, DELIVRD, FAILED, etc.
 * - status_code, error_code, error_text
 */
const DELIVERED_STATUSES = ["SUCCESS", "DELIVRD", "DELIVERED", "D"];
const FAILED_STATUSES = ["FAILED", "UNDELIV", "UNDELIVERABLE", "REJECTED", "EXPIRED"];

export async function POST(req: Request) {
  try {
    let params: Record<string, string> = {};
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      const searchParams = new URLSearchParams(text);
      searchParams.forEach((v, k) => {
        params[k.toLowerCase()] = v;
      });
    } else if (contentType.includes("application/json")) {
      const json = await req.json();
      params = Object.fromEntries(
        Object.entries(json).map(([k, v]) => [k.toLowerCase(), String(v ?? "")])
      );
    }

    const messageId =
      params.message_id || params.messageid || params["message-id"] || "";
    const status = (params.status || params.status_code || "").toUpperCase();
    const errorCode = params.error_code || params.errorcode || "";
    const errorText = params.error_text || params.errortext || "";

    if (!messageId) {
      console.error("[webhook clicksend-dlr] message_id manquant", params);
      return NextResponse.json({ error: "message_id manquant" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const updateData: Record<string, string | null> = {};
    if (DELIVERED_STATUSES.includes(status)) {
      updateData.delivered_at = new Date().toISOString();
      updateData.failed_at = null;
      updateData.failed_reason = null;
    } else if (FAILED_STATUSES.includes(status) || status.includes("FAIL")) {
      updateData.failed_at = new Date().toISOString();
      updateData.failed_reason = errorText || errorCode ? `Code ${errorCode}` : status;
    }

    if (Object.keys(updateData).length > 0) {
      const { data, error } = await supabase
        .from("sms_sent")
        .update(updateData)
        .eq("provider_message_id", messageId)
        .select("id");

      if (error) {
        console.error("[webhook clicksend-dlr] Erreur update:", error);
        return NextResponse.json({ error: "Erreur DB" }, { status: 500 });
      }

      if (data?.length) {
        const { data: smsRow } = await supabase
          .from("sms_sent")
          .select("phone_number, submission_id, sms_type")
          .eq("provider_message_id", messageId)
          .single();
        if (smsRow) {
          await supabase.from("sms_events").insert({
            phone_number: smsRow.phone_number,
            submission_id: smsRow.submission_id,
            sms_type: smsRow.sms_type,
            twilio_message_sid: null,
            provider_message_id: messageId,
            event_type: DELIVERED_STATUSES.includes(status) ? "delivered" : "failed",
            timestamp: new Date().toISOString(),
            error_code: errorCode || null,
            error_message: errorText || null,
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[webhook clicksend-dlr]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
