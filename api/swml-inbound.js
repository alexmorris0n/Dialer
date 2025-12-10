/**
 * SWML Webhook for Inbound Calls (Ring Group)
 * 
 * SignalWire calls this endpoint when an inbound call arrives at the dispatch number.
 * We return SWML JSON that rings all online dispatchers simultaneously.
 * 
 * For dynamic ring groups, this could query Supabase for online dispatchers.
 * For now, we use a static list that can be configured via environment variables.
 */

export default async function handler(req, res) {
  // Enable CORS for SignalWire
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Extract call data from SignalWire request
    const callData = req.body?.call || req.body || {}
    
    console.log('SWML Inbound Request:', {
      from: callData.from,
      to: callData.to,
      callId: callData.call_id,
      rawBody: JSON.stringify(req.body).substring(0, 500)
    })

    // Get dispatcher addresses from environment or use defaults
    // Format: comma-separated list of subscriber addresses
    // e.g., "/private/dispatcher-alex,/private/dispatcher-jordan"
    const dispatcherAddresses = process.env.DISPATCHER_ADDRESSES 
      ? process.env.DISPATCHER_ADDRESSES.split(',').map(a => a.trim())
      : ['/private/dispatcher-alex', '/private/dispatcher-jordan', '/private/dispatcher-sam']

    // Build parallel ring group
    const ringTargets = dispatcherAddresses.map(address => ({
      to: address
    }))

    // Build SWML response with ring group
    const swml = {
      version: '1.0.0',
      sections: {
        main: [
          // Answer the call
          { answer: {} },
          
          // Optional: Play a brief message or hold music while ringing
          {
            play: {
              urls: ['silence:1.0'],  // Brief silence before ringing
            }
          },
          
          // Ring all dispatchers simultaneously
          {
            connect: {
              parallel: ringTargets,
              timeout: 30,  // Ring for 30 seconds before giving up
              // Optional: ringback tone for caller
              ringback: {
                ringtone: 'us'
              }
            }
          },
          
          // If no one answers, play a message and hang up
          {
            play: {
              urls: ['say:We apologize, but no dispatchers are available. Please try again later.'],
            }
          },
          { hangup: {} }
        ]
      }
    }

    console.log('SWML Inbound Response:', JSON.stringify(swml))
    
    return res.status(200).json(swml)

  } catch (error) {
    console.error('SWML Inbound Error:', error)
    
    // Return a fallback SWML that apologizes and hangs up
    return res.status(200).json({
      version: '1.0.0',
      sections: {
        main: [
          { answer: {} },
          {
            play: {
              urls: ['say:We are experiencing technical difficulties. Please try again later.'],
            }
          },
          { hangup: {} }
        ]
      }
    })
  }
}

/**
 * Vercel config for this function
 */
export const config = {
  api: {
    bodyParser: true,
  },
}

