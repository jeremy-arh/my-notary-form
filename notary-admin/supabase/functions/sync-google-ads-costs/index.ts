// Supabase Edge Function pour synchroniser les coûts Google Ads
// À déployer avec: supabase functions deploy sync-google-ads-costs

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Récupérer les variables d'environnement
    const googleAdsCustomerId = Deno.env.get('GOOGLE_ADS_CUSTOMER_ID')
    const googleAdsDeveloperToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN')
    const googleAdsClientId = Deno.env.get('GOOGLE_ADS_CLIENT_ID')
    const googleAdsClientSecret = Deno.env.get('GOOGLE_ADS_CLIENT_SECRET')
    const googleAdsRefreshToken = Deno.env.get('GOOGLE_ADS_REFRESH_TOKEN')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!googleAdsCustomerId || !googleAdsDeveloperToken) {
      throw new Error('Google Ads credentials not configured')
    }

    // Créer le client Supabase avec les droits admin
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Récupérer les paramètres de la requête
    const { startDate, endDate } = await req.json().catch(() => ({
      startDate: null,
      endDate: null,
    }))

    // Si pas de dates spécifiées, synchroniser le jour précédent
    let syncStartDate = startDate
    let syncEndDate = endDate

    if (!syncStartDate || !syncEndDate) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      syncStartDate = yesterday.toISOString().split('T')[0]
      syncEndDate = syncStartDate
    }

    // TODO: Implémenter l'appel à l'API Google Ads
    // Pour l'instant, cette fonction est un template
    // Vous devrez installer le package google-ads-api et implémenter la logique
    
    /*
    Exemple d'implémentation avec google-ads-api:
    
    const { GoogleAdsApi } = require('google-ads-api')
    
    const client = new GoogleAdsApi({
      client_id: googleAdsClientId,
      client_secret: googleAdsClientSecret,
      developer_token: googleAdsDeveloperToken,
    })

    const customer = client.Customer({
      customer_id: googleAdsCustomerId,
      refresh_token: googleAdsRefreshToken,
    })

    const report = await customer.report({
      entity: 'campaign',
      attributes: [
        'campaign.id',
        'campaign.name',
        'segments.date',
        'metrics.cost_micros',
        'metrics.currency_code',
      ],
      constraints: {
        'segments.date': {
          between: syncStartDate,
          and: syncEndDate,
        },
      },
      limit: 10000,
    })

    // Synchroniser avec la base de données
    for (const row of report) {
      const costData = {
        cost_amount: row.metrics.cost_micros / 1000000,
        cost_date: row.segments.date,
        campaign_name: row.campaign.name,
        campaign_id: row.campaign.id.toString(),
        description: 'Coût automatique synchronisé depuis Google Ads API',
      }

      // Vérifier si existe déjà
      const { data: existing } = await supabase
        .from('google_ads_costs')
        .select('id')
        .eq('cost_date', costData.cost_date)
        .eq('campaign_id', costData.campaign_id)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('google_ads_costs')
          .update(costData)
          .eq('id', existing.id)
      } else {
        await supabase
          .from('google_ads_costs')
          .insert([costData])
      }
    }
    */

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Google Ads costs sync initiated',
        dateRange: { start: syncStartDate, end: syncEndDate },
        note: 'Cette fonction nécessite l\'implémentation complète de l\'API Google Ads',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})



