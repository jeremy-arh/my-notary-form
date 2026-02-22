/**
 * API route to verify Stripe payment.
 * Replaces the Supabase Edge Function verify-payment.
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionId = body.sessionId as string | undefined;

    if (!sessionId) {
      return NextResponse.json(
        { verified: false, error: "Missing session ID" },
        { status: 400 }
      );
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json(
        { verified: false, error: "Missing STRIPE_SECRET_KEY" },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-02-24.acacia" });
    const supabase = createAdminClient();

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "invoice", "setup_intent"],
    });

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { verified: false, error: "Payment not completed" },
        { status: 400 }
      );
    }

    let invoiceUrl: string | null = null;
    if (session.invoice && typeof session.invoice === "object") {
      invoiceUrl = session.invoice.hosted_invoice_url ?? session.invoice.invoice_pdf ?? null;
    }
    if (!invoiceUrl && session.payment_intent && typeof session.payment_intent === "object") {
      const charges = await stripe.charges.list({
        payment_intent: session.payment_intent.id,
        limit: 1,
      });
      if (charges.data.length > 0) {
        invoiceUrl = charges.data[0].receipt_url ?? null;
      }
    }

    const submissionId = session.metadata?.submission_id;
    const accountCreated = session.metadata?.account_created === "true";

    if (!submissionId) {
      return NextResponse.json(
        { verified: false, error: "Missing submission ID in payment metadata" },
        { status: 400 }
      );
    }

    const { data: existingSubmission, error: fetchError } = await supabase
      .from("submission")
      .select("*")
      .eq("id", submissionId)
      .single();

    if (fetchError || !existingSubmission) {
      return NextResponse.json(
        { verified: false, error: "Submission not found" },
        { status: 400 }
      );
    }

    const submission = existingSubmission as Record<string, unknown>;
    const submissionData = (submission.data as Record<string, unknown>) || {};

    if (submission.status !== "pending_payment") {
      return NextResponse.json({
        verified: true,
        message: "Payment already processed",
        submission_id: submissionId,
        submissionId,
        invoiceUrl,
        amount: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency?.toUpperCase() ?? "EUR",
        transactionId: sessionId,
        userData: {
          email: (submission.email as string) || "",
          phone: (submission.phone as string) || "",
          firstName: (submission.first_name as string) || "",
          lastName: (submission.last_name as string) || "",
          postalCode: (submission.postal_code as string) || "",
          country: (submission.country as string) || "",
        },
        selectedServices: [],
        isFirstPurchase: true,
        servicesCount: 0,
      });
    }

    const paymentIntentId =
      session.payment_intent && typeof session.payment_intent === "object"
        ? session.payment_intent.id
        : typeof session.payment_intent === "string"
          ? session.payment_intent
          : null;

    if (session.customer && paymentIntentId) {
      try {
        const customerId = typeof session.customer === "string" ? session.customer : session.customer.id;
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
          expand: ["payment_method", "latest_charge"],
        });

        let paymentMethodId: string | null = null;
        if (paymentIntent.payment_method) {
          paymentMethodId =
            typeof paymentIntent.payment_method === "string"
              ? paymentIntent.payment_method
              : paymentIntent.payment_method.id;
        }
        if (!paymentMethodId && paymentIntent.latest_charge) {
          const chargeId =
            typeof paymentIntent.latest_charge === "string"
              ? paymentIntent.latest_charge
              : paymentIntent.latest_charge.id;
          const charge = await stripe.charges.retrieve(chargeId, { expand: ["payment_method"] });
          if (charge.payment_method) {
            paymentMethodId =
              typeof charge.payment_method === "string"
                ? charge.payment_method
                : (charge.payment_method as { id: string }).id;
          }
        }
        if (!paymentMethodId && session.setup_intent) {
          const setupIntentId =
            typeof session.setup_intent === "string" ? session.setup_intent : session.setup_intent.id;
          try {
            const setupIntent = await stripe.setupIntents.retrieve(setupIntentId, {
              expand: ["payment_method"],
            });
            if (setupIntent.payment_method) {
              paymentMethodId =
                typeof setupIntent.payment_method === "string"
                  ? setupIntent.payment_method
                  : setupIntent.payment_method.id;
            }
          } catch {
            /* ignore */
          }
        }

        if (paymentMethodId) {
          try {
            const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
            if (!paymentMethod.customer || paymentMethod.customer !== customerId) {
              await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
              await stripe.customers.update(customerId, {
                invoice_settings: { default_payment_method: paymentMethodId },
              });
            } else {
              await stripe.customers.update(customerId, {
                invoice_settings: { default_payment_method: paymentMethodId },
              });
            }
          } catch {
            /* non-critical, continue */
          }
        }

        // Sauvegarder stripe_customer_id sur le client pour les débits ultérieurs
        // (cas checkout invité avec customer_email → Stripe crée le customer à la session)
        if (submission.client_id) {
          const { data: clientRow } = await supabase
            .from("client")
            .select("stripe_customer_id")
            .eq("id", submission.client_id)
            .single();
          const currentStripeId = (clientRow as { stripe_customer_id: string | null } | null)?.stripe_customer_id;
          if (!currentStripeId) {
            await supabase
              .from("client")
              .update({ stripe_customer_id: customerId })
              .eq("id", submission.client_id);
          }
        }
      } catch {
        /* non-critical */
      }
    }

    const updatedData = {
      ...submissionData,
      payment: {
        stripe_session_id: sessionId,
        payment_intent_id: paymentIntentId,
        amount_paid: session.amount_total,
        currency: session.currency,
        payment_status: session.payment_status,
        paid_at: new Date().toISOString(),
        invoice_url: invoiceUrl,
      },
    };

    const { data: updatedSubmission, error: updateError } = await supabase
      .from("submission")
      .update({ status: "pending", data: updatedData })
      .eq("id", submissionId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { verified: false, error: "Failed to update submission" },
        { status: 500 }
      );
    }

    const uploadedFiles = (submissionData.uploadedFiles as Record<string, unknown>[]) || [];
    if (uploadedFiles.length > 0) {
      const fileEntries = uploadedFiles.map((file: Record<string, unknown>) => ({
        submission_id: submissionId,
        file_name: file.name,
        file_url: file.public_url,
        file_type: file.type,
        file_size: file.size,
        storage_path: file.storage_path,
      }));
      await supabase.from("submission_files").insert(fileEntries);
    }

    const signatoriesData = submissionData.signatories || submissionData.signatoriesByDocument;
    if (signatoriesData) {
      const { data: existingSignatories } = await supabase
        .from("signatories")
        .select("id")
        .eq("submission_id", submissionId);

      if (!existingSignatories || existingSignatories.length === 0) {
        const signatoryEntries: Record<string, unknown>[] = [];
        const serviceDocuments = (submissionData.serviceDocuments as Record<string, unknown[]>) || {};
        const allDocKeys: string[] = [];

        if (typeof serviceDocuments === "object") {
          Object.entries(serviceDocuments).forEach(([serviceId, documents]) => {
            if (Array.isArray(documents)) {
              documents.forEach((doc: unknown, docIndex: number) => {
                allDocKeys.push(`${serviceId}_${docIndex}`);
              });
            }
          });
        }
        const docKeysToUse = allDocKeys.length > 0 ? allDocKeys : ["global"];

        if (Array.isArray(signatoriesData)) {
          signatoriesData.forEach((signatory: Record<string, unknown>) => {
            if (signatory.firstName && signatory.lastName) {
              docKeysToUse.forEach((docKey) => {
                signatoryEntries.push({
                  submission_id: submissionId,
                  document_key: docKey,
                  first_name: signatory.firstName,
                  last_name: signatory.lastName,
                  birth_date: signatory.birthDate,
                  birth_city: signatory.birthCity,
                  postal_address: signatory.postalAddress,
                  email: signatory.email ?? null,
                  phone: signatory.phone ?? null,
                });
              });
            }
          });
        } else {
          Object.entries(signatoriesData).forEach(([docKey, signatories]) => {
            if (Array.isArray(signatories)) {
              signatories.forEach((s: Record<string, unknown>) => {
                if (s.firstName && s.lastName) {
                  signatoryEntries.push({
                    submission_id: submissionId,
                    document_key: docKey,
                    first_name: s.firstName,
                    last_name: s.lastName,
                    birth_date: s.birthDate,
                    birth_city: s.birthCity,
                    postal_address: s.postalAddress,
                    email: s.email ?? null,
                    phone: s.phone ?? null,
                  });
                }
              });
            }
          });
        }
        if (signatoryEntries.length > 0) {
          await supabase.from("signatories").insert(signatoryEntries);
        }
      }
    }

    const submissionNumber = submissionId.substring(0, 8);

    try {
      const { data: clientData } = await supabase
        .from("client")
        .select("email, first_name, last_name")
        .eq("id", submission.client_id)
        .single();

      if (clientData?.email) {
        const clientName = `${(clientData.first_name as string) || ""} ${(clientData.last_name as string) || ""}`.trim() || "Client";
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            email_type: "payment_success",
            recipient_email: clientData.email,
            recipient_name: clientName,
            recipient_type: "client",
            data: {
              submission_id: submissionId,
              submission_number: submissionNumber,
              payment_amount: session.amount_total ? session.amount_total / 100 : null,
              payment_date: new Date().toISOString(),
              invoice_url: invoiceUrl,
            },
          },
        });
      }
    } catch {
      /* non-critical */
    }

    try {
      const { data: activeNotaries } = await supabase
        .from("notary")
        .select("id, email, full_name, timezone")
        .eq("is_active", true);

      if (activeNotaries && activeNotaries.length > 0) {
        const clientName = `${(submission.first_name as string) || ""} ${(submission.last_name as string) || ""}`.trim() || "Client";
        await Promise.allSettled(
          activeNotaries.map((notary) =>
            notary.email
              ? supabase.functions.invoke("send-transactional-email", {
                  body: {
                    email_type: "new_submission_available",
                    recipient_email: notary.email,
                    recipient_name: (notary.full_name as string) || "Notary",
                    recipient_type: "notary",
                    data: {
                      submission_id: submissionId,
                      submission_number: submissionNumber,
                      client_name: clientName,
                      appointment_date: submission.appointment_date,
                      appointment_time: submission.appointment_time,
                      client_timezone: (submission.timezone as string) || "UTC",
                      notary_timezone: (notary.timezone as string) || "America/New_York",
                      address: submission.address,
                      city: submission.city,
                      country: submission.country,
                    },
                  },
                })
              : Promise.resolve()
          )
        );
      }
    } catch {
      /* non-critical */
    }

    let clientDataForGtm: { email?: string; phone?: string } | null = null;
    if (submission.client_id) {
      const { data: client } = await supabase
        .from("client")
        .select("email, phone")
        .eq("id", submission.client_id)
        .single();
      if (client) clientDataForGtm = client as { email?: string; phone?: string };
    }

    let isFirstPurchase = true;
    if (submission.client_id) {
      const { count } = await supabase
        .from("submission")
        .select("*", { count: "exact", head: true })
        .eq("client_id", submission.client_id)
        .in("status", ["pending", "completed", "in_progress"]);
      isFirstPurchase = (count ?? 0) <= 1;
    }

    const selectedServiceIds = (submissionData.selectedServices as string[]) || [];
    let selectedServices: Array<{ service_id: string; id: string; name: string; service_name: string; price: number }> = [];

    if (selectedServiceIds.length > 0) {
      const { data: services } = await supabase
        .from("services")
        .select("service_id, name, base_price")
        .in("service_id", selectedServiceIds)
        .eq("is_active", true);

      if (services && services.length > 0) {
        selectedServices = services.map((s) => ({
          service_id: s.service_id,
          id: s.service_id,
          name: (s.name as string) || "",
          service_name: (s.name as string) || "",
          price: (s.base_price as number) || 0,
        }));
      } else {
        selectedServices = selectedServiceIds.map((sid) => ({
          service_id: sid,
          id: sid,
          name: "",
          service_name: "",
          price: 0,
        }));
      }
    }

    const totalAmount = session.amount_total ? session.amount_total / 100 : 0;

    return NextResponse.json({
      verified: true,
      submissionId: submissionId,
      accountCreated,
      invoiceUrl,
      amount: totalAmount,
      currency: session.currency ? session.currency.toUpperCase() : "EUR",
      transactionId: sessionId,
      userData: {
        email: (submission.email as string) || clientDataForGtm?.email || "",
        phone: (submission.phone as string) || clientDataForGtm?.phone || "",
        firstName: (submission.first_name as string) || "",
        lastName: (submission.last_name as string) || "",
        postalCode: (submission.postal_code as string) || "",
        country: (submission.country as string) || "",
      },
      selectedServices,
      isFirstPurchase,
      servicesCount: selectedServices.length,
    });
  } catch (error) {
    console.error("[verify-payment] Error:", error);
    return NextResponse.json(
      {
        verified: false,
        error: error instanceof Error ? error.message : "Verification failed",
      },
      { status: 400 }
    );
  }
}
