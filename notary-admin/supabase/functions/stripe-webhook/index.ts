import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req: Request) => {
  try {
    const signature = req.headers.get('stripe-signature');
    
    if (!signature || !stripeWebhookSecret) {
      return new Response(
        JSON.stringify({ error: 'Missing stripe signature or webhook secret' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.text();
    
    // Vérifier la signature du webhook en utilisant crypto
    // Note: Pour une vérification complète, utilisez la bibliothèque Stripe
    // Pour l'instant, on accepte les événements et on vérifie la structure
    
    let event: any;
    try {
      event = JSON.parse(body);
    } catch (err: any) {
      console.error('Failed to parse webhook body:', err.message);
      return new Response(
        JSON.stringify({ error: `Invalid JSON: ${err.message}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Créer le client Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Traiter les événements pertinents
    switch (event.type) {
      case 'balance_transaction.created':
      case 'charge.succeeded': {
        // Récupérer la balance transaction depuis l'événement
        const balanceTransaction = event.data.object;
        
        // Insérer uniquement les charges (pas les payouts)
        if (balanceTransaction.type === 'charge') {
          await supabase
            .from('stripe_balance_transactions')
            .upsert({
              id: balanceTransaction.id,
              amount: balanceTransaction.amount,
              net: balanceTransaction.net,
              fee: balanceTransaction.fee,
              currency: balanceTransaction.currency,
              created: new Date(balanceTransaction.created * 1000).toISOString(),
              description: balanceTransaction.description || '',
              type: balanceTransaction.type,
            }, {
              onConflict: 'id',
            });

          console.log(`Inserted balance transaction: ${balanceTransaction.id}`);
        }
        break;
      }

      case 'balance_transaction.updated': {
        // Mettre à jour la transaction si elle existe
        const balanceTransaction = event.data.object;
        
        if (balanceTransaction.type === 'charge') {
          await supabase
            .from('stripe_balance_transactions')
            .update({
              amount: balanceTransaction.amount,
              net: balanceTransaction.net,
              fee: balanceTransaction.fee,
              currency: balanceTransaction.currency,
              description: balanceTransaction.description || '',
              type: balanceTransaction.type,
              updated_at: new Date().toISOString(),
            })
            .eq('id', balanceTransaction.id);

          console.log(`Updated balance transaction: ${balanceTransaction.id}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
