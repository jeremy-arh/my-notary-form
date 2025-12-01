import { serve } from 'https://deno.land/std@0.177.1/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Fonction de conversion de devises (EUR vers autres devises)
// Les prix dans la base de données sont stockés en EUR
const convertCurrency = (amountEUR: number, targetCurrency: string): number => {
  const exchangeRates: { [key: string]: number } = {
    'EUR': 1.0,
    'USD': 1.10, // Exemple: 1 EUR = 1.10 USD
    'GBP': 0.85, // Exemple: 1 EUR = 0.85 GBP
    'CAD': 1.50, // Exemple: 1 EUR = 1.50 CAD
    'AUD': 1.65, // Exemple: 1 EUR = 1.65 AUD
    'CHF': 0.95, // Exemple: 1 EUR = 0.95 CHF
    'JPY': 165.0, // Exemple: 1 EUR = 165 JPY
    'CNY': 7.80, // Exemple: 1 EUR = 7.80 CNY
  }
  
  const rate = exchangeRates[targetCurrency.toUpperCase()] || 1.0
  return amountEUR * rate
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: corsHeaders
    })
  }

  try {
    const body = await req.json()
    console.log('📥 [UPDATE-PAYMENT] Received request:', JSON.stringify(body, null, 2))
    
    const { submissionId, newAmount, oldAmount } = body

    if (!submissionId) {
      console.error('❌ [UPDATE-PAYMENT] Missing required parameter: submissionId')
      throw new Error('Missing required parameter: submissionId')
    }

    if (newAmount === undefined || newAmount === null) {
      console.error('❌ [UPDATE-PAYMENT] Missing required parameter: newAmount')
      throw new Error('Missing required parameter: newAmount')
    }
    
    // Validate that newAmount is a valid number
    const parsedNewAmount = typeof newAmount === 'string' ? parseFloat(newAmount) : newAmount
    if (isNaN(parsedNewAmount) || !isFinite(parsedNewAmount)) {
      console.error('❌ [UPDATE-PAYMENT] Invalid newAmount value:', newAmount)
      throw new Error(`Invalid newAmount value: ${newAmount}. Must be a valid number.`)
    }
    
    const validatedNewAmount = parsedNewAmount
    console.log('✅ [UPDATE-PAYMENT] Parameters validated - WILL UPDATE PRICE:', { 
      submissionId, 
      newAmount: validatedNewAmount, 
      oldAmount
    })

    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the submission
    const { data: submission, error: fetchError } = await supabase
      .from('submission')
      .select('*')
      .eq('id', submissionId)
      .single()

    if (fetchError || !submission) {
      throw new Error('Submission not found')
    }

    // Récupérer la devise depuis la submission (par défaut EUR)
    const currency = (submission.data?.currency || 'EUR').toUpperCase()
    const stripeCurrency = currency.toLowerCase() // Stripe utilise des codes en minuscules
    console.log('💰 [UPDATE-PAYMENT] Devise de la submission:', currency, '(Stripe:', stripeCurrency + ')')

    // Get Stripe customer ID from client record if available
    let stripeCustomerId: string | null = null
    if (submission.client_id) {
      const { data: client, error: clientError } = await supabase
        .from('client')
        .select('stripe_customer_id')
        .eq('id', submission.client_id)
        .single()
      
      if (!clientError && client && client.stripe_customer_id) {
        stripeCustomerId = client.stripe_customer_id
        console.log('✅ [UPDATE-PAYMENT] Found Stripe customer ID from client table:', stripeCustomerId)
      } else {
        console.log('⚠️ [UPDATE-PAYMENT] No stripe_customer_id found in client table, will try to get customer from payment intent')
      }
    } else {
      console.log('⚠️ [UPDATE-PAYMENT] No client_id found, will try to get customer from payment intent')
    }

    // Get payment information
    const paymentInfo = submission.data?.payment
    if (!paymentInfo) {
      console.error('❌ [UPDATE-PAYMENT] No payment info in submission data:', {
        submissionId,
        hasData: !!submission.data,
        dataKeys: submission.data ? Object.keys(submission.data) : []
      })
      throw new Error('No payment information found for this submission')
    }
    
    if (!paymentInfo.stripe_session_id) {
      console.error('❌ [UPDATE-PAYMENT] No stripe_session_id in payment info:', {
        submissionId,
        paymentInfoKeys: Object.keys(paymentInfo),
        paymentInfo
      })
      throw new Error('No Stripe session ID found in payment information')
    }

    // Retrieve the Stripe session
    console.log('🔍 [UPDATE-PAYMENT] Retrieving Stripe session:', paymentInfo.stripe_session_id)
    const session = await stripe.checkout.sessions.retrieve(paymentInfo.stripe_session_id, {
      expand: ['payment_intent']
    })

    console.log('✅ [UPDATE-PAYMENT] Session retrieved:', {
      id: session.id,
      payment_intent: session.payment_intent ? (typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id) : null,
      customer: session.customer,
      payment_status: session.payment_status
    })

    if (!session.payment_intent) {
      console.error('❌ [UPDATE-PAYMENT] No payment intent in session:', {
        session_id: session.id,
        payment_status: session.payment_status,
        payment_intent: session.payment_intent,
        session_keys: Object.keys(session)
      })
      throw new Error(`Payment intent not found in session. Payment status: ${session.payment_status}`)
    }

    const paymentIntentId = typeof session.payment_intent === 'string' 
      ? session.payment_intent 
      : session.payment_intent.id

    console.log('🔍 [UPDATE-PAYMENT] Retrieving payment intent:', paymentIntentId)

    // Retrieve the full payment intent with expanded data
    let paymentIntent: Stripe.PaymentIntent
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ['payment_method', 'latest_charge']
      })
    } catch (retrieveError: any) {
      console.error('❌ [UPDATE-PAYMENT] Error retrieving payment intent:', {
        paymentIntentId,
        error: retrieveError.message,
        type: retrieveError.type,
        code: retrieveError.code
      })
      throw new Error(`Failed to retrieve payment intent: ${retrieveError.message}`)
    }
    
    console.log('✅ [UPDATE-PAYMENT] Payment intent retrieved:', {
      id: paymentIntent.id,
      customer: paymentIntent.customer,
      payment_method: paymentIntent.payment_method ? (typeof paymentIntent.payment_method === 'string' ? paymentIntent.payment_method : paymentIntent.payment_method.id) : null,
      amount: paymentIntent.amount,
      status: paymentIntent.status,
      latest_charge: paymentIntent.latest_charge ? (typeof paymentIntent.latest_charge === 'string' ? paymentIntent.latest_charge : paymentIntent.latest_charge.id) : null,
      charges: paymentIntent.charges?.data?.length || 0
    })

    // Prepare metadata update with submission information
    // Note: Stripe Checkout Sessions cannot be updated after creation, only PaymentIntents can be updated
    const updateStripeMetadata = async () => {
      console.log('🔄 [UPDATE-PAYMENT] Updating Stripe metadata with submission information')
      
      const submissionMetadata = {
        submission_id: submissionId,
        submission_number: submissionId.substring(0, 8),
        client_name: `${submission.first_name || ''} ${submission.last_name || ''}`.trim(),
        client_email: submission.email || '',
        total_price: (submission.total_price || 0).toString(),
        notary_cost: (submission.notary_cost || 0).toString(),
        status: submission.status || '',
        updated_at: new Date().toISOString()
      }

      // Update payment intent metadata (Checkout Sessions cannot be updated)
      try {
        await stripe.paymentIntents.update(paymentIntentId, {
          metadata: {
            ...(paymentIntent.metadata || {}),
            ...submissionMetadata
          }
        })
        console.log('✅ [UPDATE-PAYMENT] Payment intent metadata updated')
      } catch (piError: any) {
        console.warn('⚠️ [UPDATE-PAYMENT] Could not update payment intent metadata:', piError.message)
      }
    }

    // Calculate the actual amount paid (original payment intent amount in dollars)
    const originalPaidAmount = paymentIntent.amount / 100 // Convert from cents to dollars
    
    // Get total refunded amount for this payment intent
    let totalRefundedAmount = 0
    try {
      const refunds = await stripe.refunds.list({
        payment_intent: paymentIntentId,
        limit: 100
      })
      totalRefundedAmount = refunds.data.reduce((sum, refund) => sum + refund.amount, 0) / 100 // Convert to dollars
      console.log('💰 [UPDATE-PAYMENT] Total refunded amount:', totalRefundedAmount)
    } catch (refundListError: any) {
      console.warn('⚠️ [UPDATE-PAYMENT] Could not retrieve refunds list:', refundListError.message)
    }

    // Calculate net amount paid (original - refunds)
    const netPaidAmount = originalPaidAmount - totalRefundedAmount
    
    // Calculate difference: new amount - net amount actually paid
    const difference = validatedNewAmount - netPaidAmount
    const differenceInCents = Math.round(difference * 100)

    console.log('💰 [UPDATE-PAYMENT] Payment calculation:', {
      originalPaidAmount,
      totalRefundedAmount,
      netPaidAmount,
      newAmount: validatedNewAmount,
      oldAmount,
      difference,
      differenceInCents
    })

    // Validate payment intent status for refunds
    if (differenceInCents < 0 && paymentIntent.status !== 'succeeded') {
      console.error('❌ [UPDATE-PAYMENT] Cannot refund payment intent that is not succeeded:', {
        status: paymentIntent.status,
        id: paymentIntent.id
      })
      throw new Error(`Cannot refund payment intent with status: ${paymentIntent.status}. Payment must be succeeded.`)
    }

    let result

    // If price hasn't changed (within 1 cent tolerance), just update metadata and return
    if (Math.abs(differenceInCents) < 1) {
      console.log('💰 [UPDATE-PAYMENT] Price difference is less than 1 cent, updating metadata only')
      await updateStripeMetadata()
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No price change needed (difference < 1 cent), metadata updated',
          newAmount: validatedNewAmount,
          netPaidAmount
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }
    
    console.log('💰 [UPDATE-PAYMENT] PRICE CHANGE DETECTED - Will charge/refund:', {
      difference: difference.toFixed(2),
      differenceInCents,
      action: differenceInCents > 0 ? 'CHARGE' : 'REFUND'
    })

    if (differenceInCents > 0) {
      // Amount increased - charge additional amount
      console.log(`💰 [UPDATE-PAYMENT] Charging additional $${difference.toFixed(2)} (${differenceInCents} cents)`)

      let customerId: string | null = stripeCustomerId || null // Use customer from client table first
      let paymentMethodId: string | null = null

      // If we don't have customer from client table, try to get it from payment intent
      if (!customerId && paymentIntent.customer && typeof paymentIntent.customer === 'string') {
        customerId = paymentIntent.customer
        console.log('✅ [UPDATE-PAYMENT] Customer found in payment intent (fallback):', customerId)
      } else if (customerId) {
        console.log('✅ [UPDATE-PAYMENT] Using Stripe customer ID from client table:', customerId)
      }

      // If we have a customer ID from the client table, try to charge automatically
      if (customerId) {
        console.log('✅ [UPDATE-PAYMENT] Customer ID available, attempting automatic charge')
        
        try {
          // Get customer's default payment method or list of payment methods
          console.log('🔍 [UPDATE-PAYMENT] Retrieving customer to find payment methods:', customerId)
          const customer = await stripe.customers.retrieve(customerId, {
            expand: ['invoice_settings.default_payment_method']
          })
          
          console.log('🔍 [UPDATE-PAYMENT] Customer retrieved:', {
            id: customer.id,
            email: customer.email,
            hasDefaultPM: !!customer.invoice_settings?.default_payment_method
          })
          
          let paymentMethodId: string | null = null
          
          // Try to get default payment method
          if (customer.invoice_settings?.default_payment_method) {
            const defaultPM = customer.invoice_settings.default_payment_method
            paymentMethodId = typeof defaultPM === 'string' ? defaultPM : defaultPM.id
            console.log('✅ [UPDATE-PAYMENT] Found default payment method:', paymentMethodId)
          } else {
            // List customer's payment methods
            console.log('🔍 [UPDATE-PAYMENT] No default payment method, listing customer payment methods')
            const paymentMethods = await stripe.paymentMethods.list({
              customer: customerId,
              type: 'card'
            })
            
            console.log('🔍 [UPDATE-PAYMENT] Found payment methods:', paymentMethods.data.length)
            
            if (paymentMethods.data.length > 0) {
              paymentMethodId = paymentMethods.data[0].id
              console.log('✅ [UPDATE-PAYMENT] Using first payment method from customer:', paymentMethodId)
            } else {
              console.warn('⚠️ [UPDATE-PAYMENT] No payment methods found for customer')
            }
          }
          
          if (paymentMethodId) {
            // Try to charge automatically with off_session
            try {
              console.log('💳 [UPDATE-PAYMENT] Attempting automatic charge with saved payment method')
              
              const additionalPaymentIntent = await stripe.paymentIntents.create({
                amount: Math.abs(differenceInCents),
                currency: stripeCurrency,
                customer: customerId,
                payment_method: paymentMethodId,
                off_session: true,
                confirm: true,
                description: `Additional charge for submission ${submissionId.substring(0, 8)}`,
                metadata: {
                  submission_id: submissionId,
                  type: 'additional_charge',
                  net_paid_amount: netPaidAmount.toString(),
                  new_amount: validatedNewAmount.toString(),
                  difference: difference.toString()
                }
              })
              
              console.log('✅ [UPDATE-PAYMENT] Payment intent created:', {
                id: additionalPaymentIntent.id,
                status: additionalPaymentIntent.status
              })
              
              // Check if payment requires action
              if (additionalPaymentIntent.status === 'requires_action' || 
                  additionalPaymentIntent.status === 'requires_payment_method' ||
                  additionalPaymentIntent.status === 'requires_confirmation') {
                console.warn('⚠️ [UPDATE-PAYMENT] Payment requires customer action. Status:', additionalPaymentIntent.status)
                throw new Error('Payment requires customer authentication')
              }
              
              // Check if payment succeeded
              if (additionalPaymentIntent.status === 'succeeded') {
                console.log('✅ [UPDATE-PAYMENT] Payment succeeded automatically - NO CHECKOUT SESSION NEEDED')
                result = {
                  success: true,
                  type: 'charge',
                  amount: difference,
                  payment_intent_id: additionalPaymentIntent.id,
                  requires_customer_action: false, // Explicitly set to false
                  message: `Successfully charged additional $${difference.toFixed(2)} automatically`
                }
              } else if (additionalPaymentIntent.status === 'processing') {
                console.log('⏳ [UPDATE-PAYMENT] Payment is processing - NO CHECKOUT SESSION NEEDED')
                result = {
                  success: true,
                  type: 'charge',
                  amount: difference,
                  payment_intent_id: additionalPaymentIntent.id,
                  requires_customer_action: false, // Explicitly set to false
                  message: `Payment of $${difference.toFixed(2)} is being processed`
                }
              } else {
                console.warn('⚠️ [UPDATE-PAYMENT] Unexpected payment status:', additionalPaymentIntent.status)
                throw new Error(`Unexpected payment status: ${additionalPaymentIntent.status}`)
              }
            } catch (chargeError: any) {
              // If automatic charge fails, create checkout session as fallback
              console.warn('⚠️ [UPDATE-PAYMENT] Automatic charge failed:', chargeError.message)
              console.log('🔄 [UPDATE-PAYMENT] Creating checkout session as fallback')
              
              const checkoutSession = await stripe.checkout.sessions.create({
                customer: customerId,
                payment_method_types: ['card'],
                line_items: [
                  {
                    price_data: {
                      currency: stripeCurrency,
                      product_data: {
                        name: `Additional charge for submission ${submissionId.substring(0, 8)}`,
                        description: `Price adjustment: Net paid ${currency}${netPaidAmount.toFixed(2)} → New ${currency}${validatedNewAmount.toFixed(2)}`
                      },
                      unit_amount: Math.abs(differenceInCents)
                    },
                    quantity: 1
                  }
                ],
                mode: 'payment',
                success_url: `${Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '') || ''}/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '') || ''}/cancel`,
                metadata: {
                  submission_id: submissionId,
                  type: 'additional_charge',
                  net_paid_amount: netPaidAmount.toString(),
                  new_amount: validatedNewAmount.toString(),
                  difference: difference.toString()
                },
                allow_promotion_codes: false
              })
              
              console.log('✅ [UPDATE-PAYMENT] Checkout session created:', checkoutSession.id)
              
              result = {
                success: true,
                type: 'charge',
                amount: difference,
                checkout_session_id: checkoutSession.id,
                checkout_url: checkoutSession.url,
                requires_customer_action: true,
                message: `Automatic charge failed. Checkout session created for additional $${difference.toFixed(2)}. Customer must complete payment.`
              }
            }
          } else {
            // No payment method found - create checkout session
            console.log('⚠️ [UPDATE-PAYMENT] No saved payment method found. Creating checkout session.')
            
            const checkoutSession = await stripe.checkout.sessions.create({
              customer: customerId,
              payment_method_types: ['card'],
              line_items: [
                {
                  price_data: {
                    currency: stripeCurrency,
                    product_data: {
                      name: `Additional charge for submission ${submissionId.substring(0, 8)}`,
                      description: `Price adjustment: Net paid ${currency}${netPaidAmount.toFixed(2)} → New ${currency}${validatedNewAmount.toFixed(2)}`
                    },
                    unit_amount: Math.abs(differenceInCents)
                  },
                  quantity: 1
                }
              ],
              mode: 'payment',
              success_url: `${Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '') || ''}/success?session_id={CHECKOUT_SESSION_ID}`,
              cancel_url: `${Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '') || ''}/cancel`,
              metadata: {
                submission_id: submissionId,
                type: 'additional_charge',
                net_paid_amount: netPaidAmount.toString(),
                new_amount: validatedNewAmount.toString(),
                difference: difference.toString()
              },
              allow_promotion_codes: false
            })
            
            console.log('✅ [UPDATE-PAYMENT] Checkout session created:', checkoutSession.id)
            
            result = {
              success: true,
              type: 'charge',
              amount: difference,
              checkout_session_id: checkoutSession.id,
              checkout_url: checkoutSession.url,
              requires_customer_action: true,
              message: `No saved payment method. Checkout session created for additional $${difference.toFixed(2)}. Customer must complete payment.`
            }
          }
        } catch (error: any) {
          console.error('❌ [UPDATE-PAYMENT] Error processing automatic charge:', error)
          throw new Error(`Failed to process additional charge: ${error.message}`)
        }
      } else {
        // No customer ID - try to get payment method and create checkout session
        let paymentMethodId: string | null = null

        // Get payment method from payment intent
        if (paymentIntent.payment_method) {
          paymentMethodId = typeof paymentIntent.payment_method === 'string' 
            ? paymentIntent.payment_method 
            : paymentIntent.payment_method.id
          console.log('✅ [UPDATE-PAYMENT] Payment method found in payment intent:', paymentMethodId)
        }

        // If no payment method, try to get it from the latest charge
        if (!paymentMethodId && paymentIntent.latest_charge) {
          const chargeId = typeof paymentIntent.latest_charge === 'string' 
            ? paymentIntent.latest_charge 
            : paymentIntent.latest_charge.id
          
          console.log('🔍 [UPDATE-PAYMENT] Retrieving charge to get payment method:', chargeId)
          const charge = await stripe.charges.retrieve(chargeId)
          
          if (charge.payment_method) {
            paymentMethodId = typeof charge.payment_method === 'string' ? charge.payment_method : charge.payment_method.id || null
            console.log('✅ [UPDATE-PAYMENT] Payment method found in charge:', paymentMethodId)
          }
        }

        if (!paymentMethodId) {
          throw new Error('Payment method not found. Cannot charge additional amount.')
        }

        console.log('⚠️ [UPDATE-PAYMENT] No customer ID found. Creating checkout session without customer.')

        // Create checkout session without customer (will use customer_email)
        try {
          const customerEmail = submission.email || null

          const checkoutSession = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
              {
                price_data: {
                  currency: stripeCurrency,
                  product_data: {
                    name: `Additional charge for submission ${submissionId.substring(0, 8)}`,
                    description: `Price adjustment: Net paid ${currency}${netPaidAmount.toFixed(2)} → New ${currency}${validatedNewAmount.toFixed(2)}`
                  },
                  unit_amount: Math.abs(differenceInCents)
                },
                quantity: 1
              }
            ],
            mode: 'payment',
            success_url: `${Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '') || ''}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '') || ''}/cancel`,
            metadata: {
              submission_id: submissionId,
              type: 'additional_charge',
              net_paid_amount: netPaidAmount.toString(),
              new_amount: validatedNewAmount.toString(),
              difference: difference.toString()
            },
            customer_email: customerEmail || undefined,
            allow_promotion_codes: false
          })

          console.log('✅ [UPDATE-PAYMENT] Checkout session created:', checkoutSession.id)

          result = {
            success: true,
            type: 'charge',
            amount: difference,
            checkout_session_id: checkoutSession.id,
            checkout_url: checkoutSession.url,
            requires_customer_action: true,
            message: `Checkout session created for additional $${difference.toFixed(2)}. Customer must complete payment.`
          }
        } catch (checkoutError: any) {
          console.error('❌ [UPDATE-PAYMENT] Error creating checkout session:', checkoutError)
          throw new Error(`Failed to create checkout session for additional charge: ${checkoutError.message}`)
        }
      }
    } else {
      // Amount decreased - refund the difference
      const refundAmount = Math.abs(difference)
      const refundAmountInCents = Math.abs(differenceInCents)
      
      console.log(`💰 [UPDATE-PAYMENT] Refunding $${refundAmount.toFixed(2)} (${refundAmountInCents} cents)`)
      console.log(`💰 [UPDATE-PAYMENT] Refund details:`, {
        netPaidAmount,
        newAmount: validatedNewAmount,
        difference,
        refundAmount,
        refundAmountInCents,
        paymentIntentId: paymentIntent.id,
        paymentIntentAmount: paymentIntent.amount,
        paymentIntentStatus: paymentIntent.status,
        totalRefundedAmount,
        remainingRefundableAmount: paymentIntent.amount - (totalRefundedAmount * 100)
      })

      // Validate refund amount
      if (refundAmountInCents <= 0) {
        throw new Error('Refund amount must be greater than 0')
      }

      // Check that we don't refund more than what's available (original amount - already refunded)
      const remainingRefundableAmount = paymentIntent.amount - (totalRefundedAmount * 100)
      if (refundAmountInCents > remainingRefundableAmount) {
        throw new Error(`Refund amount (${refundAmountInCents} cents) cannot exceed remaining refundable amount (${remainingRefundableAmount} cents). Original: ${paymentIntent.amount} cents, Already refunded: ${totalRefundedAmount * 100} cents`)
      }

      // Calculate refund percentage based on net paid amount
      const refundPercentage = netPaidAmount > 0 ? (refundAmount / netPaidAmount) * 100 : 0

      // Create refund
      try {
        console.log('💳 [UPDATE-PAYMENT] Creating refund for payment intent:', paymentIntent.id)
        
        const refund = await stripe.refunds.create({
          payment_intent: paymentIntent.id,
          amount: refundAmountInCents,
          reason: 'requested_by_customer',
          metadata: {
            submission_id: submissionId,
            type: 'price_adjustment',
            net_paid_amount: netPaidAmount.toString(),
            new_amount: validatedNewAmount.toString(),
            refund_percentage: refundPercentage.toFixed(2)
          }
        })

        console.log('✅ [UPDATE-PAYMENT] Refund successful:', {
          id: refund.id,
          amount: refund.amount,
          status: refund.status,
          payment_intent: refund.payment_intent
        })

        result = {
          success: true,
          type: 'refund',
          amount: refundAmount,
          refund_id: refund.id,
          message: `Successfully refunded $${refundAmount.toFixed(2)} (${refundPercentage.toFixed(1)}% of net paid amount)`
        }
      } catch (refundError: any) {
        console.error('❌ [UPDATE-PAYMENT] Error creating refund:', {
          message: refundError.message,
          type: refundError.type,
          code: refundError.code,
          decline_code: refundError.decline_code,
          payment_intent: refundError.payment_intent,
          charge: refundError.charge
        })
        throw new Error(`Failed to create refund: ${refundError.message || refundError.toString()}`)
      }
    }

    // Update Stripe metadata with latest submission information
    await updateStripeMetadata()

    // Update submission with new payment information
    const updatedPaymentInfo = {
      ...paymentInfo,
      updated_at: new Date().toISOString(),
      additional_payments: result.type === 'charge' && result.payment_intent_id ? 
        (paymentInfo.additional_payments || []).concat([{
          payment_intent_id: result.payment_intent_id,
          amount: Math.abs(differenceInCents),
          currency: stripeCurrency,
          status: 'succeeded',
          created_at: new Date().toISOString()
        }]) : paymentInfo.additional_payments || [],
      refunds: result.type === 'refund' && result.refund_id ? 
        (paymentInfo.refunds || []).concat([{
          id: result.refund_id,
          amount: Math.abs(differenceInCents),
          currency: stripeCurrency,
          status: 'succeeded',
          reason: 'requested_by_customer',
          created_at: new Date().toISOString()
        }]) : paymentInfo.refunds || [],
      price_adjustment: {
        net_paid_amount: netPaidAmount,
        new_amount: validatedNewAmount,
        difference: difference,
        type: difference > 0 ? 'charge' : 'refund',
        timestamp: new Date().toISOString()
      }
    }

    await supabase
      .from('submission')
      .update({
        data: {
          ...submission.data,
          payment: updatedPaymentInfo
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId)

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('❌ [UPDATE-PAYMENT] Error updating payment:', error)
    console.error('❌ [UPDATE-PAYMENT] Error stack:', error?.stack)
    console.error('❌ [UPDATE-PAYMENT] Error name:', error?.constructor?.name)
    console.error('❌ [UPDATE-PAYMENT] Error type:', error?.type)
    console.error('❌ [UPDATE-PAYMENT] Error code:', error?.code)
    
    const errorMessage = error?.message || error?.toString() || 'Failed to update payment'
    const errorResponse = { 
      success: false, 
      error: errorMessage,
      details: error?.toString(),
      type: error?.type,
      code: error?.code
    }
    
    console.error('❌ [UPDATE-PAYMENT] Returning error response:', JSON.stringify(errorResponse, null, 2))
    
    return new Response(
      JSON.stringify(errorResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

