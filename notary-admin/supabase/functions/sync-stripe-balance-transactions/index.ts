import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const stripeApiKey = Deno.env.get('STRIPE_SECRET_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req: Request) => {
  try {
    // Vérifier l'authentification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!stripeApiKey) {
      return new Response(
        JSON.stringify({ error: 'STRIPE_SECRET_KEY not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Créer le client Supabase avec la clé de service
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Appeler l'API Stripe pour récupérer les balance transactions
    const stripeUrl = 'https://api.stripe.com/v1/balance_transactions';
    const limit = 100; // Stripe limite à 100 par page
    
    let allTransactions: any[] = [];
    let hasMore = true;
    let startingAfter: string | null = null;

    while (hasMore) {
      const params = new URLSearchParams({
        limit: limit.toString(),
        expand: ['data.balance_transaction'].join(','),
      });
      
      if (startingAfter) {
        params.append('starting_after', startingAfter);
      }

      const response = await fetch(`${stripeUrl}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${stripeApiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Stripe API error:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch from Stripe API', details: errorText }),
          { status: response.status, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      const transactions = data.data || [];

      // Filtrer uniquement les charges
      const charges = transactions.filter((t: any) => t.type === 'charge');
      
      // Transformer les données pour les insérer dans la table
      const transactionsToInsert = charges.map((t: any) => ({
        id: t.id,
        amount: t.amount,
        net: t.net,
        fee: t.fee,
        currency: t.currency,
        created: new Date(t.created * 1000).toISOString(), // Convertir timestamp Unix en ISO
        description: t.description || null,
        type: t.type,
      }));

      // Insérer ou mettre à jour les transactions (upsert)
      if (transactionsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('stripe_balance_transactions')
          .upsert(transactionsToInsert, {
            onConflict: 'id',
            ignoreDuplicates: false,
          });

        if (insertError) {
          console.error('Error inserting transactions:', insertError);
          return new Response(
            JSON.stringify({ error: 'Failed to insert transactions', details: insertError.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }

        allTransactions.push(...transactionsToInsert);
      }

      // Vérifier s'il y a plus de pages
      hasMore = data.has_more === true;
      if (hasMore && transactions.length > 0) {
        startingAfter = transactions[transactions.length - 1].id;
      } else {
        hasMore = false;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synchronized ${allTransactions.length} balance transactions`,
        count: allTransactions.length,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
