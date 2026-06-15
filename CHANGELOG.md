# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-06-15

### Added
- The package now ships both an ES module build (`./esm`) and a CommonJS build (`./cjs`), wired through the `exports` map with `import`/`require` conditions. ESM consumers (Vite, Angular, and other bundlers) now load real ESM where `import createRocketflagClient from "@rocketflag/node-sdk"` resolves directly to the client factory function.

### Fixed
- Default import resolving to a module namespace object (`{ default: fn }`) instead of the client factory under bundlers that don't honour the CommonJS `__esModule`/`exports.default` interop convention (e.g. Vite 8 / Rolldown), which caused `createRocketflagClient is not a function`. Shipping a true ESM build removes the interop ambiguity.

### Notes
- Fully backwards compatible. CommonJS `require("@rocketflag/node-sdk").default` (including on Node 18) and the `@rocketflag/node-sdk/errors` subpath continue to work unchanged.

## [1.2.0] - 2026-05-21

### Added
- Opt-in in-memory response caching for `getFlag`. Pass `{ ttlSeconds }` as the third argument to `createRocketflagClient` to set a default TTL, or as the third argument to `getFlag` to override (or disable with `0`) per call.
- Cache keys include the flag ID and the full user context, so different cohorts/environments cache independently.
- Cached entries are deep-cloned on read and write so callers cannot mutate cached state.
- README section documenting the caching API and its memory characteristics (no size cap; entries only expire on re-request).
- Tests covering cache hits, expiry, per-call overrides, context-keyed isolation, and mutation safety.

## [1.1.0] - 2025-09-12

### Added
- Typed `env` key to the `userContext` options.
- Alphanumeric validation for the `env` key.
- Tests for the new `env` key validation.
