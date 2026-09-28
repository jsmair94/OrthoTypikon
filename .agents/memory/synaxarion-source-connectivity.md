---
name: Synaxarion source connectivity
description: Network-access constraints for the Orthodox Jordan daily-content source
---

The Orthodox Jordan WordPress REST response does not include an `Access-Control-Allow-Origin` header. Browser clients therefore need the API server to proxy the request; native React Native clients can request the HTTPS source directly and do not need a published app API domain.

**Why:** A live source can be reachable from the server and native app while browser fetches still fail CORS. Requiring a deployed API domain would also make a standalone APK depend on a separate deployment.

**How to apply:** Keep web/preview requests on the API-server proxy. For direct-install mobile builds that must avoid Replit or another published API, use native HTTPS fetches to the source and preserve the app's local fallback for network failure.

The Replit development container's runtime `fetch` and `curl` to the Orthodox Jordan WordPress REST endpoint have also timed out, including a 40-second request. The agent-side `webFetch` tool can retrieve the same endpoint, but that does not mean app/server code can reach it; `webFetch` is not available to the running app.

**Why:** Agent-side retrieval and the Replit runtime use different network paths. Treating one as proof of the other can leave the web card failing with repeated API 500 responses.

**How to apply:** When debugging this source, test from the actual app/API runtime. Keep the client fallback, avoid unbounded timeout increases or untrusted public CORS proxies, and state clearly when the upstream is unreachable from Replit.

The Arabic daily-verse paragraph can use the same right-curly quote character (`”`) at both ends, followed by the scripture citation in parentheses. Parse the trailing citation independently instead of assuming a conventional opening/closing guillemet pair.

**Why:** The old quote pattern treated the citation as verse text, so English and Greek translation returned only a translated book reference in the verse card.

**How to apply:** Re-check the live paragraph shape when the source changes, and keep verse extraction consistent between the native direct-fetch path and the API proxy.