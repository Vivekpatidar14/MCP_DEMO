import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { z } from "zod";
import { logger } from "@/lib/logger";

const contentItemSchema = z.union([
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({ type: z.string() }).passthrough(),
]);

const callToolResultSchema = z.object({
  content: z.array(contentItemSchema).optional(),
  isError: z.boolean().optional(),
  structuredContent: z.unknown().optional(),
});

export type ParsedCallToolResult = z.infer<typeof callToolResultSchema>;

export function parseCallToolResult(raw: unknown): ParsedCallToolResult {
  const parsed = callToolResultSchema.safeParse(raw);
  if (!parsed.success) {
    logger.error("Invalid MCP CallToolResult shape", {
      issues: parsed.error.flatten(),
    });
    throw new Error("Invalid MCP tool response");
  }
  return parsed.data;
}

export function toolResultText(result: ParsedCallToolResult): string {
  const chunks =
    result.content?.filter((c) => c.type === "text").map((c) => c.text) ?? [];
  return chunks.join("\n").trim();
}

export function toolResultJson<T>(result: ParsedCallToolResult): T | null {
  const text = toolResultText(result);
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function withSseMcpSession<T>(options: {
  url: string;
  bearerToken: string;
  extraHeaders?: Record<string, string>;
  run: (client: Client) => Promise<T>;
}): Promise<T> {
  const client = new Client(
    { name: "ticket-to-pr-demo", version: "1.0.0" },
    { capabilities: {} },
  );

  const headers: Record<string, string> = {
    Authorization: `Bearer ${options.bearerToken}`,
    ...(options.extraHeaders ?? {}),
  };

  const transport = new SSEClientTransport(new URL(options.url), {
    requestInit: { headers },
    eventSourceInit: {
      fetch: (input, init) => {
        const merged = new Headers(init?.headers);
        for (const [k, v] of Object.entries(headers)) {
          merged.set(k, v);
        }
        return fetch(input, { ...init, headers: merged });
      },
    },
  });

  try {
    await client.connect(transport);
    return await options.run(client);
  } catch (error) {
    logger.error("MCP session failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    try {
      await transport.close();
    } catch {
      /* ignore */
    }
    try {
      await client.close();
    } catch {
      /* ignore */
    }
  }
}

export async function callToolSafe(
  client: Client,
  toolName: string,
  args: Record<string, unknown>,
): Promise<ParsedCallToolResult> {
  const raw = await client.callTool({ name: toolName, arguments: args });
  const parsed = parseCallToolResult(raw);
  if (parsed.isError) {
    const message = toolResultText(parsed) || "MCP tool returned an error";
    throw new Error(`${toolName}: ${message}`);
  }
  return parsed;
}
