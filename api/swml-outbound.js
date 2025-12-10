export default function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(200).end()
  }

  // Log full request for debugging
  console.log('=== SWML OUTBOUND REQUEST ===')
  console.log('Method:', req.method)
  console.log('Headers:', JSON.stringify(req.headers, null, 2))
  console.log('Body:', JSON.stringify(req.body, null, 2))
  console.log('Query:', JSON.stringify(req.query, null, 2))

  // SignalWire may send userVariables at different paths depending on context
  // Try multiple locations
  const body = req.body || {}
  const userVariables = body.call?.userVariables || body.vars || body.userVariables || {}
  
  // Also check query params as fallback
  const destination = userVariables.destination || req.query.destination
  const callerID = userVariables.callerID || req.query.callerID || process.env.DEFAULT_CALLER_ID || '+16503946801'

  console.log('Parsed destination:', destination)
  console.log('Parsed callerID:', callerID)

  // If no destination, return a helpful error in SWML format
  if (!destination) {
    console.log('No destination found - returning error SWML')
    return res.status(200).json({
      version: '1.0.0',
      sections: {
        main: [
          { play: { say: 'Error: No destination number provided.' } },
          { hangup: {} }
        ]
      }
    })
  }

  // Return SWML to connect the call
  const swml = {
    version: '1.0.0',
    sections: {
      main: [
        {
          connect: {
            from: callerID,
            to: destination
          }
        }
      ]
    }
  }

  res.setHeader('Content-Type', 'application/json')
  res.status(200).json(swml)
}

