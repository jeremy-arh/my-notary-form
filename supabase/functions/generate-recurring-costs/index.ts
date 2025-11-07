// Supabase Edge Function pour générer les coûts récurrents
// Déployer avec: supabase functions deploy generate-recurring-costs

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
    // Créer le client Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Récupérer tous les templates récurrents actifs
    const { data: templates, error: fetchError } = await supabaseClient
      .from('webservice_costs')
      .select('*')
      .eq('is_recurring', true)
      .eq('is_active', true)
      .eq('billing_period', 'monthly')
      .is('recurring_template_id', null)

    if (fetchError) throw fetchError

    const currentDate = new Date()
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()
    const monthStart = new Date(currentYear, currentMonth, 1)
    const monthEnd = new Date(currentYear, currentMonth + 1, 0)

    let generatedCount = 0

    for (const template of templates || []) {
      // Extraire le jour du mois de la date de facturation
      const billingDate = new Date(template.billing_date)
      const billingDay = billingDate.getDate()

      // Calculer la date cible pour ce mois
      let targetDate = new Date(currentYear, currentMonth, billingDay)

      // Si le jour n'existe pas dans le mois (ex: 31 février), prendre le dernier jour
      if (targetDate.getMonth() !== currentMonth) {
        targetDate = new Date(monthEnd)
      }

      // Vérifier si une occurrence existe déjà pour ce mois
      const { data: existingCosts, error: checkError } = await supabaseClient
        .from('webservice_costs')
        .select('id')
        .eq('recurring_template_id', template.id)
        .gte('billing_date', monthStart.toISOString().split('T')[0])
        .lte('billing_date', monthEnd.toISOString().split('T')[0])
        .limit(1)

      if (checkError) {
        console.error('Error checking existing costs:', checkError)
        continue
      }

      // Si aucune occurrence n'existe et que la date cible est passée ou aujourd'hui
      if (!existingCosts || existingCosts.length === 0) {
        if (targetDate <= currentDate) {
          // Créer la nouvelle occurrence
          const { error: insertError } = await supabaseClient
            .from('webservice_costs')
            .insert({
              service_name: template.service_name,
              cost_amount: template.cost_amount,
              billing_period: template.billing_period,
              billing_date: targetDate.toISOString().split('T')[0],
              description: template.description,
              is_recurring: false,
              is_active: true,
              recurring_template_id: template.id,
              parent_cost_id: template.id
            })

          if (insertError) {
            console.error('Error inserting recurring cost:', insertError)
          } else {
            generatedCount++
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        generated: generatedCount,
        templates_processed: templates?.length || 0
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

