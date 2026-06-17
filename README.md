# Agent Commerce

[![CI](https://github.com/Kubudak90/agent-commerce/actions/workflows/ci.yml/badge.svg)](https://github.com/Kubudak90/agent-commerce/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@arcora/agent-commerce.svg)](https://www.npmjs.com/package/@arcora/agent-commerce)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Turn an AI agent into an [Arcorapay](https://arcorapay.xyz) **merchant**. Sell from a
catalog, issue invoices in USDC, and get paid — payable cross‑chain (e.g. from Base,
bridged to Arc via Circle CCTP). Ships as a one‑command CLI plus an
[MCP](https://modelcontextprotocol.io) server any agent can run.

```bash
# one command: register a merchant wallet + write an MCP config
npx @arcora/agent-commerce onboard

# run the MCP server (your agent now has commerce tools)
npx @arcora/agent-commerce serve
```

> **Testnet.** This targets Arc Testnet via `https://arcorapay.xyz`. Use testnet funds only.

## What an agent gets

Running `serve` exposes these MCP tools:

| Tool | What it does |
|------|--------------|
| `list_catalog` | List the products this merchant sells (id, name, price). |
| `create_invoice` | Create an invoice for a catalog item → returns an invoice id + checkout URL. The buyer can pay in USDC on Arc **or bridge from Base**. |
| `get_checkout_status` | Look up an invoice's status: `created \| paid \| expired \| failed \| refunded \| unknown`. |
| `refund_invoice` | Refund a **paid** invoice — returns the escrowed USDC to the **original payer** on Arc, within the 7‑day refund window. Registered only when a merchant signing key is available; funds cannot be redirected. |

The CLI mirrors these for humans/scripts: `onboard`, `serve`, `refund <invoiceId>`.

## Packages

| Package | Published as | Role |
|---------|--------------|------|
| [`packages/sdk`](packages/sdk) | `@arcora/sdk` | Thin client for the Arcorapay public API (create invoice, status, webhooks). |
| [`packages/agent-commerce-core`](packages/agent-commerce-core) | `@arcora/agent-commerce-core` | `Commerce` (catalog + invoice + status) and `createRefunder` (on‑chain refund). |
| [`packages/agent-commerce-mcp`](packages/agent-commerce-mcp) | `@arcora/agent-commerce-mcp` | MCP stdio server (`buildServer`) wrapping the core. |
| [`packages/agent-commerce-cli`](packages/agent-commerce-cli) | **`@arcora/agent-commerce`** | The one‑command CLI: `onboard` / `serve` / `refund`. Bundles the above. |

The published [`@arcora/agent-commerce`](https://www.npmjs.com/package/@arcora/agent-commerce)
inlines core + mcp + sdk, so installing it pulls only `viem`, `siwe`,
`@modelcontextprotocol/sdk`, and `zod` — no workspace deps.

## Settling revenue on the chain of your choice

By default a merchant is paid on Arc. To have revenue land on another chain, onboard
with a payout chain (the relayer bridges Arc → your chain via CCTP):

```bash
npx @arcora/agent-commerce onboard --payout-chain 84532 --payout-address 0xYourAddress
```

## Develop

```bash
pnpm install
pnpm -r run build     # builds @arcora/sdk + the CLI bundle
pnpm -r run test      # core, mcp, cli unit tests (chain calls are mocked)
```

Copy `.env.example` → `.env` and fill in your `ARCORA_API_KEY` (from `onboard`).

## How it fits together

```
buyer ──pays USDC (Arc, or bridged from Base)──▶ Arcorapay escrow
  │                                                   │
  │  agent calls create_invoice (MCP / SDK)           │ settle
  ▼                                                   ▼
your agent ◀── get_checkout_status ──────────── merchant payout (Arc, or
   │                                              bridged to your chosen chain)
   └── refund_invoice ──▶ returns escrow to the original payer (7‑day window)
```

## Security

- The merchant signing key is read‑only at runtime (`ARCORA_MERCHANT_KEY` env, or the
  `~/.arcora/merchant.key` keyfile written by `onboard`). It is never logged and never
  written into the MCP config.
- `refund_invoice` can only return funds to the original payer of a paid invoice within
  the on‑chain refund window — it cannot redirect funds to an arbitrary address.

## Documentation

- **Litepaper** — [English](docs/LITEPAPER.md) · [Türkçe](docs/LITEPAPER.tr.md): what it is, how payments flow, why USDC/Arc/CCTP, the trust & security model.
- **Roadmap** — [English](docs/ROADMAP.md) · [Türkçe](docs/ROADMAP.tr.md): what's done and what's next (mainnet, sponsored gas, more chains).

## License

MIT
