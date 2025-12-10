// Supabase Edge Function: get-signalwire-token
// Generates SignalWire Subscriber token for authenticated user

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get user record from database
    const { data: userRecord, error: userError } = await supabaseClient
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (userError) {
      throw new Error('User record not found')
    }

    // SignalWire credentials from environment
    const signalwireProjectId = Deno.env.get('SIGNALWIRE_PROJECT_ID')
    const signalwireApiToken = Deno.env.get('SIGNALWIRE_API_TOKEN')
    const signalwireSpaceUrl = Deno.env.get('SIGNALWIRE_SPACE_URL')

    if (!signalwireProjectId || !signalwireApiToken || !signalwireSpaceUrl) {
      throw new Error('SignalWire credentials not configured')
    }

    const authHeader = btoa(`${signalwireProjectId}:${signalwireApiToken}`)
    let subscriberId = userRecord.signalwire_subscriber_id

    // If user doesn't have a SignalWire Subscriber, create one
    if (!subscriberId) {
      const createSubscriberResponse = await fetch(
        `https://${signalwireSpaceUrl}/api/fabric/subscribers`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: user.email,
            first_name: userRecord.name?.split(' ')[0] || 'User',
            last_name: userRecord.name?.split(' ').slice(1).join(' ') || '',
            display_name: userRecord.name || user.email,
            job_title: userRecord.role,
          }),
        }
      )

      if (!createSubscriberResponse.ok) {
        const errorText = await createSubscriberResponse.text()
        throw new Error(`Failed to create SignalWire Subscriber: ${errorText}`)
      }

      const subscriberData = await createSubscriberResponse.json()
      subscriberId = subscriberData.id

      // Store subscriber ID in database
      const { error: updateError } = await supabaseClient
        .from('users')
        .update({ signalwire_subscriber_id: subscriberId })
        .eq('id', user.id)

      if (updateError) {
        console.error('Failed to update user with subscriber ID:', updateError)
      }
    }

    // Generate Subscriber token
    const tokenResponse = await fetch(
      `https://${signalwireSpaceUrl}/api/fabric/subscribers/${subscriberId}/tokens`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ttl: 3600, // 1 hour token lifetime
        }),
      }
    )

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      throw new Error(`Failed to generate token: ${errorText}`)
    }

    const tokenData = await tokenResponse.json()

    // Fetch user's available lines (dispatch groups and direct lines)
    const { data: assignments, error: assignmentError } = await supabaseClient
      .from('user_assignments')
      .select(`
        id,
        is_default,
        direct_phone,
        direct_subscriber_id,
        dispatch_groups (
          id,
          name,
          phone_number,
          signalwire_subscriber_id
        )
      `)
      .eq('user_id', user.id)

    if (assignmentError) {
      console.error('Error fetching user assignments:', assignmentError)
    }

    // Build available_lines array for the UI
    const availableLines = []
    
    if (assignments) {
      for (const assignment of assignments) {
        // Add dispatch group line
        if (assignment.dispatch_groups) {
          availableLines.push({
            id: assignment.dispatch_groups.id,
            type: 'group',
            name: assignment.dispatch_groups.name,
            phone_number: assignment.dispatch_groups.phone_number,
            subscriber_id: assignment.dispatch_groups.signalwire_subscriber_id,
            is_default: assignment.is_default
          })
        }
        
        // Add direct line if exists
        if (assignment.direct_phone) {
          availableLines.push({
            id: `direct-${assignment.id}`,
            type: 'direct',
            name: 'Personal Line',
            phone_number: assignment.direct_phone,
            subscriber_id: assignment.direct_subscriber_id,
            is_default: !assignment.dispatch_groups && assignment.is_default
          })
        }
      }
    }

    return new Response(
      JSON.stringify({
        token: tokenData.token,
        subscriber_id: subscriberId,
        expires_at: tokenData.expires_at,
        available_lines: availableLines,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

