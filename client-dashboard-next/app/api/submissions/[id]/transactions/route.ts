/**
 * Fetches Stripe transactions (charges, refunds) and invoice URL for a submission.
 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type StripeTransaction = {
  id: string;
  type: "payment" | "refund";
  amount: number;
  currency: string;
  status: string;
  created: number;
  receiptUrl?: string;
  invoiceUrl?: string;
  description?: string;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: submissionId } = await params;
    if (!submissionId) {
      return NextResponse.json({ error: "Missing submission ID" }, { status: 400 });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: client } = await admin
      .from("client")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 403 });
    }

    const { data: submission, error: subError } = await admin
      .from("submission")
      .select("id, data, client_id")
      .eq("id", submissionId)
      .eq("client_id", client.id)
      .single();

    if (subError || !submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const paymentData = (submission.data as Record<string, unknown>)?.payment as Record<string, unknown> | undefined;
    const paymentIntentId = paymentData?.payment_intent_id as string | undefined;
    const stripeSessionId = paymentData?.stripe_session_id as string | undefined;

    const transactions: StripeTransaction[] = [];
    let mainInvoiceUrl: string | null = (paymentData?.invoice_url as string) || null;

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-02-24.acacia" });

    let piIdToUse = paymentIntentId;

    // Fetch from Stripe session if we have it (most complete data)
    if (stripeSessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(stripeSessionId, {
          expand: ["payment_intent", "invoice"],
        });

        if (session.invoice && typeof session.invoice === "object") {
          mainInvoiceUrl = session.invoice.hosted_invoice_url || session.invoice.invoice_pdf || mainInvoiceUrl;
        }

        const pi = session.payment_intent;
        piIdToUse = typeof pi === "string" ? pi : (pi as { id?: string })?.id || piIdToUse;

        if (piIdToUse && session.payment_status === "paid" && session.amount_total) {
          transactions.push({
            id: piIdToUse,
            type: "payment",
            amount: (session.amount_total || 0) / 100,
            currency: (session.currency || "eur").toUpperCase(),
            status: session.payment_status || "succeeded",
            created: session.created || Math.floor(Date.now() / 1000),
            receiptUrl: mainInvoiceUrl || undefined,
            invoiceUrl: mainInvoiceUrl || undefined,
            description: "Checkout payment",
          });
        }
      } catch (e) {
        console.warn("[transactions] Session fetch failed:", e);
      }
    }

    // Fetch charges and refunds from PaymentIntent for more detail (refunds, receipt URLs)
    if (piIdToUse) {
      try {
        const charges = await stripe.charges.list({
          payment_intent: piIdToUse,
          limit: 10,
        });

        const hasFromSession = transactions.length > 0;

        for (const charge of charges.data) {
          const receiptUrl = charge.receipt_url || undefined;
          if (!mainInvoiceUrl && receiptUrl) mainInvoiceUrl = receiptUrl;

          if (!hasFromSession) {
            transactions.push({
              id: charge.id,
              type: "payment",
              amount: (charge.amount || 0) / 100,
              currency: (charge.currency || "eur").toUpperCase(),
              status: charge.status || "succeeded",
              created: charge.created,
              receiptUrl,
              invoiceUrl: receiptUrl,
              description: charge.description || undefined,
            });
          } else if (transactions[0] && !transactions[0].receiptUrl && receiptUrl) {
            transactions[0].receiptUrl = receiptUrl;
            transactions[0].invoiceUrl = receiptUrl;
          }

          if (charge.refunded && charge.amount_refunded) {
            transactions.push({
              id: `refund_${charge.id}`,
              type: "refund",
              amount: (charge.amount_refunded || 0) / 100,
              currency: (charge.currency || "eur").toUpperCase(),
              status: "succeeded",
              created: charge.created,
              description: "Refund",
            });
          }
        }
      } catch (e) {
        console.warn("[transactions] Charges fetch failed:", e);
      }
    }

    // Fallback: use data from submission.data.payment if no Stripe fetch worked
    if (transactions.length === 0 && paymentData?.payment_intent_id && paymentData?.amount_paid) {
      const paidAt = (paymentData.paid_at as string) || new Date().toISOString();
      transactions.push({
        id: (paymentData.payment_intent_id as string) || "",
        type: "payment",
        amount: ((paymentData.amount_paid as number) || 0) / 100,
        currency: ((paymentData.currency as string) || "eur").toUpperCase(),
        status: (paymentData.payment_status as string) || "succeeded",
        created: new Date(paidAt).getTime() / 1000,
        receiptUrl: (paymentData.invoice_url as string) || undefined,
        invoiceUrl: (paymentData.invoice_url as string) || undefined,
      });

      const additional = (paymentData.additional_payments as Array<{ payment_intent_id?: string; amount?: number; currency?: string; status?: string; created_at?: string; invoice_url?: string }>) || [];
      additional.forEach((ap) => {
        transactions.push({
          id: (ap.payment_intent_id || `extra_${Date.now()}`) as string,
          type: "payment",
          amount: ((ap.amount || 0) / 100) as number,
          currency: ((ap.currency || "eur") as string).toUpperCase(),
          status: (ap.status || "succeeded") as string,
          created: ap.created_at ? new Date(ap.created_at).getTime() / 1000 : Date.now() / 1000,
          invoiceUrl: ap.invoice_url,
        });
      });

      const refunds = (paymentData.refunds as Array<{ id?: string; amount?: number; currency?: string; status?: string; created_at?: string }>) || [];
      refunds.forEach((r) => {
        transactions.push({
          id: (r.id || `refund_${Date.now()}`) as string,
          type: "refund",
          amount: ((r.amount || 0) / 100) as number,
          currency: ((paymentData.currency as string) || "eur").toUpperCase(),
          status: (r.status || "succeeded") as string,
          created: r.created_at ? new Date(r.created_at).getTime() / 1000 : Date.now() / 1000,
        });
      });
    }

    transactions.sort((a, b) => b.created - a.created);

    return NextResponse.json({
      transactions,
      invoiceUrl: mainInvoiceUrl,
    });
  } catch (err) {
    console.error("[transactions] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
