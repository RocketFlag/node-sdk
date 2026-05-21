# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
