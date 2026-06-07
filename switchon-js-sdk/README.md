# @switchon/js-sdk

JavaScript SDK for [SwitchOn](https://github.com/yourusername/switchon) — the self-hosted feature flag management platform.

- **Browser SDK** — real-time flag evaluation via SSE, auto-reconnect
- **Node.js Server SDK** — local evaluation (no HTTP per call), background polling, Express middleware
- **React hooks** — `useFlag`, `useVariation`, `SwitchOnProvider`
- **TypeScript** — full type definitions included

---

## Installation

```bash
npm install @switchon/js-sdk
```

---

## Browser SDK

```js
import SwitchOnClient from '@switchon/js-sdk';
// or: const SwitchOnClient = require('@switchon/js-sdk');

const client = new SwitchOnClient({
  apiUrl:      'https://flags.yourapp.com',   // your SwitchOn server
  sdkKey:      'sdk-prod-xxxxxxxxxxxxxxxx',   // from Settings → SDK Keys
  environment: 'production',                 // development | staging | production
});

await client.init('user-123', {
  plan:    'pro',
  country: 'IN',
});

// Boolean flag
if (client.isEnabled('new-checkout')) {
  renderNewCheckout();
}

// Multivariate flag (string / number / json)
const label = client.variation('cta-text', 'Buy Now');

// React to real-time changes (flag toggled from dashboard)
client.on('change', (flagName, newValue, oldValue) => {
  console.log(`${flagName}: ${oldValue} → ${newValue}`);
});
```

### After login — switch users

```js
await client.identify('user-456', { plan: 'enterprise' });
```

### Wait until ready

```js
// Use this when you need to ensure flags are loaded before rendering.
const flags = await client.waitUntilReady();
```

### All options

| Option | Type | Default | Description |
|---|---|---|---|
| `apiUrl` | string | **required** | Base URL of your SwitchOn server |
| `sdkKey` | string | **required** | SDK key from Settings → SDK Keys |
| `environment` | string | `'production'` | `'development'` / `'staging'` / `'production'` |
| `debug` | boolean | `false` | Log verbose info to the console |

### Events

| Event | Args | Description |
|---|---|---|
| `ready` | `(flags)` | Initial flags loaded + evaluated |
| `change` | `(flagName, newValue, oldValue)` | A flag's value changed for the current user |
| `snapshot` | `(flags)` | All flags refreshed via SSE |
| `connected` | — | SSE stream connected |
| `disconnected` | — | SSE stream disconnected (auto-reconnects) |
| `flagUpdate` | `(flag, eventType)` | Raw flag document changed in any way |

---

## Node.js Server SDK

Designed for Express, Next.js API routes, or any Node.js back-end. Evaluates flags **locally** — no HTTP call per request.

```js
const SwitchOnServer = require('@switchon/js-sdk/node');

const flags = new SwitchOnServer({
  apiUrl:       'https://flags.yourapp.com',
  sdkKey:       'sdk-prod-xxxxxxxxxxxxxxxx',
  environment:  'production',
  pollInterval: 30_000,  // refresh flag configs every 30 seconds
});

// Call once at startup — awaits the first flag load
await flags.init();

// In a request handler — evaluation is instant (no network call)
app.get('/checkout', (req, res) => {
  const showNewUI = flags.isEnabled('new-checkout', req.user.id, { plan: req.user.plan });
  const label     = flags.variation('cta-text', req.user.id, {}, 'Buy Now');
  res.json({ showNewUI, label });
});
```

### Express middleware

Attaches `req.flags` to every request automatically:

```js
app.use(flags.middleware());

app.get('/api/product', (req, res) => {
  if (req.flags.isEnabled('new-pricing')) {
    return res.json(newPricing);
  }
  res.json(oldPricing);
});
```

Customise user ID / attribute extraction:

```js
app.use(flags.middleware({
  getUserId:     (req) => req.auth.sub,
  getAttributes: (req) => ({ plan: req.auth.plan, role: req.auth.role }),
}));
```

### Evaluate all flags for a user

```js
const allFlags = flags.evaluateAll(req.user.id, { plan: 'pro' });
// → { 'new-checkout': true, 'cta-text': 'Get Started', ... }
```

### All options

| Option | Type | Default | Description |
|---|---|---|---|
| `apiUrl` | string | **required** | Base URL of your SwitchOn server |
| `sdkKey` | string | **required** | SDK key |
| `environment` | string | `'production'` | Flag environment |
| `pollInterval` | number | `30000` | ms between flag config refreshes |
| `debug` | boolean | `false` | Verbose logging |

---

## React Hooks

```jsx
import SwitchOnClient from '@switchon/js-sdk';
import { SwitchOnProvider, useFlag, useVariation, useFlags, useIsReady } from '@switchon/js-sdk/react';

// 1. Create the client once outside your component tree
const flagClient = new SwitchOnClient({
  apiUrl:      'https://flags.yourapp.com',
  sdkKey:      'sdk-prod-xxxxxxxxxxxxxxxx',
  environment: 'production',
});

// 2. Wrap your app
function App() {
  return (
    <SwitchOnProvider
      client={flagClient}
      userId={currentUser.id}
      userAttributes={{ plan: currentUser.plan }}
    >
      <Router />
    </SwitchOnProvider>
  );
}

// 3. Use hooks anywhere in your tree
function CheckoutButton() {
  const showNewCheckout = useFlag('new-checkout', false);
  const ctaText         = useVariation('cta-text', 'Buy Now');

  return showNewCheckout
    ? <NewCheckoutButton label={ctaText} />
    : <OldCheckoutButton />;
}

// Show a spinner until flags are loaded
function App() {
  return (
    <SwitchOnProvider
      client={flagClient}
      userId={user.id}
      loadingFallback={<Spinner />}
    >
      <Router />
    </SwitchOnProvider>
  );
}
```

### Available hooks

| Hook | Returns | Description |
|---|---|---|
| `useFlag(name, default)` | value | Current flag value for this user. Re-renders on change. |
| `useVariation(name, default)` | value | Alias for `useFlag` — semantic name for multivariate flags. |
| `useFlags()` | `{ name: value }` | All evaluated flags as a plain object. |
| `useIsReady()` | `boolean` | `true` once initial flag load completes. |
| `useSwitchOn()` | `{ client, flags, ready }` | Raw context access. |

---

## TypeScript

Full type definitions are included. No `@types/` package needed.

```ts
import SwitchOnClient, { SwitchOnClientOptions, FlagsMap } from '@switchon/js-sdk';
import SwitchOnServer, { SwitchOnServerOptions } from '@switchon/js-sdk/node';
import { SwitchOnProvider, useFlag, useVariation } from '@switchon/js-sdk/react';
```

---

## How evaluation works

The SDK uses **MD5 deterministic bucketing** — the same algorithm as the SwitchOn server:

```
bucket = MD5("flagName:userId") → uint32 → normalize to 0–100
```

- If `bucket < rolloutPercentage` → user **is in** the rollout
- Targeting rules are checked **before** the percentage rollout
- The same user always gets the same result for a given flag

The Node.js SDK evaluates locally using this algorithm — no round-trip to the server per `variation()` call.

---

## Self-hosted setup

Point the SDK at your own SwitchOn instance:

```js
const client = new SwitchOnClient({
  apiUrl:      'http://localhost:3001',   // local dev
  sdkKey:      'sdk-dev-xxxxxxxxxxxxxxxx',
  environment: 'development',
  debug:       true,
});
```

Get your SDK key from the SwitchOn admin dashboard: **Settings → SDK Keys**.

---

## License

MIT
