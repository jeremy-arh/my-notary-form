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

    if (fetchError) {
      console.error('Error fetching templates:', fetchError)
      throw fetchError
    }

    console.log(`Found ${templates?.length || 0} active recurring templates`)
    if (templates && templates.length > 0) {
      templates.forEach(t => {
        console.log(`- Template: ${t.service_name}, billing_date: ${t.billing_date}, id: ${t.id}`)
      })
    }

    const currentDate = new Date()
    const currentDateStr = currentDate.toISOString().split('T')[0] // YYYY-MM-DD
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()
    const monthStart = new Date(currentYear, currentMonth, 1)
    const monthEnd = new Date(currentYear, currentMonth + 1, 0)
    const monthStartStr = monthStart.toISOString().split('T')[0]
    const monthEndStr = monthEnd.toISOString().split('T')[0]

    console.log(`Processing recurring costs for ${currentDateStr} (month: ${monthStartStr} to ${monthEndStr})`)

    let generatedCount = 0

    for (const template of templates || []) {
      try {
        // Extraire le jour du mois de la date de facturation
        const billingDate = new Date(template.billing_date)
        const billingDay = billingDate.getDate()
        const templateYear = billingDate.getFullYear()
        const templateMonth = billingDate.getMonth()
        
        // Calculer le mois du template
        const templateMonthStart = new Date(templateYear, templateMonth, 1)
        const templateMonthStartStr = templateMonthStart.toISOString().split('T')[0]

        // Calculer la date cible pour le mois actuel
        let targetDate = new Date(currentYear, currentMonth, billingDay)

        // Si le jour n'existe pas dans le mois (ex: 31 février), prendre le dernier jour
        if (targetDate.getMonth() !== currentMonth) {
          targetDate = new Date(monthEnd)
        }

        const targetDateStr = targetDate.toISOString().split('T')[0] // YYYY-MM-DD

        console.log(`Template "${template.service_name}": billing_day=${billingDay}, template_month=${templateMonthStartStr}, target_date=${targetDateStr}, current_date=${currentDateStr}`)

        // IMPORTANT: Ne pas créer d'occurrence si le template est dans le même mois que la date cible
        // Le template lui-même sert déjà pour ce mois
        if (templateMonthStartStr === monthStartStr) {
          console.log(`Skipping template "${template.service_name}": template is in the same month as target date (${templateMonthStartStr} = ${monthStartStr})`)
          continue
        }

        // Vérifier si une occurrence existe déjà pour ce mois
        const { data: existingCosts, error: checkError } = await supabaseClient
          .from('webservice_costs')
          .select('id, billing_date')
          .eq('recurring_template_id', template.id)
          .gte('billing_date', monthStartStr)
          .lte('billing_date', monthEndStr)
          .limit(1)

        if (checkError) {
          console.error(`Error checking existing costs for template ${template.id}:`, checkError)
          continue
        }

        // Si aucune occurrence n'existe pour ce mois
        if (!existingCosts || existingCosts.length === 0) {
          // Créer la ligne si la date cible est aujourd'hui ou dans le passé
          // On compare les dates au format string pour éviter les problèmes d'heure
          if (targetDateStr <= currentDateStr) {
            console.log(`Creating recurring cost for "${template.service_name}" on ${targetDateStr}`)
            
            // Créer la nouvelle occurrence
            const { data: insertedData, error: insertError } = await supabaseClient
              .from('webservice_costs')
              .insert({
                service_name: template.service_name,
                cost_amount: template.cost_amount,
                billing_period: template.billing_period,
                billing_date: targetDateStr,
                description: template.description,
                is_recurring: false,
                is_active: true,
                recurring_template_id: template.id,
                parent_cost_id: template.id
              })
              .select()

            if (insertError) {
              console.error(`Error inserting recurring cost for template ${template.id}:`, insertError)
            } else {
              console.log(`Successfully created recurring cost:`, insertedData)
              generatedCount++
            }
          } else {
            console.log(`Skipping template "${template.service_name}": target_date ${targetDateStr} is in the future`)
          }
        } else {
          console.log(`Template "${template.service_name}": occurrence already exists for this month (${existingCosts[0].billing_date})`)
        }
      } catch (error) {
        console.error(`Error processing template ${template.id}:`, error)
        continue
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

