// Supabase Edge Function pour recevoir les coûts depuis Google Ads Scripts
// Plus simple que l'API OAuth - pas besoin de refresh tokens complexes

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Vérifier l'autorisation - accepter le JWT Supabase (anon key)
    const authHeader = req.headers.get('authorization') || ''
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized',
          message: 'Authorization header missing'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        },
      )
    }
    
    // Extraire le token du header "Bearer TOKEN"
    const token = authHeader.replace('Bearer ', '').trim()
    
    // Vérification basique du JWT (format JWT)
    // En production, vous pourriez vérifier le JWT complètement avec une bibliothèque
    if (!token || !token.includes('.')) {
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized',
          message: 'Invalid token format. Use Supabase anon key as Bearer token.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        },
      )
    }
    
    console.log('Authenticated with Supabase JWT')

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Récupérer les données du body
    const { costs } = await req.json()

    if (!costs || !Array.isArray(costs)) {
      throw new Error('Invalid data format. Expected { costs: [...] }')
    }

    let synced = 0
    let errors = 0

    // Insérer ou mettre à jour chaque coût
    for (const cost of costs) {
      try {
        // Log des données reçues pour déboguer
        console.log('Processing cost:', JSON.stringify(cost))
        
        // Normaliser la date au format YYYY-MM-DD
        let normalizedDate = cost.date
        if (normalizedDate && normalizedDate.includes('/')) {
          // Si format DD/MM/YYYY, convertir en YYYY-MM-DD
          const parts = normalizedDate.split('/')
          if (parts.length === 3) {
            normalizedDate = parts[2] + '-' + parts[1] + '-' + parts[0]
          }
        }
        
        // Vérifier si existe déjà par date et nom de campagne (campaign_id n'existe pas dans la table)
        const { data: existing } = await supabase
          .from('google_ads_costs')
          .select('id')
          .eq('cost_date', normalizedDate)
          .eq('campaign_name', cost.campaign_name || 'Campagne inconnue')
          .maybeSingle()

        const costData: any = {
          cost_amount: parseFloat(cost.cost_amount) || 0,
          cost_date: normalizedDate,
          campaign_name: cost.campaign_name || 'Campagne inconnue',
          description: 'Coût automatique synchronisé depuis Google Ads Scripts',
        }

        console.log('Cost data to insert/update:', JSON.stringify(costData))

        if (existing) {
          // Mettre à jour
          const { error } = await supabase
            .from('google_ads_costs')
            .update(costData)
            .eq('id', existing.id)
          
          if (error) {
            console.error('Update error:', error)
            throw error
          }
        } else {
          // Insérer
          const { error } = await supabase
            .from('google_ads_costs')
            .insert([costData])
          
          if (error) {
            console.error('Insert error:', error)
            throw error
          }
        }

        synced++
      } catch (error: any) {
        console.error(`Error syncing cost for ${cost.date}:`, error)
        console.error('Error details:', JSON.stringify(error))
        errors++
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synchronisé ${synced} coûts, ${errors} erreurs`,
        synced,
        errors,
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

