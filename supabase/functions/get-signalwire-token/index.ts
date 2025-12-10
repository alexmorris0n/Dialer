// Supabase Edge Function: get-signalwire-token
// Generates SignalWire Subscriber token for authenticated user
// Returns available lines (dispatch groups + direct lines) for caller ID selection

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Line {
  id: string
  name: string
  phone: string
  is_default: boolean
  type: 'group' | 'direct'
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

    // Fetch user's line assignments (groups + direct lines)
    const { data: assignments, error: assignmentsError } = await supabaseClient
      .from('user_assignments')
      .select(`
        id,
        is_default,
        direct_phone,
        direct_subscriber_id,
        group_id,
        dispatch_groups (
          id,
          name,
          phone_number,
          signalwire_subscriber_id
        )
      `)
      .eq('user_id', user.id)

    if (assignmentsError) {
      console.error('Failed to fetch assignments:', assignmentsError)
      // Continue without assignments - will use default
    }

    // Build available lines array
    const availableLines: Line[] = []
    let defaultSubscriberId: string | null = null

    if (assignments && assignments.length > 0) {
      for (const assignment of assignments) {
        // Group assignment
        if (assignment.group_id && assignment.dispatch_groups) {
          const group = assignment.dispatch_groups as any
          availableLines.push({
            id: assignment.id,
            name: group.name,
            phone: group.phone_number,
            is_default: assignment.is_default,
            type: 'group'
          })
          
          // Track default subscriber ID
          if (assignment.is_default && group.signalwire_subscriber_id) {
            defaultSubscriberId = group.signalwire_subscriber_id
          }
        }
        
        // Direct line assignment
        if (assignment.direct_phone) {
          availableLines.push({
            id: assignment.id,
            name: 'My Line',
            phone: assignment.direct_phone,
            is_default: assignment.is_default,
            type: 'direct'
          })
          
          // Track default subscriber ID
          if (assignment.is_default && assignment.direct_subscriber_id) {
            defaultSubscriberId = assignment.direct_subscriber_id
          }
        }
      }
    }

    // If no assignments, create a default line using the default dispatch number
    if (availableLines.length === 0) {
      availableLines.push({
        id: 'default',
        name: 'Dispatch',
        phone: '+16503946801', // Default dispatch number
        is_default: true,
        type: 'group'
      })
    }

    // Ensure at least one line is marked as default
    if (!availableLines.some(l => l.is_default) && availableLines.length > 0) {
      availableLines[0].is_default = true
    }

    // SignalWire credentials from environment
    const signalwireProjectId = Deno.env.get('SIGNALWIRE_PROJECT_ID')
    const signalwireApiToken = Deno.env.get('SIGNALWIRE_API_TOKEN')
    const signalwireSpaceUrl = Deno.env.get('SIGNALWIRE_SPACE_URL')

    if (!signalwireProjectId || !signalwireApiToken || !signalwireSpaceUrl) {
      throw new Error('SignalWire credentials not configured')
    }

    const authHeader = btoa(`${signalwireProjectId}:${signalwireApiToken}`)
    
    // Use default assignment's subscriber, or user's own subscriber, or create one
    let subscriberId = defaultSubscriberId || userRecord.signalwire_subscriber_id

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
