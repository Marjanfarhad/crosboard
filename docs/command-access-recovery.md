# Access session recovery without redirect loops

A rejected Access credential previously caused the Worker to redirect every frontend navigation to login again. When Access returned the browser with the same rejected or missing application credential, this could repeat indefinitely. Successful anonymous login redirects alone did not test this authenticated return path.

The Worker now starts at most one automatic sign-in attempt. Its fixed return path carries command_login=1; returning without a credential produces a no-store 401 help page instead of another redirect. An existing but rejected credential never triggers an automatic redirect. Temporary signing-key service failures produce 503. API failures remain JSON responses. Public support codes describe the failure category but never contain JWTs, cookie values, email addresses, or signing-key material.

Cookie validation accepts one unique, cryptographically verified application identity among overlapping CF_Authorization cookies. Header assertions remain authoritative when supplied. Issuer, audience, expiration, not-before, subject, algorithm and RSA signature checks remain mandatory. Cookies that authenticate two distinct owners are rejected rather than choosing an account. Quoted/URL-encoded cookie transport is normalized before validation.

Read-only diagnostics confirmed the deployed audience matches the configured Access application, and public signing keys were reachable from the diagnostic runner. Organization metadata was not available to the token. These checks do not identify the failing user's particular token or prove that a complete real sign-in succeeds.

Regression tests cover valid/header/cookie identities, overlapping cookies, cross-account ambiguity, invalid credential loop prevention, a credential-free login return, and signing-key service failure. The release keeps AI disabled unless the owner explicitly sets COMMAND_ENABLE_LIVE_AI=true after resolving provider billing. Authentication fixes do not make another OpenAI request by default.
