# Rocketflag Node.js SDK

This is the official Node.js SDK for [Rocketflag](https://rocketflag.app), a feature flag and A/B testing platform. This SDK allows you to easily integrate Rocketflag
into your Javascript Web Apps or Node.js applications, enabling you to control feature rollouts, perform A/B tests, and manage your features
effectively.

## Installation

```bash
npm install @rocketflag/node-sdk
```

The SDK ships both ES module and CommonJS builds, so it works with modern
bundlers (Vite, Angular, webpack, …) and Node — via either `import` or
`require` — on Node 18 and above.

```js
// ESM / bundlers
import createRocketflagClient from "@rocketflag/node-sdk";

// CommonJS
const { default: createRocketflagClient } = require("@rocketflag/node-sdk");
```

## Basic Usage

### Setup

```js
import createRocketflagClient from "@rocketflag/node-sdk";

const rocketflag = createRocketflagClient(); // Uses default API URL and version

// Optionally you can configure which version of the API you want to use
const rocketflag = createRocketflagClient("v2", "https://your-api-domain.com");
```

### Get a flag

```js
try {
  const flag = await rocketflag.getFlag("IFldMzqP5jtv9wAL");
  // Do something with the flag result. For example in React, you may want to set state.
  setSignUpsEnabled(flag.enabled);
} catch (error) {
  console.error("Something went wrong fetching the flag", error);
}
```

## Advanced Usage

### Getting a flag details with cohorts

```js
const flag = await rocketflag.getFlag("IFldMzqP5jtv9wAL", {
  cohort: "<cohort-identifier>",
});
```

### Sticky rollouts and audiences

Pass a `targetingKey` to make percentage rollouts sticky, and any other keys as
audience attributes:

```ts
const flag = await rocketflag.getFlag("IFldMzqP5jtv9wAL", {
  targetingKey: user.id,
  plan: "pro",
  country: "AU",
});
```

- **`targetingKey`**: a stable identifier for the user. The same key always
  gets the same answer from a percentage rollout, in every environment of a
  group flag, and raising the percentage only ever adds users. Without a
  `targetingKey` the `cohort` is used, and with neither each request is a fresh
  random roll. Prefer an opaque id over an email address: the key is part of
  the request URL.
- **Any other key** is an audience attribute, matched against the flag's
  audience exactly and case-sensitively. An attribute you don't send never
  matches. `cohort`, `env` and `targetingKey` are reserved and can't be
  audience attributes.

Every context value must be a `string`, `number` or `boolean`. Leave out an
attribute you don't have rather than passing it as `undefined`. The
`UserContext` type rejects a value that may be `undefined`, such as
`{ plan: user.plan }`. TypeScript can't see through an optional property on an
object you've typed yourself, so that case throws at runtime instead.

```ts
import type { UserContext } from "@rocketflag/node-sdk";

const context: UserContext = { targetingKey: user.id };
if (user.plan) context.plan = user.plan;
```

### Group flags (environments)

Select the environment of a group flag with `env`. Environment names contain
letters, numbers, hyphens and underscores.

```js
const flag = await rocketflag.getFlag("IFldMzqP5jtv9wAL", { env: "production" });
```

### Caching responses

To avoid hitting the API on every check, you can enable an in-memory cache by
passing a default `ttlSeconds` when creating the client. Cached entries are
keyed by flag ID **and** the user context, so different cohorts or
environments still resolve independently.

```js
// Cache flag responses for 5 minutes.
const rocketflag = createRocketflagClient(undefined, undefined, { ttlSeconds: 300 });

// First call hits the API; subsequent calls within 5 minutes are served from cache.
const flag = await rocketflag.getFlag("IFldMzqP5jtv9wAL", { cohort: "beta" });
```

You can override the TTL for a single call, or disable caching for that call by
passing `0`:

```js
// Force a fresh fetch, bypassing the cache.
const flag = await rocketflag.getFlag("IFldMzqP5jtv9wAL", {}, { ttlSeconds: 0 });

// Use a shorter TTL just for this call.
const flag = await rocketflag.getFlag("IFldMzqP5jtv9wAL", {}, { ttlSeconds: 10 });
```

Caching is opt-in: without a client default or per-call TTL, every call goes
to the API. Each distinct context is its own cache entry, so a `targetingKey`
per user means an entry per user. The cache holds at most 10,000 entries and
evicts the least recently used one when it is full. Change the cap with
`maxEntries`:

```js
const rocketflag = createRocketflagClient(undefined, undefined, { ttlSeconds: 300, maxEntries: 50_000 });
```

## Error Handling

The SDK can throw the following errors:

- `APIError`: This error is thrown when the API returns a non-ok response. The error object contains the status code and status text of the response.
- `InvalidResponseError`: This error is thrown when the API returns an invalid response. This can happen if the response is not valid JSON or if it doesn't match the expected format.
- `NetworkError`: This error is thrown when there is a network error, such as a failed connection.

```js
import { APIError, InvalidResponseError, NetworkError } from "@rocketflag/node-sdk/errors";

try {
  const flag = await rocketflag.getFlag("IFldMzqP5jtv9wAL");
  // ...
} catch (error) {
  if (error instanceof APIError) {
    console.error(`API Error: ${error.status} ${error.statusText}`);
  } else if (error instanceof InvalidResponseError) {
    console.error(`Invalid Response Error: ${error.message}`);
  } else if (error instanceof NetworkError) {
    console.error(`Network Error: ${error.message}`);
  } else {
    console.error("An unknown error occurred", error);
  }
}
```

## Response

The response from the API on a flag will be one of three possibilities.

1. A `200` with the Flag object

   ```json
   {
     "name": "The user-created flag name",
     "enabled": true,
     "id": "asklWQQZdslhfsszZWkj"
   }
   ```

1. A `404` not found status code.
   > A 404 indicates that the flag ID you've provided in your request is not valid and cannot be found.
1. A `500` internal server error.
   > These should be extremely rare, but trying again may help. In short something has gone wrong retrieving flag data. 500's trigger internal alerts on Rocketflag, so it's likely it's already being looked into.
