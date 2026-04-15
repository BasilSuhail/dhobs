# Log 22: Landing Page — GitHub Pages

**Date:** 2026-04-05
**Branch:** `feature/landing-page`
**Status:** In Progress

## Overview

Converts the existing Project S dashboard UI into a static public-facing landing
page hosted on GitHub Pages. App tiles are non-interactive; hovering shows a
floating card with the service name, tagline, and 3-step flow.

## Key Decisions

- `NEXT_PUBLIC_LANDING_MODE=true` gates all landing-specific behaviour at build time
- `LANDING=true` switches `next.config.mjs` to `output: 'export'` with `basePath`
- `app/api/` and `middleware.ts` are removed by CI before building (incompatible
  with static export); source files are preserved on the branch
- Mock stats data replaces live API calls in the dashboard section
- Production docker builds remain unaffected

## Deployment

GitHub Pages URL: `https://basilsuhail.github.io/dhobs-HomeForge`
Deploy branch: `gh-pages`
Trigger: push to `feature/landing-page` or `main`
