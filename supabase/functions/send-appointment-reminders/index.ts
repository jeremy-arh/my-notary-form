import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔔 [REMINDERS] Starting appointment reminder check...')

    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0) // Start of tomorrow

    const tomorrowEnd = new Date(tomorrow)
    tomorrowEnd.setHours(23, 59, 59, 999) // End of tomorrow

    // Format dates for SQL query (YYYY-MM-DD)
    const tomorrowDateStr = tomorrow.toISOString().split('T')[0]
    const todayDateStr = now.toISOString().split('T')[0]

    // Calculate 1 hour from now
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)
    const oneHourFromNowTimeStr = oneHourFromNow.toTimeString().slice(0, 5) // HH:MM format

    console.log(`📅 [REMINDERS] Today: ${todayDateStr}, Tomorrow: ${tomorrowDateStr}`)
    console.log(`⏰ [REMINDERS] Current time: ${now.toTimeString().slice(0, 5)}, One hour from now: ${oneHourFromNowTimeStr}`)

    // Find appointments for tomorrow (day before reminder)
    const { data: tomorrowAppointments, error: tomorrowError } = await supabase
      .from('submission')
      .select(`
        id,
        appointment_date,
        appointment_time,
        timezone,
        first_name,
        last_name,
        address,
        city,
        country,
        assigned_notary_id,
        notary:assigned_notary_id(id, email, full_name, timezone)
      `)
      .eq('appointment_date', tomorrowDateStr)
      .in('status', ['confirmed', 'accepted'])
      .not('assigned_notary_id', 'is', null)
      .not('appointment_time', 'is', null)

    if (tomorrowError) {
      console.error('❌ [REMINDERS] Error fetching tomorrow appointments:', tomorrowError)
    } else {
      console.log(`📧 [REMINDERS] Found ${tomorrowAppointments?.length || 0} appointments tomorrow`)
      
      // Send day-before reminders
      if (tomorrowAppointments && tomorrowAppointments.length > 0) {
        for (const appointment of tomorrowAppointments) {
          if (!appointment.notary || !appointment.notary.email) {
            console.warn(`⚠️ [REMINDERS] Appointment ${appointment.id} has no notary email, skipping`)
            continue
          }

          try {
            const notaryName = appointment.notary.full_name || 'Notary'
            const clientName = `${appointment.first_name || ''} ${appointment.last_name || ''}`.trim() || 'Client'
            const submissionNumber = appointment.id.substring(0, 8)

            // Call send-transactional-email Edge Function
            const functionUrl = `${supabaseUrl}/functions/v1/send-transactional-email`
            const functionResponse = await fetch(functionUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'apikey': supabaseServiceKey
              },
              body: JSON.stringify({
                email_type: 'appointment_reminder_day_before',
                recipient_email: appointment.notary.email,
                recipient_name: notaryName,
                recipient_type: 'notary',
                data: {
                  submission_id: appointment.id,
                  submission_number: submissionNumber,
                  client_name: clientName,
                  appointment_date: appointment.appointment_date,
                  appointment_time: appointment.appointment_time,
                  timezone: appointment.timezone || appointment.notary.timezone || 'UTC',
                  address: appointment.address,
                  city: appointment.city,
                  country: appointment.country
                }
              })
            })

            if (!functionResponse.ok) {
              const errorText = await functionResponse.text()
              console.error(`❌ [REMINDERS] Failed to send day-before reminder for appointment ${appointment.id}:`, errorText)
            } else {
              console.log(`✅ [REMINDERS] Day-before reminder sent for appointment ${appointment.id} to ${appointment.notary.email}`)
            }
          } catch (emailError) {
            console.error(`❌ [REMINDERS] Error sending day-before reminder for appointment ${appointment.id}:`, emailError)
          }
        }
      }
    }

    // Find appointments in 1 hour (one hour before reminder)
    // We need to check appointments for today where the time is approximately 1 hour from now
    // Since appointment_time is stored as HH:MM string, we need to compare it
    
    const { data: todayAppointments, error: todayError } = await supabase
      .from('submission')
      .select(`
        id,
        appointment_date,
        appointment_time,
        timezone,
        first_name,
        last_name,
        address,
        city,
        country,
        assigned_notary_id,
        notary:assigned_notary_id(id, email, full_name, timezone)
      `)
      .eq('appointment_date', todayDateStr)
      .in('status', ['confirmed', 'accepted'])
      .not('assigned_notary_id', 'is', null)
      .not('appointment_time', 'is', null)

    if (todayError) {
      console.error('❌ [REMINDERS] Error fetching today appointments:', todayError)
    } else {
      console.log(`📧 [REMINDERS] Found ${todayAppointments?.length || 0} appointments today`)

      // Filter appointments that are approximately 1 hour from now (±5 minutes tolerance)
      const oneHourReminders = (todayAppointments || []).filter((appointment) => {
        if (!appointment.appointment_time) return false

        const [appointmentHour, appointmentMinute] = appointment.appointment_time.split(':').map(Number)
        const appointmentTimeMinutes = appointmentHour * 60 + appointmentMinute

        const [currentHour, currentMinute] = [now.getHours(), now.getMinutes()]
        const currentTimeMinutes = currentHour * 60 + currentMinute

        const [oneHourHour, oneHourMinute] = oneHourFromNowTimeStr.split(':').map(Number)
        const oneHourTimeMinutes = oneHourHour * 60 + oneHourMinute

        // Check if appointment time is within 5 minutes of 1 hour from now
        const timeDiff = Math.abs(appointmentTimeMinutes - oneHourTimeMinutes)
        return timeDiff <= 5 // 5 minutes tolerance
      })

      console.log(`⏰ [REMINDERS] Found ${oneHourReminders.length} appointments in approximately 1 hour`)

      // Send one-hour-before reminders
      if (oneHourReminders.length > 0) {
        for (const appointment of oneHourReminders) {
          if (!appointment.notary || !appointment.notary.email) {
            console.warn(`⚠️ [REMINDERS] Appointment ${appointment.id} has no notary email, skipping`)
            continue
          }

          try {
            const notaryName = appointment.notary.full_name || 'Notary'
            const clientName = `${appointment.first_name || ''} ${appointment.last_name || ''}`.trim() || 'Client'
            const submissionNumber = appointment.id.substring(0, 8)

            // Call send-transactional-email Edge Function
            const functionUrl = `${supabaseUrl}/functions/v1/send-transactional-email`
            const functionResponse = await fetch(functionUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'apikey': supabaseServiceKey
              },
              body: JSON.stringify({
                email_type: 'appointment_reminder_one_hour_before',
                recipient_email: appointment.notary.email,
                recipient_name: notaryName,
                recipient_type: 'notary',
                data: {
                  submission_id: appointment.id,
                  submission_number: submissionNumber,
                  client_name: clientName,
                  appointment_date: appointment.appointment_date,
                  appointment_time: appointment.appointment_time,
                  timezone: appointment.timezone || appointment.notary.timezone || 'UTC',
                  address: appointment.address,
                  city: appointment.city,
                  country: appointment.country
                }
              })
            })

            if (!functionResponse.ok) {
              const errorText = await functionResponse.text()
              console.error(`❌ [REMINDERS] Failed to send one-hour reminder for appointment ${appointment.id}:`, errorText)
            } else {
              console.log(`✅ [REMINDERS] One-hour reminder sent for appointment ${appointment.id} to ${appointment.notary.email}`)
            }
          } catch (emailError) {
            console.error(`❌ [REMINDERS] Error sending one-hour reminder for appointment ${appointment.id}:`, emailError)
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Appointment reminders processed',
        tomorrow_count: tomorrowAppointments?.length || 0,
        one_hour_count: oneHourReminders?.length || 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('❌ [REMINDERS] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

