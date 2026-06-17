# Agent Commerce — Roadmap

How the agent payment rail has been built so far, and where it goes next. See
[LITEPAPER.md](./LITEPAPER.md) for what the system is and how it works.

**Legend:** ✅ done & verified · 🟡 in progress · ⏭️ next · 🔭 later

> **Honest status (testnet).** The full inbound → settle → claim/refund → outbound loop
> is live and has been exercised end‑to‑end on **Arc Testnet** with **Base Sepolia** as a
> source chain. The product is **not yet on mainnet**. Future phases below carry no fixed
> dates and no commitment beyond intent.

---

## ✅ Phase 0 — Core & tools

- `@arcora/sdk` — typed client for the Arcorapay public API (create invoice, status, webhooks).
- `@arcora/agent-commerce-core` — `Commerce`: catalog, invoice creation, status mapping.
- `@arcora/agent-commerce-mcp` — MCP stdio server exposing `list_catalog`, `create_invoice`, `get_checkout_status`.
- Merchant onboarding against the live ArcFXGateway (register merchant + scoped delegate).
- A chat‑storefront demo proving the end‑to‑end agent → invoice flow.

## ✅ Phase 1 — One‑command distribution

- `@arcora/agent-commerce` CLI: `onboard` (wallet → registered merchant → API key + MCP config) and `serve` (run the MCP server).
- Single bundled binary that inlines core + mcp + sdk; no workspace plumbing for consumers.
- Published to npm (MIT), independently verified via a clean registry install.

## ✅ Phase 2 — Cross‑chain inbound (pay from another chain)

- A buyer on **Base Sepolia** pays USDC; the payment is bridged to Arc via **CCTP**
  (burn → IRIS attestation → mint) and settled into escrow.
- Driven automatically by the relayer; the agent only creates one invoice.
- Proven end‑to‑end with a real testnet payment.

## ✅ Phase 3 — Payout‑chain, refunds & open source

- **Payout‑chain (outbound hop):** `onboard --payout-chain <id> --payout-address <0x…>`
  lets a merchant receive revenue on the chain of its choice; the relayer bridges
  Arc → target via CCTP.
- **Refunds:** `refund_invoice` MCP tool + `refund` CLI command + `createRefunder` in
  core, returning escrowed USDC to the original payer within the on‑chain refund window.
- A distinct `refunded` checkout status (no longer collapsed into `failed`).
- Public source repository with green CI (build + test on every push) and a tagged
  release.

## ⏭️ Phase 4 — Mainnet

The next milestone: take the rail from testnet to production.

- Deploy and verify ArcFXGateway on **Arc mainnet**; publish the address registry.
- Switch to **mainnet CCTP V2** domains/addresses and the production attestation service.
- Settle in **real USDC**; fund and harden the relayer for mainnet (gas, monitoring,
  alerting, retries).
- Production hardening: rate limits, observability, incident runbooks, key management.

## ⏭️ Phase 5 — Zero‑friction onboarding (sponsored gas)

- A **paymaster** sponsors the on‑chain onboarding transactions (merchant registration +
  delegate authorization), so an operator can onboard an agent with **no gas** of their
  own — true one‑command setup at scale.

## 🔭 Phase 6 — More chains

- Additional **source chains** for inbound payments (e.g. Ethereum, Arbitrum, Optimism,
  Polygon, and Solana) as CCTP coverage allows.
- Additional **payout chains** for outbound settlement.

## 🔭 Phase 7 — Richer commerce

- Dynamic / per‑merchant catalogs instead of a fixed list.
- Subscriptions, metered and usage‑based billing — natural fits for agent‑to‑agent commerce.
- Multi‑item carts and bundled invoices.
- First‑class webhooks/events an agent can subscribe to (paid, refunded, expired).

## 🔭 Phase 8 — Ecosystem

- Interop with emerging **agentic‑payment standards** (e.g. the x402 family) so agents
  can both *accept* and *pay*.
- Discovery: listing agent merchants and their catalogs.
- Reputation and analytics for agent merchants.

---

*This roadmap reflects current intent and will evolve. It is not a commitment or a
financial promise, and the project has no token.*
