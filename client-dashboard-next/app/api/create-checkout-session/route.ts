/**
 * API route to create Stripe checkout session.
 * Full implementation (no Edge Function) - uses Stripe + Supabase directly.
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Taux identiques au client (lib/utils/currency.ts) pour cohérence Summary <-> Stripe
const CLIENT_FALLBACK_RATES: Record<string, number> = {
  USD: 1.1,
  GBP: 0.85,
  CAD: 1.5,
  AUD: 1.65,
  CHF: 0.95,
  JPY: 165,
  CNY: 7.8,
};

function convertPriceToMatchClient(eurAmount: number, targetCurrency: string): number {
  if (!eurAmount || !targetCurrency || targetCurrency.toUpperCase() === "EUR") return eurAmount;
  const rate = CLIENT_FALLBACK_RATES[targetCurrency.toUpperCase()] ?? 1;
  if (targetCurrency.toUpperCase() === "JPY") return Math.round(eurAmount * rate);
  return Math.round(eurAmount * rate * 100) / 100;
}

export async function POST(request: NextRequest) {
  let formData: Record<string, unknown> | null = null;
  let submissionId: string | undefined;

  try {
    const body = await request.json();
    formData = body.formData;
    submissionId = body.submissionId;

    if (!formData) {
      return NextResponse.json(
        { error: "Missing required field: formData" },
        { status: 400 }
      );
    }

    // Exiger les données client réelles (pas de création en tant qu'invité)
    const email = (formData.email as string)?.trim();
    const firstName = (formData.firstName as string)?.trim();
    const lastName = (formData.lastName as string)?.trim();
    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        {
          error:
            "Email, first name and last name are required to create a client account",
        },
        { status: 400 }
      );
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        {
          error:
            "Missing STRIPE_SECRET_KEY, SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });
    const supabase = createAdminClient();

    let currency = (
      body.currency ||
      (formData.currency as string) ||
      "EUR"
    ).toUpperCase();
    const stripeCurrency = currency.toLowerCase();

    const promoCode = (body.promoCode || formData.promoCode) as string | null;
    const promoCodeId = (body.promoCodeId || formData.promoCodeId) as
      | string
      | null;

    // User session from cookies (same-origin request)
    const serverSupabase = await createServerClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();

    let submission: Record<string, unknown> | null = null;
    let clientId: string | null = null;
    let stripeCustomerId: string | null = null;
    let accountCreated = false;

    // Retry payment: existing submission
    if (submissionId) {
      const { data: existingSubmission, error: fetchError } = await supabase
        .from("submission")
        .select("*")
        .eq("id", submissionId)
        .single();

      if (fetchError) {
        return NextResponse.json(
          { error: "Failed to fetch submission: " + fetchError.message },
          { status: 400 }
        );
      }
      submission = existingSubmission as Record<string, unknown>;
      clientId = (existingSubmission as { client_id: string }).client_id;
    } else if ((formData.sessionId as string)) {
      const { data: existingSubmissions } = await supabase
        .from("submission")
        .select("*")
        .in("status", ["pending", "pending_payment", "confirmed"])
        .order("created_at", { ascending: false })
        .limit(20);

      const found = (existingSubmissions || []).find(
        (s: { data?: { session_id?: string } }) =>
          s.data?.session_id === formData.sessionId
      );
      if (found) {
        submission = found as Record<string, unknown>;
        clientId = (found as { client_id: string }).client_id;
        submissionId = (found as { id: string }).id;
      }
    }

    // Récupérer stripe_customer_id du client quand on a une submission existante (retry/resume)
    if (clientId && !stripeCustomerId) {
      const { data: clientRow } = await supabase
        .from("client")
        .select("stripe_customer_id")
        .eq("id", clientId)
        .single();
      if (clientRow) {
        stripeCustomerId = (clientRow as { stripe_customer_id: string | null }).stripe_customer_id;
      }
    }

    // Update existing submission with latest data (when found by session_id or retry)
    if (submission && submissionId) {
      const submissionData = {
        client_id: clientId,
        status: "pending_payment",
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone || "",
        address: formData.address,
        city: formData.city,
        postal_code: formData.postalCode,
        country: formData.country,
        notes: formData.notes ?? null,
        gclid: formData.gclid ?? null,
        appointment_date: formData.appointmentDate,
        appointment_time: formData.appointmentTime,
        timezone: formData.timezone,
        data: {
          session_id: formData.sessionId ?? null,
          selectedServices: formData.selectedServices,
          serviceDocuments: formData.serviceDocuments,
          signatories: formData.signatories || [],
          signatoriesCount: formData.signatoriesCount || 0,
          additionalSignatoriesCount: formData.additionalSignatoriesCount || 0,
          signatoryCount: formData.signatoryCount ?? formData.signatoriesCount ?? null,
          currency,
        },
      };
      const { data: updated, error: updateErr } = await supabase
        .from("submission")
        .update(submissionData)
        .eq("id", submissionId)
        .select()
        .single();
      if (!updateErr && updated) submission = updated as Record<string, unknown>;
    }

    if (!submission) {
      let userId = user?.id ?? null;

      if (!userId && formData.email) {
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const existingUser = users?.find(
          (u) => u.email === (formData.email as string)
        );
        if (existingUser) {
          userId = existingUser.id;
        } else {
          const password =
            (formData.password as string) || crypto.randomUUID();
          const { data: authData, error: authError } =
            await supabase.auth.admin.createUser({
              email: formData.email as string,
              password,
              email_confirm: true,
              user_metadata: {
                first_name: formData.firstName,
                last_name: formData.lastName,
              },
            });
          if (authError)
            throw new Error("Failed to create account: " + authError.message);
          if (authData.user) {
            userId = authData.user.id;
            accountCreated = true;
          }
        }
      }

      if (userId) {
        const { data: existingClient } = await supabase
          .from("client")
          .select("id, stripe_customer_id")
          .eq("user_id", userId)
          .maybeSingle();

        if (existingClient) {
          clientId = (existingClient as { id: string }).id;
          stripeCustomerId = (existingClient as { stripe_customer_id: string | null })
            .stripe_customer_id;
        } else {
          const clientEmail = email || (user?.email as string);
          if (!clientEmail)
            throw new Error("Email is required to create client account");

          const { data: newClient, error: clientError } = await supabase
            .from("client")
            .insert([
              {
                user_id: userId,
                first_name: firstName,
                last_name: lastName,
                email: clientEmail,
                phone: formData.phone || "",
                address: formData.address || "",
                city: formData.city || "",
                postal_code: formData.postalCode || "",
                country: formData.country || "",
              },
            ])
            .select("id")
            .single();

          if (!clientError && newClient)
            clientId = (newClient as { id: string }).id;
        }
      }

      if (clientId && !stripeCustomerId) {
        const clientEmail = email || (user?.email as string);
        const clientName = `${firstName} ${lastName}`.trim();
        // Ne créer le client Stripe que si on a un nom valide (jamais en tant qu'invité)
        if (clientName) {
          try {
            const customer = await stripe.customers.create({
              email: clientEmail,
              name: clientName,
              phone: (formData.phone as string) || undefined,
              metadata: {
                client_id: clientId,
                user_id: userId || "",
              },
            });
            stripeCustomerId = customer.id;
            await supabase
              .from("client")
              .update({ stripe_customer_id: stripeCustomerId })
              .eq("id", clientId);
          } catch {
            // Continue without Stripe customer, use customer_email instead
          }
        }
      }

      if (submissionId && submission) {
        const sub = submission as { data?: { currency?: string } };
        if (!body.currency && sub.data?.currency) {
          currency = (sub.data.currency || "EUR").toUpperCase();
        }
      }

      const submissionData = {
        client_id: clientId,
        status: "pending_payment",
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone || "",
        address: formData.address,
        city: formData.city,
        postal_code: formData.postalCode,
        country: formData.country,
        notes: formData.notes ?? null,
        gclid: formData.gclid ?? null,
        appointment_date: formData.appointmentDate,
        appointment_time: formData.appointmentTime,
        timezone: formData.timezone,
        data: {
          session_id: formData.sessionId ?? null,
          selectedServices: formData.selectedServices,
          serviceDocuments: formData.serviceDocuments,
          signatories: formData.signatories || [],
          signatoriesCount: formData.signatoriesCount || 0,
          additionalSignatoriesCount: formData.additionalSignatoriesCount || 0,
          signatoryCount: formData.signatoryCount ?? formData.signatoriesCount ?? null,
          currency,
        },
      };

      const { data: newSubmission, error: submissionError } = await supabase
        .from("submission")
        .insert([submissionData])
        .select()
        .single();

      if (submissionError)
        throw new Error("Failed to create submission: " + submissionError.message);
      submission = newSubmission as Record<string, unknown>;
      submissionId = (newSubmission as { id: string }).id;
    }

    if (submissionId && submission) {
      const sub = submission as { data?: { currency?: string } };
      if (!body.currency && sub.data?.currency) {
        currency = (sub.data.currency || "EUR").toUpperCase();
      }
    }

    const { data: services, error: servicesError } = await supabase
      .from("services")
      .select("*")
      .eq("is_active", true);

    if (servicesError)
      throw new Error("Failed to fetch services: " + servicesError.message);

    const servicesMap: Record<
      string,
      { name: string; base_price: number; price_usd?: number; price_gbp?: number }
    > = {};
    (services || []).forEach(
      (s: { service_id: string; name: string; base_price: number; price_usd?: number; price_gbp?: number }) => {
        servicesMap[s.service_id] = {
          name: s.name,
          base_price: s.base_price,
          price_usd: s.price_usd,
          price_gbp: s.price_gbp,
        };
      }
    );

    const { data: options } = await supabase
      .from("options")
      .select("*")
      .eq("is_active", true);

    const optionsMap: Record<
      string,
      { name: string; additional_price: number; price_usd?: number; price_gbp?: number }
    > = {};
    (options || []).forEach(
      (o: { option_id: string; name: string; additional_price: number; price_usd?: number; price_gbp?: number }) => {
        optionsMap[o.option_id] = {
          name: o.name,
          additional_price: o.additional_price,
          price_usd: o.price_usd,
          price_gbp: o.price_gbp,
        };
      }
    );

    function getServicePriceForStripe(
      service: { base_price: number; price_usd?: number; price_gbp?: number },
      curr: string
    ): number {
      if (curr === "USD" && service.price_usd != null) return service.price_usd;
      if (curr === "GBP" && service.price_gbp != null) return service.price_gbp;
      return convertPriceToMatchClient(service.base_price ?? 0, curr);
    }
    function getOptionPriceForStripe(
      option: { additional_price: number; price_usd?: number; price_gbp?: number },
      curr: string
    ): number {
      if (curr === "USD" && option.price_usd != null) return option.price_usd;
      if (curr === "GBP" && option.price_gbp != null) return option.price_gbp;
      return convertPriceToMatchClient(option.additional_price ?? 0, curr);
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    const optionCounts: Record<string, number> = {};
    const selectedServices = (formData.selectedServices as string[]) || [];
    const serviceDocuments = (formData.serviceDocuments as Record<
      string,
      Array<{ selectedOptions?: string[] | string }>
    >) || {};

    for (const serviceId of selectedServices) {
      const service = servicesMap[serviceId];
      if (!service) continue;
      const docs = serviceDocuments[serviceId] || [];
      const documentCount = docs.length;
      if (documentCount === 0) continue;

      const priceInCurrency = getServicePriceForStripe(service, currency);
      const unitAmount =
        currency === "JPY"
          ? Math.round(priceInCurrency)
          : Math.round(priceInCurrency * 100);

      lineItems.push({
        price_data: {
          currency: stripeCurrency,
          product_data: {
            name: `${service.name} (${documentCount} document${documentCount > 1 ? "s" : ""})`,
          },
          unit_amount: unitAmount,
        },
        quantity: documentCount,
      });

      for (const doc of docs) {
        let optionsArray: string[] = [];
        const opts = doc.selectedOptions;
        if (opts) {
          if (Array.isArray(opts)) optionsArray = opts;
          else if (typeof opts === "string") {
            try {
              const parsed = JSON.parse(opts);
              optionsArray = Array.isArray(parsed) ? parsed : [opts];
            } catch {
              optionsArray = [opts];
            }
          } else {
            optionsArray = [opts];
          }
        }
        optionsArray.forEach((optId) => {
          optionCounts[optId] = (optionCounts[optId] || 0) + 1;
        });
      }
    }

    for (const [optionId, count] of Object.entries(optionCounts)) {
      const option = optionsMap[optionId];
      if (!option) continue;
      const priceInCurrency = getOptionPriceForStripe(option, currency);
      if (priceInCurrency <= 0) continue;
      const unitAmount =
        currency === "JPY"
          ? Math.round(priceInCurrency)
          : Math.round(priceInCurrency * 100);
      lineItems.push({
        price_data: {
          currency: stripeCurrency,
          product_data: {
            name: `${option.name} (${count} document${count > 1 ? "s" : ""})`,
          },
          unit_amount: unitAmount,
        },
        quantity: count,
      });
    }

    const deliveryMethod = (formData.deliveryMethod as string) || "email";
    const deliveryPostalCostEUR =
      (formData.deliveryPostalCostEUR as number) || 0;

    if (deliveryMethod === "postal" && deliveryPostalCostEUR > 0) {
      const deliveryCostInCurrency = convertPriceToMatchClient(
        deliveryPostalCostEUR,
        currency
      );
      const unitAmount =
        currency === "JPY"
          ? Math.round(deliveryCostInCurrency)
          : Math.round(deliveryCostInCurrency * 100);
      lineItems.push({
        price_data: {
          currency: stripeCurrency,
          product_data: {
            name: "Physical Delivery (DHL Express)",
            description: `Postal delivery via DHL Express (${deliveryPostalCostEUR} EUR)`,
          },
          unit_amount: unitAmount,
        },
        quantity: 1,
      });
    }

    const additionalSignatoriesCount =
      (formData.additionalSignatoriesCount as number) || 0;
    const additionalSignatoriesCostEUR =
      (formData.additionalSignatoriesCost as number) || 0;

    if (additionalSignatoriesCount > 0 && additionalSignatoriesCostEUR > 0) {
      const cost = convertPriceToMatchClient(
        additionalSignatoriesCostEUR,
        currency
      );
      const unitPrice = cost / additionalSignatoriesCount;
      const unitAmount =
        currency === "JPY"
          ? Math.round(unitPrice)
          : Math.round(unitPrice * 100);
      lineItems.push({
        price_data: {
          currency: stripeCurrency,
          product_data: {
            name: `Additional Signatories (${additionalSignatoriesCount} signatory${additionalSignatoriesCount > 1 ? "ies" : ""})`,
            description: `Additional signatories: ${additionalSignatoriesCount} × 45€`,
          },
          unit_amount: unitAmount,
        },
        quantity: additionalSignatoriesCount,
      });
    }

    if (lineItems.length === 0) {
      return NextResponse.json(
        { error: "No valid services with documents selected" },
        { status: 400 }
      );
    }

    const origin =
      request.headers.get("origin") ||
      request.nextUrl.origin ||
      "https://app.mynotary.io";

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment/failed`,
      metadata: {
        submission_id: submissionId as string,
        client_id: clientId ?? "",
        account_created: accountCreated ? "true" : "false",
      },
    };

    let promoCodeApplied = false;

    if (promoCodeId) {
      try {
        const promotionCode = await stripe.promotionCodes.retrieve(promoCodeId);
        if (
          promotionCode.active &&
          promotionCode.coupon?.valid
        ) {
          const canRedeem =
            !promotionCode.max_redemptions ||
            !promotionCode.times_redeemed ||
            promotionCode.times_redeemed < promotionCode.max_redemptions;
          if (canRedeem) {
            sessionParams.discounts = [
              { promotion_code: String(promoCodeId) },
            ];
            promoCodeApplied = true;
          }
        }
      } catch {
        // Fall through to search by code
      }
    }

    if (!promoCodeApplied && promoCode) {
      const promoCodeUpper = String(promoCode).toUpperCase().trim();
      try {
        const { data: promotionCodes } = await stripe.promotionCodes.list({
          code: promoCodeUpper,
          limit: 1,
          active: true,
        });
        const pc = promotionCodes[0];
        if (
          pc &&
          pc.active &&
          pc.coupon?.valid
        ) {
          const canRedeem =
            !pc.max_redemptions ||
            !pc.times_redeemed ||
            pc.times_redeemed < pc.max_redemptions;
          if (canRedeem) {
            sessionParams.discounts = [
              { promotion_code: String(pc.id) },
            ];
            promoCodeApplied = true;
          }
        }
      } catch {
        // Ignore
      }
    }

    if (!promoCodeApplied) {
      sessionParams.allow_promotion_codes = true;
    }

    if (stripeCustomerId) {
      sessionParams.customer = stripeCustomerId;
      sessionParams.payment_method_options = {
        card: { setup_future_usage: "off_session" },
      };
    } else {
      sessionParams.customer_email =
        (formData.email as string) || (user?.email as string);
      sessionParams.payment_method_options = {
        card: { setup_future_usage: "off_session" },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (submissionId) {
      const { data: existingSub } = await supabase
        .from("submission")
        .select("funnel_status")
        .eq("id", submissionId)
        .single();

      const orderMap: Record<string, number> = {
        started: 1,
        services_selected: 2,
        documents_uploaded: 3,
        delivery_method_selected: 4,
        personal_info_completed: 5,
        summary_viewed: 6,
        payment_pending: 7,
        payment_completed: 8,
        submission_completed: 9,
      };
      const currentOrder =
        orderMap[(existingSub as { funnel_status: string })?.funnel_status || ""] || 0;
      if (7 > currentOrder) {
        await supabase
          .from("submission")
          .update({ funnel_status: "payment_pending" })
          .eq("id", submissionId);
      }
    }

    return NextResponse.json({
      url: session.url,
      submissionId,
    });
  } catch (error) {
    console.error("[create-checkout-session]", error);
    const message =
      error instanceof Error ? error.message : "Payment failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
