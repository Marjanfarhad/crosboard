# Limited live AI for Command

The authenticated Cloudflare Worker calls the OpenAI Responses API using gpt-5.4-mini. The API key is held only as a GitHub Actions secret and Cloudflare Worker secret; it is never placed in the Vite build or repository configuration.

## User behavior

Analyst generates a next-video experiment after at least two videos are saved. Creative generates a product-video draft after selecting a saved product. Results are explicitly labeled as live, include evidence and limitations, and are not automatically saved or published. Generation happens only on a button press. There are no automatic provider retries or fabricated fallback responses.

The backend loads products/metrics by the verified Access subject. It does not trust client-supplied video metrics. Origin, JSON size, and loaded-account headers are checked before reserving usage. Only bounded product/video fields are sent to OpenAI, not account emails, JWTs, keys, notes, or reminders. Requests use store:false and no tools, with reasoning effort none and a 600-output-token limit. store:false does not override the provider's other applicable data retention policies.

## Trial control

A shared D1 budget allows 10 attempts across the application. An atomic update reserves a slot before a provider call. Timeouts and provider failures retain their reservation to prevent ambiguous paid retries. Reapplying the schema never resets usage. Exhaustion disables further calls until the owner explicitly authorizes changing the budget. The initial real provider check consumes one of these attempts; later releases do not repeat it after a successful check has been recorded for the model.

## Activation and verification

PR checks run mock provider and browser tests without API credentials or charges. The main release applies the schema, runs a single real provider check with synthetic data if not already verified, cleans up its synthetic workspace, and only then uploads OPENAI_API_KEY through Wrangler secret stdin and sets AI_ENABLED=true for deployment. Raw provider error bodies, prompts, keys, and generated text are not logged by the smoke test.

A failed real provider check stops activation and reports a safe error. It may require the owner to fix API billing, quota, model access, or the key. No billing setting is changed automatically. Mock tests do not prove a live provider response, and the provider check does not prove a completed user browser session.

To disable live AI, set AI_ENABLED=false in the deployed Worker configuration and redeploy, or roll back to the previous Worker version. Do not reset the usage row silently.
