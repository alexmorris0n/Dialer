export default function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(200).end()
  }

  console.log('SWML Inbound Request:', JSON.stringify(req.body, null, 2))

  // In production, fetch online dispatchers from Supabase
  // For now, use placeholder addresses
  const onlineDispatchers = [
    // These should be Call Fabric addresses for your dispatchers
    // e.g., '/private/dispatcher-alex'
  ]

  let swml

  if (onlineDispatchers.length > 0) {
    // Ring all online dispatchers simultaneously
    swml = {
      version: '1.0.0',
      sections: {
        main: [
          { answer: {} },
          {
            play: {
              urls: ['silence:1.0'] // Brief pause before connecting
            }
          },
          {
            connect: {
              parallel: onlineDispatchers.map(dispatcher => ({ to: dispatcher })),
              timeout: 30
            }
          },
          {
            play: {
              say: 'No dispatchers are available. Please try again later.'
            }
          },
          { hangup: {} }
        ]
      }
    }
  } else {
    // No dispatchers online - play message and hangup
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

  res.setHeader('Content-Type', 'application/json')
  res.status(200).json(swml)
}

