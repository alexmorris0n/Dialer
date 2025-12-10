export default function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(200).end()
  }

  // SignalWire sends POST with call data
  const userVariables = req.body?.call?.userVariables || {}
  const destination = userVariables.destination
  const callerID = userVariables.callerID || process.env.DEFAULT_CALLER_ID

  console.log('SWML Outbound Request:', JSON.stringify(req.body, null, 2))
  console.log('Destination:', destination)
  console.log('Caller ID:', callerID)

  if (!destination) {
    return res.status(400).json({ error: 'Missing destination in userVariables' })
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

