# Rocketflag Node.js SDK

This is the official Node.js SDK for [Rocketflag](https://rocketflag.app), a feature flag and A/B testing platform. This SDK allows you to easily integrate Rocketflag
into your Javascript Web Apps or Node.js applications, enabling you to control feature rollouts, perform A/B tests, and manage your features
effectively.

## Installation

```bash
npm install @rocketflag/node-sdk
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
