import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LocalizedLineItem {
  type: 'service' | 'option' | 'delivery' | 'additional_signatories';
  id: string;
  name: string;
  quantity: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { formData, currency: requestCurrency, submissionId } = await req.json();
    const currency = (requestCurrency || formData?.currency || 'EUR').toUpperCase();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Récupérer les libellés traduits depuis formData
    const localizedNames = formData?.localizedNames || {};
    const localizedLineItems: LocalizedLineItem[] = formData?.localizedLineItems || [];
    const language = formData?.language || 'en';

    console.log('🌍 Language:', language);
    console.log('📝 Localized names:', JSON.stringify(localizedNames, null, 2));
    console.log('📋 Localized line items:', JSON.stringify(localizedLineItems, null, 2));

    const lineItems: any[] = [];
    let totalAmount = 0;

    // Fonction pour convertir la devise
    const convertCurrency = async (amountEUR: number, targetCurrency: string): Promise<number> => {
      if (targetCurrency === 'EUR') return amountEUR;
      
      try {
        const response = await fetch(
          `https://api.exchangerate-api.com/v4/latest/EUR`
        );
        const data = await response.json();
        const rate = data.rates[targetCurrency];
        if (rate) {
          return amountEUR * rate;
        }
      } catch (error) {
        console.error('Error converting currency:', error);
      }
      return amountEUR; // Fallback sur EUR si la conversion échoue
    };

    // Traiter les services et options
    if (formData.selectedServices && formData.selectedServices.length > 0) {
      for (const serviceId of formData.selectedServices) {
        // Récupérer le service depuis la DB
        const { data: service, error: serviceError } = await supabase
          .from('services')
          .select('*')
          .eq('service_id', serviceId)
          .eq('is_active', true)
          .single();

        if (serviceError || !service) {
          console.error(`Service ${serviceId} not found:`, serviceError);
          continue;
        }

        const documents = formData.serviceDocuments?.[serviceId] || [];
        if (documents.length === 0) continue;

        // Utiliser le nom traduit depuis localizedNames
        const localizedName = localizedNames[`service_${serviceId}`] || service.name;
        
        // Convertir le prix en devise cible
        const servicePriceEUR = service.base_price || 0;
        const servicePrice = await convertCurrency(servicePriceEUR, currency);
        const servicePriceInCents = Math.round(servicePrice * 100 * documents.length);

        lineItems.push({
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: localizedName, // ✅ Utiliser le nom traduit
            },
            unit_amount: Math.round(servicePrice * 100), // Prix unitaire en cents
          },
          quantity: documents.length,
        });

        totalAmount += servicePriceInCents;

        // Traiter les options pour chaque document
        for (const doc of documents) {
          if (doc.selectedOptions && doc.selectedOptions.length > 0) {
            for (const optionId of doc.selectedOptions) {
              const { data: option, error: optionError } = await supabase
                .from('options')
                .select('*')
                .eq('option_id', optionId)
                .eq('is_active', true)
                .single();

              if (optionError || !option) {
                console.error(`Option ${optionId} not found:`, optionError);
                continue;
              }

              // Utiliser le nom traduit depuis localizedNames
              const localizedOptionName = localizedNames[`option_${optionId}`] || option.name;
              
              // Convertir le prix en devise cible
              const optionPriceEUR = option.additional_price || 0;
              const optionPrice = await convertCurrency(optionPriceEUR, currency);
              const optionPriceInCents = Math.round(optionPrice * 100);

              lineItems.push({
                price_data: {
                  currency: currency.toLowerCase(),
                  product_data: {
                    name: localizedOptionName, // ✅ Utiliser le nom traduit
                  },
                  unit_amount: optionPriceInCents,
                },
                quantity: 1,
              });

              totalAmount += optionPriceInCents;
            }
          }
        }
      }
    }

    // Ajouter la livraison postale si sélectionnée
    if (formData.deliveryMethod === 'postal') {
      const deliveryPriceEUR = formData.deliveryPostalCostEUR || 49.95;
      const deliveryPrice = await convertCurrency(deliveryPriceEUR, currency);
      const deliveryPriceInCents = Math.round(deliveryPrice * 100);

      // Utiliser le nom traduit depuis localizedNames
      const localizedDeliveryName = localizedNames['delivery_postal'] || 'Physical delivery (DHL Express)';

      lineItems.push({
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            name: localizedDeliveryName, // ✅ Utiliser le nom traduit
          },
          unit_amount: deliveryPriceInCents,
        },
        quantity: 1,
      });

      totalAmount += deliveryPriceInCents;
    }

    // Ajouter les signataires supplémentaires
    const additionalSignatoriesCount = formData.additionalSignatoriesCount || 0;
    if (additionalSignatoriesCount > 0) {
      const additionalSignatoriesCostEUR = formData.additionalSignatoriesCost || 0;
      const additionalSignatoriesCost = await convertCurrency(additionalSignatoriesCostEUR, currency);
      const additionalSignatoriesCostInCents = Math.round(additionalSignatoriesCost * 100);

      // Utiliser le nom traduit depuis localizedNames
      const localizedSignatoriesName = localizedNames['additional_signatories'] || 'Additional Signatories';
      const signatoriesDisplayName = `${localizedSignatoriesName} (${additionalSignatoriesCount})`;

      lineItems.push({
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            name: signatoriesDisplayName, // ✅ Utiliser le nom traduit avec quantité
          },
          unit_amount: Math.round(additionalSignatoriesCostInCents / additionalSignatoriesCount), // Prix unitaire
        },
        quantity: additionalSignatoriesCount,
      });

      totalAmount += additionalSignatoriesCostInCents;
    }

    // Créer la session Stripe Checkout
    // Format correct pour l'API Stripe REST avec line_items
    const params = new URLSearchParams();
    params.append('payment_method_types[]', 'card');
    params.append('mode', 'payment');
    params.append('success_url', `${Deno.env.get('SITE_URL') || 'http://localhost:5173'}/payment/success?session_id={CHECKOUT_SESSION_ID}`);
    params.append('cancel_url', `${Deno.env.get('SITE_URL') || 'http://localhost:5173'}/payment/failed`);
    
    if (formData.email) {
      params.append('customer_email', formData.email);
    }
    
    params.append('metadata[language]', language);
    if (submissionId) {
      params.append('metadata[submission_id]', submissionId);
    }

    // Ajouter les line_items au format correct pour Stripe
    lineItems.forEach((item, index) => {
      params.append(`line_items[${index}][price_data][currency]`, item.price_data.currency);
      params.append(`line_items[${index}][price_data][product_data][name]`, item.price_data.product_data.name);
      params.append(`line_items[${index}][price_data][unit_amount]`, item.price_data.unit_amount.toString());
      params.append(`line_items[${index}][quantity]`, item.quantity.toString());
    });

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
      },
      body: params,
    });

    if (!stripeResponse.ok) {
      const errorText = await stripeResponse.text();
      console.error('Stripe API error:', errorText);
      throw new Error(`Stripe API error: ${stripeResponse.status} - ${errorText}`);
    }

    const session = await stripeResponse.json();

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

