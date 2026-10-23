---
name: OpenStreetMap Overpass availability
description: Reliability limits observed when querying nearby OpenStreetMap places from Replit.
---

Public Overpass instances can return HTTP 504 or time out from the Replit runtime, including for small nearby searches. Do not assume a reachable OSM geocoder means Overpass queries will also work.

**Why:** A nearby Greek Orthodox place search tested Overpass endpoints that returned an upstream timeout or failed to respond from this environment.

**How to apply:** Keep Overpass requests bounded by radius and timeout, show an explicit unavailable state, and offer a usable map-search fallback. For dependable directory coverage, prefer a managed or verified source over relying only on the public endpoint.