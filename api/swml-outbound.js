/**
 * SWML Webhook for Outbound Calls
 * 
 * SignalWire calls this endpoint when a browser dials /public/dispatch-outbound
 * We return SWML JSON that connects to PSTN with the specified caller ID
 * 
 * Expected userVariables from browser:
 * - destination: Phone number to call (E.164 format)
 * - callerID: Outbound caller ID to display
 */

export default function handler(req, res) {
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
    // Extract userVariables from SignalWire request
    // SignalWire sends call data in the request body
    const callData = req.body?.call || req.body || {}
    const userVariables = callData.userVariables || callData.user_variables || {}
    
    const destination = userVariables.destination || userVariables.to
    const callerID = userVariables.callerID || userVariables.caller_id || userVariables.from
    
    // Log for debugging
    console.log('SWML Outbound Request:', {
      destination,
      callerID,
      rawBody: JSON.stringify(req.body).substring(0, 500)
    })

    // Validate destination
    if (!destination) {
      console.error('Missing destination in request')
      return res.status(400).json({ 
        error: 'Missing destination',
        received: userVariables 
      })
    }

    // Default caller ID if not provided
    const fromNumber = callerID || process.env.DEFAULT_CALLER_ID || '+16503946801'

    // Build SWML response
    const swml = {
      version: '1.0.0',
      sections: {
        main: [
          {
            connect: {
              from: fromNumber,
              to: destination,
              timeout: 60
            }
          }
        ]
      }
    }

    console.log('SWML Response:', JSON.stringify(swml))
    
    return res.status(200).json(swml)

  } catch (error) {
    console.error('SWML Outbound Error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
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


