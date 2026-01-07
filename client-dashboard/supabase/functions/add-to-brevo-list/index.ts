import { serve } from 'https://deno.land/std@0.177.1/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

interface BrevoContact {
  email: string
  attributes?: {
    PRENOM?: string
    NOM?: string
    SMS?: string
    ADDRESS?: string
    LANGUAGE?: string
    DOCUMENTS?: string
  }
  listIds?: number[]
  updateEnabled?: boolean
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { email, firstName, lastName, phone, address, language, documents } = body

    // Validation des données requises
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Récupérer la clé API Brevo depuis les variables d'environnement
    const brevoApiKey = Deno.env.get('BREVO_API_KEY')
    if (!brevoApiKey) {
      console.error('❌ BREVO_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'Brevo API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // ID de la liste "Form abandonné" (ID #5 selon l'image)
    const LIST_ID = 5

    // Préparer les données du contact
    const contactData: any = {
      email: email,
      attributes: {},
      listIds: [LIST_ID],
      updateEnabled: true // Mettre à jour le contact s'il existe déjà
    }

    // Ajouter les attributs optionnels (toujours envoyer même si vides pour forcer la mise à jour)
    if (firstName !== undefined && firstName !== null) {
      contactData.attributes.PRENOM = firstName.trim() || ''
    }
    if (lastName !== undefined && lastName !== null) {
      contactData.attributes.NOM = lastName.trim() || ''
    }
    if (phone !== undefined && phone !== null) {
      contactData.attributes.SMS = phone.trim() || ''
    }
    if (address !== undefined && address !== null) {
      contactData.attributes.ADDRESS = address.trim() || ''
    }
    if (language !== undefined && language !== null) {
      contactData.attributes.LANGUAGE = language.trim() || 'fr'
    }
    
    // Envoyer les URLs des fichiers stockés sur Supabase (comme dans form draft)
    if (documents && Array.isArray(documents) && documents.length > 0) {
      // Formater les documents avec leurs URLs Supabase
      const documentsList = documents.map(doc => {
        const fileUrl = doc.url || doc.public_url
        const fileName = doc.name || 'Document'
        return fileUrl ? `${fileName}: ${fileUrl}` : fileName
      }).join('\n')
      
      if (documentsList) {
        contactData.attributes.DOCUMENTS = documentsList
      }
      
      console.log(`📎 [BREVO] Added ${documents.length} document URLs to contact`)
    }

    console.log('📧 [BREVO] Adding contact to list:', {
      email,
      firstName,
      lastName,
      phone,
      address,
      language,
      documentsCount: documents?.length || 0,
      listId: LIST_ID,
      attributes: contactData.attributes
    })

    // Appel à l'API Brevo pour créer/mettre à jour le contact
    const brevoResponse = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(contactData)
    })

    const brevoData = await brevoResponse.json()

    if (!brevoResponse.ok) {
      console.error('❌ [BREVO] Error adding contact:', brevoData)
      return new Response(
        JSON.stringify({ error: 'Failed to add contact to Brevo', details: brevoData }),
        { 
          status: brevoResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ [BREVO] Contact added/updated successfully')
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Contact added to Brevo list', 
        data: brevoData,
        documentsCount: documents?.length || 0
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ [BREVO] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

