# References: SignalWire Dialer Examples

- **briankwest/swdialer** — Practical SignalWire Browser SDK dialer patterns (React)  
  https://github.com/briankwest/swdialer

- **signalwire/dialer-native** — Official SignalWire dialer reference  
  https://github.com/signalwire/dialer-native

- **signalwire/call-widget** — Drop-in web component to smoke-test token + calling  
  https://github.com/signalwire/call-widget

Recommended workflow:
1) Use **call-widget** as a 5-minute smoke test to verify tokens and media permissions.  
2) Read **swdialer** for Browser SDK lifecycle patterns (connect, dial, events, token refresh).  
3) Build your custom Vue components (dialer/queue/status) using the patterns above.

