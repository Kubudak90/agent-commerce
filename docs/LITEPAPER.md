# Agent Commerce — Litepaper

**A payment rail for AI agents.** Turn any AI agent into a merchant: it sells from a
catalog, issues invoices in USDC, gets paid cross‑chain, and can refund — all
programmatically, with no human in the loop.

> **Status: Testnet.** Everything described here runs today on Arc Testnet (with
> cross‑chain payments from Base Sepolia). Mainnet is the next phase — see
> [ROADMAP.md](./ROADMAP.md). This document distinguishes what is *live* from what is
> *planned*; nothing here is a financial promise and there is no token.

---

## 1. The problem: agents can sell, but they can't get paid

AI agents are starting to *do* commerce — they generate assets, answer questions, run
tools, call APIs, and complete tasks that have real value. But the payment layer was
built for human businesses:

- **Card rails (Stripe, PayPal, …)** typically require a registered business, a bank
  account, KYC, and a human watching a dashboard. An autonomous agent has none of these.
- **Raw on‑chain transfers** can move money, but they don't give you an *invoice*, a
  *checkout*, a *status to poll*, a *refund path*, or settlement on the chain you want.
- **The buyer and the seller are rarely on the same chain.** An agent shouldn't have to
  care which network its customer holds funds on.

The result: agents can produce value but have no native, programmatic way to **accept**
it. The "merchant side" for agents is missing.

## 2. The solution: Agent Commerce

Agent Commerce gives an agent a merchant identity and a set of tools, the way Stripe
gives a website a checkout — but designed for autonomous software and settled in
stablecoins.

```bash
# One command: register the agent's wallet as a merchant + write an MCP config
npx @arcora/agent-commerce onboard

# Run the MCP server — the agent now has commerce tools
npx @arcora/agent-commerce serve
```

After `serve`, any [MCP](https://modelcontextprotocol.io)-capable agent (Claude, Kimi
CLI, Hermes, and others) gains four tools:

| Tool | What it does |
|------|--------------|
| `list_catalog` | List the products this merchant sells (id, name, price). |
| `create_invoice` | Create an invoice for a catalog item → returns an invoice id + a checkout URL. The buyer can pay in USDC **on Arc, or bridge from another chain**. |
| `get_checkout_status` | Poll an invoice: `created · paid · expired · failed · refunded · unknown`. |
| `refund_invoice` | Refund a *paid* invoice — returns the escrowed USDC to the **original payer**, within the refund window. Funds cannot be redirected. |

The same actions are available to humans/scripts via the CLI: `onboard`, `serve`,
`refund <invoiceId>`.

A *merchant*, here, is simply an agent's wallet registered on Arc to receive payments.
The agent owns its **catalog** — what it offers and at what price — and uses these tools
to invoice, poll status, and refund. (On testnet the catalog is a small static demo
list; per‑agent dynamic catalogs are on the [roadmap](./ROADMAP.md).)

## 3. How a payment flows

Settlement happens on **Arc**, Circle's USDC‑native chain, through the **ArcFXGateway**
escrow contract. Cross‑chain hops use **Circle CCTP** (native burn‑and‑mint of USDC, so
there is no wrapped‑asset or bridge‑custody risk).

### Inbound (the buyer pays)

```
agent ── create_invoice ─▶ invoice id + checkout URL
                              │
buyer pays USDC ──────────────┤
   • already on Arc ──────────┼─▶ paid directly into escrow
   • on another chain (Base) ─┘   burn on source → CCTP attestation
                                   → relayer mints on Arc → settles into escrow
                                                          │
agent ── get_checkout_status ─▶ "paid"  ◀─────────────────┘
```

The agent never has to know which chain the buyer used. It creates one invoice; the
buyer pays from wherever their USDC lives.

### Outbound (the merchant gets paid where it wants)

A merchant can choose the chain it receives revenue on:

```bash
npx @arcora/agent-commerce onboard --payout-chain 84532 --payout-address 0xYourAddress
```

When the escrow becomes claimable, the relayer bridges the funds Arc → the merchant's
chosen chain via CCTP. By default, revenue stays on Arc.

### Refunds

`refund_invoice` (and the `refund` CLI command) calls the gateway's on‑chain
`refundInvoice`, returning the escrowed USDC to the **original payer** on Arc within the
**7‑day refund window**. Because the payer is fixed on‑chain, a refund can never send
funds to an arbitrary address — which is what makes it safe to expose as an agent tool.
The relayer also auto‑refunds a cross‑chain payment that fails to settle.

## 4. Why USDC, Arc, and CCTP

- **USDC** — a widely‑held, fully‑reserved dollar stablecoin. Agents price in dollars,
  not in a volatile asset.
- **Arc** — Circle's chain where **USDC is the native gas token** and finality is
  sub‑second. That makes it a natural settlement layer: no separate gas asset to manage,
  and payments confirm fast.
- **CCTP** — Circle's Cross‑Chain Transfer Protocol moves USDC by **burning** it on the
  source chain and **minting** the canonical token on the destination. No wrapped
  assets, no third‑party bridge custody — the same dollar, on another chain.

Arc itself finalizes in well under a second; a *cross‑chain* payment additionally waits
on CCTP's attestation service, which typically takes from seconds to a few minutes
depending on the source chain's finality. Together they let an agent accept a real
dollar from a buyer on almost any chain and settle it on a dollar‑native ledger.

## 5. Architecture

Agent Commerce ships as a small, focused set of packages over the Arcorapay platform:

| Layer | Package / component | Role |
|-------|---------------------|------|
| Client | [`@arcora/sdk`](https://www.npmjs.com/package/@arcora/sdk) | Typed client for the Arcorapay public API (create invoice, status, webhooks). |
| Logic | `@arcora/agent-commerce-core` | `Commerce` (catalog / invoice / status) and `createRefunder` (on‑chain refund). |
| Tools | `@arcora/agent-commerce-mcp` | MCP stdio server exposing the four tools. |
| Distribution | **`@arcora/agent-commerce`** | The one‑command CLI; bundles core + mcp + sdk into a single binary. |
| Settlement | **ArcFXGateway** (smart contract) | Merchant registry, invoice escrow, settle, claim, refund, and scoped delegate authorization. |
| Movement | **Relayer** | An Arcorapay‑operated service that watches escrow events and drives the cross‑chain inbound/outbound hops (CCTP burn → attestation → mint) and on‑chain settlement. It moves funds only *through* the escrow contract — it cannot redirect or seize them. |

The published `@arcora/agent-commerce` inlines core, mcp, and sdk, so installing it pulls
only `viem`, `siwe`, `@modelcontextprotocol/sdk`, and `zod` — no workspace plumbing.

## 6. Trust & security model

- **Non‑custodial keys.** The merchant signing key is read‑only at runtime (from an env
  var or a `0600` keyfile); it is never logged and never written into the MCP config.
- **Bounded refunds.** Refunds can only return funds to the *original payer* of a *paid*
  invoice, and only within the on‑chain refund window — they cannot redirect funds.
- **Scoped delegation.** Invoice creation is delegated to a server wallet with a single
  right (`RIGHT_CREATE_INVOICE`); settlement is performed by the relayer's role.
  Refund authority (`RIGHT_REFUND`) is separate.
- **Escrow with on‑chain timing.** Funds sit in the gateway escrow for a **7‑day
  window**: during it the merchant can refund the payer but cannot yet claim; after it
  the merchant can claim and the refund window closes. Both timings are enforced
  on‑chain, so neither side can rug the other.
- **Transparent fees.** A protocol fee (in basis points) applies per the gateway's
  on‑chain configuration: it is deducted from the merchant's payout, accrues
  transparently on‑chain, and is returned to the payer if the invoice is refunded.

## 7. Try it

- **npm:** [`@arcora/agent-commerce`](https://www.npmjs.com/package/@arcora/agent-commerce) (MIT)
- **Source:** [github.com/Kubudak90/agent-commerce](https://github.com/Kubudak90/agent-commerce)
- **Quickstart:** `npx @arcora/agent-commerce onboard` → add `npx @arcora/agent-commerce serve` to your agent's MCP config → sell.

## 8. What's proven today (testnet)

On Arc Testnet, with Base Sepolia as a source chain, the full loop has been exercised
end‑to‑end:

- An agent onboarded as a live merchant and issued real invoices.
- A buyer paid from **Base Sepolia**; the payment bridged via CCTP and settled on Arc as
  `paid`.
- The outbound payout hop was exercised: the relayer bridged USDC **Arc → Base** via
  CCTP (burn on Arc → attestation → mint on Base). The full claim → payout for a live
  merchant is gated by the 7‑day escrow window, so it completes after that window rather
  than instantly.
- A paid invoice was **refunded** on‑chain, returning the USDC to the original payer.

What remains is the move to **mainnet** and zero‑friction onboarding via sponsored gas —
covered in [ROADMAP.md](./ROADMAP.md).

---

### Appendix — reference (testnet)

| Item | Value |
|------|-------|
| Settlement chain | Arc Testnet (chain id `5042002`, CCTP domain `26`, USDC‑native gas) |
| Example source chain | Base Sepolia (chain id `84532`, CCTP domain `6`) |
| Settlement contract | ArcFXGateway `0xEaE914D53B2895c832dA83419a7687eF7D1d0142` (Arc Testnet) |
| Cross‑chain | Circle CCTP V2 (burn → IRIS attestation → mint) |
| Package | `@arcora/agent-commerce` (npm, MIT) |

*Addresses and parameters above are testnet values and will change for mainnet.*
