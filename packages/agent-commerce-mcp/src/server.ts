// packages/agent-commerce-mcp/src/server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { Commerce, Refunder } from "@arcora/agent-commerce-core";
import { listCatalogTool, createInvoiceTool, checkoutStatusTool, refundInvoiceTool } from "./tools.js";

/** Options for buildServer. `refunder` is optional — when omitted, the
 *  refund_invoice tool is NOT registered (the serve command only wires a
 *  refunder when a merchant key is available). */
export interface BuildServerOptions {
  refunder?: Refunder;
}

export function buildServer(commerce: Commerce, opts: BuildServerOptions = {}): McpServer {
  const server = new McpServer({ name: "arcora-agent-commerce", version: "0.1.0" });

  server.registerTool(
    "list_catalog",
    {
      title: "List catalog",
      description: "List the products this merchant agent sells (id, name, price).",
      inputSchema: {},
    },
    async (): Promise<CallToolResult> => ({ ...(await listCatalogTool(commerce)) }),
  );

  server.registerTool(
    "create_invoice",
    {
      title: "Create invoice",
      description:
        "Create an Arcorapay invoice for a catalog item id. Returns an invoice id and a checkout URL the buyer pays (cross-chain from Base supported).",
      inputSchema: { itemId: z.string().describe("Catalog item id, e.g. logo-pack") },
    },
    async ({ itemId }): Promise<CallToolResult> => ({ ...(await createInvoiceTool(commerce, { itemId })) }),
  );

  server.registerTool(
    "get_checkout_status",
    {
      title: "Get checkout status",
      description: "Look up an invoice's payment status: created | paid | expired | failed | refunded | unknown.",
      inputSchema: { invoiceId: z.string().describe("Invoice id returned by create_invoice") },
    },
    async ({ invoiceId }): Promise<CallToolResult> => ({ ...(await checkoutStatusTool(commerce, { invoiceId })) }),
  );

  if (opts.refunder) {
    const refunder = opts.refunder;
    server.registerTool(
      "refund_invoice",
      {
        title: "Refund invoice",
        description:
          "Refund a PAID invoice — returns the escrowed USDC to the ORIGINAL payer on Arc. Only valid while the invoice is paid and within the 7-day refund window; funds cannot be redirected to anyone else. Input: invoiceId (the id returned by create_invoice).",
        inputSchema: { invoiceId: z.string().describe("Invoice id returned by create_invoice") },
      },
      async ({ invoiceId }): Promise<CallToolResult> => ({ ...(await refundInvoiceTool(refunder, { invoiceId })) }),
    );
  }

  return server;
}
