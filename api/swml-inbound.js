/**
 * SWML Inbound Webhook
 * 
 * Handles incoming calls to dispatch group numbers.
 * Looks up which dispatchers are assigned to the called number's group
 * and rings them in parallel (all at once).
 * 
 * SignalWire POSTs call info when someone calls your number.
 * 
 * Future: Query Supabase for online dispatchers in the group
 * For now: Configurable dispatcher list
 */

import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client (if env vars are available)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(200).end()
  }

  console.log('=== SWML Inbound Request ===')
  console.log('Body:', JSON.stringify(req.body, null, 2))

  try {
    const { call } = req.body || {}
    const calledNumber = call?.to // The number that was called
    const callerNumber = call?.from // Who's calling
    
    console.log('Incoming call to:', calledNumber, 'from:', callerNumber)

    let onlineDispatchers = []
    let ringMode = 'parallel' // or 'serial' for sequential

    // Try to fetch dispatchers from Supabase if configured
    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        
        // Find the dispatch group for this phone number
        const { data: group, error: groupError } = await supabase
          .from('dispatch_groups')
          .select('id, name')
          .eq('phone_number', calledNumber)
          .single()

        if (group && !groupError) {
          console.log('Found dispatch group:', group.name)
          
          // Get all users assigned to this group who are online
          const { data: assignments, error: assignError } = await supabase
            .from('user_assignments')
            .select(`
              user_id,
              users (
                id,
                signalwire_subscriber_id,
                status
              )
            `)
            .eq('group_id', group.id)

          if (assignments && !assignError) {
            // Filter to only online/available users with subscriber IDs
            onlineDispatchers = assignments
              .filter(a => a.users?.signalwire_subscriber_id && 
                          (a.users.status === 'available' || a.users.status === 'online'))
              .map(a => `/private/${a.users.signalwire_subscriber_id}`)
            
            console.log('Online dispatchers:', onlineDispatchers)
          }
        } else {
          console.log('No dispatch group found for number:', calledNumber)
        }
      } catch (dbError) {
        console.error('Database lookup error:', dbError)
        // Continue with empty dispatchers - will play unavailable message
      }
    } else {
      console.log('Supabase not configured, using static dispatcher list')
      // Fallback: Add your dispatcher addresses here for testing
      // onlineDispatchers = ['/private/subscriber-id-here']
    }

    let swml

    if (onlineDispatchers.length > 0) {
      // Ring all online dispatchers simultaneously (parallel)
      swml = {
        version: '1.0.0',
        sections: {
          main: [
            { answer: {} },
            // Brief ringback while connecting
            {
              play: {
                urls: ['silence:0.5']
              }
            },
            {
              connect: {
                // Parallel ring - all dispatchers ring at once
                // First to answer gets the call
                parallel: onlineDispatchers.map(dispatcher => ({ 
                  to: dispatcher,
                  // Optional: timeout per leg
                  // timeout: 25
                })),
                timeout: 30, // Overall timeout
                // Optional: ringback tone
                // ringback: ['%(2000,4000,440,480)']
              }
            },
            // If no one answered
            {
              play: {
                say: 'All dispatchers are currently busy. Please try again shortly.'
              }
            },
            { hangup: {} }
          ]
        }
      }
    } else {
      // No dispatchers online - play message and hangup
      // Future: Could offer voicemail here
      swml = {
        version: '1.0.0',
        sections: {
          main: [
            { answer: {} },
            {
              play: {
                say: 'Thank you for calling. No dispatchers are currently available. Please try again later.'
              }
            },
            { hangup: {} }
          ]
        }
      }
    }

    console.log('Returning SWML:', JSON.stringify(swml, null, 2))
    
    res.setHeader('Content-Type', 'application/json')
    return res.status(200).json(swml)

  } catch (err) {
    console.error('SWML Inbound Error:', err)
    
    // Return error SWML
    const errorSwml = {
      version: '1.0.0',
      sections: {
        main: [
          { answer: {} },
          {
            play: {
              say: 'We are experiencing technical difficulties. Please try again later.'
            }
          },
          { hangup: {} }
        ]
      }
    }
    
    res.setHeader('Content-Type', 'application/json')
    return res.status(200).json(errorSwml)
  }
}

