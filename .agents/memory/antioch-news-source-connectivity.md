---
name: Antioch news source connectivity
description: Format and runtime network limits for Antioch Patriarchate news pages
---

The Antioch Patriarchate Arabic and English news URLs, including the paginated `category/a/9/page/1/` route, are ordinary HTML article-list pages rather than RSS or JSON API endpoints. Agent-side `webFetch` can extract their article text, but requests from the Replit runtime return Cloudflare HTTP 403. The conventional `/feed/` path returns 404.

**Why:** Agent-side page extraction and the app's network path differ. A readable page in web research does not mean the running app can fetch it, and a category URL cannot be treated as a machine-readable feed.

**How to apply:** Before implementing native article cards, verify an official RSS/API endpoint from the app's actual runtime. Do not rely on agent-side `webFetch` or an untrusted public CORS proxy; if no accessible feed exists, ask whether an in-app browser view is acceptable.