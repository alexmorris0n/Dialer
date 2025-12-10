/**
 * SWML Outbound Webhook
 * 
 * This endpoint is called by SignalWire when a Browser SDK client dials
 * the /public/dispatch-outbound resource address.
 * 
 * It receives userVariables from the Browser SDK and returns SWML
 * that connects to the destination with the specified caller ID.
 * 
 * Request body from SignalWire includes:
 * - call: { from, to, direction, call_id, ... }
 * - vars: variables from executing SWML (if any)
 * - params: parameters passed via execute/transfer
 * 
 * For Browser SDK calls, userVariables may be in different locations
 * depending on how the call was initiated.
 */

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(200).end()
  }

  console.log('=== SWML Outbound Request ===')
  console.log('Body:', JSON.stringify(req.body, null, 2))
  console.log('Query:', JSON.stringify(req.query, null, 2))

  try {
    // Extract call info from request
    const { call, vars, params } = req.body || {}
    
    // Try to get destination and callerID from various sources:
    // 1. Query parameters (passed via URL)
    // 2. vars (from SWML variable scope)
    // 3. params (from execute/transfer)
    // 4. call object properties
    
    let destination = 
      req.query?.destination ||
      vars?.destination ||
      params?.destination ||
      call?.to

    let callerID = 
      req.query?.callerID ||
      vars?.callerID ||
      params?.callerID ||
      call?.from

    console.log('Extracted - destination:', destination, 'callerID:', callerID)

    // Validate required fields
    if (!destination) {
      console.error('Missing destination')
      return res.status(400).json({ 
        error: 'Missing destination parameter',
        received: { query: req.query, vars, params, call }
      })
    }

    // Default caller ID if not provided (SignalWire will use account default)
    if (!callerID) {
      console.warn('No callerID provided, SignalWire will use default')
    }

    // Build SWML to connect the call
    const swml = {
      version: '1.0.0',
      sections: {
        main: [
          // Answer the WebRTC leg
          { answer: {} },
          // Brief pause for audio to stabilize
          {
            play: {
              urls: ['silence:0.5']
            }
          },
          // Connect to the PSTN destination
          {
            connect: {
              from: callerID, // Outbound caller ID
              to: destination, // Phone number to dial
              timeout: 60, // Ring for 60 seconds
              // Optional: ringback tone while waiting
              // ringback: ['%(2000,4000,440,480)']
            }
          },
          // If connect fails or times out
          {
            play: {
              say: 'The call could not be completed. Please try again.'
            }
          },
          { hangup: {} }
        ]
      }
    }

    console.log('Returning SWML:', JSON.stringify(swml, null, 2))
    
    res.setHeader('Content-Type', 'application/json')
    return res.status(200).json(swml)

  } catch (err) {
    console.error('SWML Outbound Error:', err)
    
    // Return error SWML that plays a message
    const errorSwml = {
      version: '1.0.0',
      sections: {
        main: [
          { answer: {} },
          {
            play: {
              say: 'An error occurred processing your call. Please try again.'
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

