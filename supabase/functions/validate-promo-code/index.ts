import { serve } from 'https://deno.land/std@0.177.1/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { promoCode, amount } = await req.json()

    if (!promoCode) {
      return new Response(
        JSON.stringify({ error: 'Promo code is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    console.log('🎟️ [VALIDATE] Validating promo code:', promoCode)

    let discount = null
    let discountAmount = 0
    let discountType = null

    try {
      // First, try to find as promotion code (code alphanumérique)
      const promotionCodes = await stripe.promotionCodes.list({
        code: promoCode.toUpperCase(),
        limit: 1,
        active: true
      })

      if (promotionCodes.data.length > 0 && promotionCodes.data[0].active) {
        const promotionCode = promotionCodes.data[0]
        const coupon = promotionCode.coupon

        console.log('✅ [VALIDATE] Found promotion code:', promotionCode.id)
        console.log('🎟️ [VALIDATE] Coupon details:', {
          id: coupon.id,
          percent_off: coupon.percent_off,
          amount_off: coupon.amount_off,
          currency: coupon.currency
        })

        discount = {
          id: promotionCode.id,
          code: promotionCode.code,
          type: 'promotion_code'
        }

        if (coupon.percent_off) {
          discountType = 'percentage'
          discountAmount = amount ? (amount * coupon.percent_off) / 100 : 0
          discount.percentOff = coupon.percent_off
        } else if (coupon.amount_off) {
          discountType = 'fixed'
          // Convert from cents to euros
          discountAmount = coupon.amount_off / 100
          discount.amountOff = discountAmount
        }
      } else {
        // Try as direct coupon ID
        try {
          const coupon = await stripe.coupons.retrieve(promoCode.toUpperCase())
          
          if (coupon.valid) {
            console.log('✅ [VALIDATE] Found coupon:', coupon.id)
            console.log('🎟️ [VALIDATE] Coupon details:', {
              id: coupon.id,
              percent_off: coupon.percent_off,
              amount_off: coupon.amount_off,
              currency: coupon.currency
            })

            discount = {
              id: coupon.id,
              code: promoCode.toUpperCase(),
              type: 'coupon'
            }

            if (coupon.percent_off) {
              discountType = 'percentage'
              discountAmount = amount ? (amount * coupon.percent_off) / 100 : 0
              discount.percentOff = coupon.percent_off
            } else if (coupon.amount_off) {
              discountType = 'fixed'
              // Convert from cents to euros
              discountAmount = coupon.amount_off / 100
              discount.amountOff = discountAmount
            }
          } else {
            console.log('⚠️ [VALIDATE] Coupon found but not valid')
            return new Response(
              JSON.stringify({ 
                error: 'Invalid or expired promo code',
                valid: false,
                hint: 'The coupon exists but is not valid or has expired'
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
              }
            )
          }
        } catch (couponError: any) {
          console.error('❌ [VALIDATE] Error retrieving coupon:', couponError.message)
          
          // Check if it's a not found error vs other error
          if (couponError.code === 'resource_missing' || couponError.statusCode === 404) {
            return new Response(
              JSON.stringify({ 
                error: 'Promo code not found',
                valid: false,
                hint: 'Please check that you have created a promotion code in Stripe for this coupon. The code should match exactly (case-insensitive).'
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
              }
            )
          }
          
          return new Response(
            JSON.stringify({ 
              error: 'Error validating promo code',
              details: couponError.message,
              valid: false 
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          )
        }
      }

      if (!discount) {
        return new Response(
          JSON.stringify({ 
            error: 'Promo code not found',
            valid: false 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      return new Response(
        JSON.stringify({
          valid: true,
          discount: {
            ...discount,
            discountType,
            discountAmount: Math.round(discountAmount * 100) / 100, // Round to 2 decimals
            percentOff: discountType === 'percentage' ? discount.percentOff : null,
            amountOff: discountType === 'fixed' ? discount.amountOff : null,
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )

    } catch (error: any) {
      console.error('❌ [VALIDATE] Error validating promo code:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Error validating promo code',
          details: error.message,
          valid: false 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }
  } catch (error: any) {
    console.error('❌ [ERROR] Error parsing request:', error)
    return new Response(
      JSON.stringify({ error: 'Invalid request', details: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

