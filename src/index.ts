#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const DATA_URL = process.env.ZEKE_BM_DATA_URL ?? "https://benjaminste.in/zekes-bar-mitzvah/index.json";

interface EventRecord {
  id: string;
  name: string;
  start?: string;
  end?: string;
  location?: { name?: string; address?: string; park?: string };
  attire?: string;
  parking?:
    | string
    | {
        lot?: string;
        fee_usd?: number;
        walking_directions?: string[];
        pro_tip?: string;
      };
  if_lost?: string;
  notes?: string[];
}

interface Logistics {
  title: string;
  date: string;
  events: EventRecord[];
  contacts: { name: string; phone: string; preferred_for_day_of?: boolean; note?: string }[];
}

let cached: Logistics | null = null;

async function getData(): Promise<Logistics> {
  if (cached) return cached;
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error(`Failed to fetch ${DATA_URL}: ${res.status}`);
  cached = (await res.json()) as Logistics;
  return cached;
}

const tools = [
  {
    name: "get_schedule",
    description: "Returns the full day-of schedule (service, kiddush, reception) with start/end times, locations, and attire.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_directions",
    description: "Returns parking and walking directions to a named event.",
    inputSchema: {
      type: "object",
      properties: {
        event: {
          type: "string",
          enum: ["service", "kiddush", "reception"],
          description: "Which event to get directions to.",
        },
      },
      required: ["event"],
      additionalProperties: false,
    },
  },
  {
    name: "get_dress_code",
    description: "Returns the dress code for a named event.",
    inputSchema: {
      type: "object",
      properties: {
        event: { type: "string", enum: ["service", "kiddush", "reception"] },
      },
      required: ["event"],
      additionalProperties: false,
    },
  },
  {
    name: "get_oncall_contact",
    description: "Returns the day-of on-call contact (Gabi). Text first if you need help.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "check_in_at_phone_drop",
    description: "Confirms a teenager has handed in their phone at the reception door. Honor system. Returns a confirmation message and a blessing.",
    inputSchema: {
      type: "object",
      properties: { name: { type: "string", description: "Name of the teenager checking in." } },
      required: ["name"],
      additionalProperties: false,
    },
  },
];

const server = new Server(
  { name: "zeke-bar-mitzvah-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const data = await getData();
  const args = (req.params.arguments ?? {}) as Record<string, unknown>;

  const findEvent = (id: string) => {
    const direct = data.events.find((e) => e.id === id);
    if (direct) return direct;
    if (id === "kiddush") return data.events.find((e) => e.id === "service") ?? null;
    return null;
  };

  switch (req.params.name) {
    case "get_schedule":
      return { content: [{ type: "text", text: JSON.stringify(data.events, null, 2) }] };

    case "get_directions": {
      const id = String(args.event ?? "");
      const ev = findEvent(id);
      if (!ev) return { content: [{ type: "text", text: `Unknown event: ${id}` }], isError: true };
      const lines: string[] = [`Directions to ${ev.name}:`];
      if (ev.location?.name) lines.push(`Location: ${ev.location.name}`);
      if (ev.location?.address) lines.push(`Address: ${ev.location.address}`);
      if (typeof ev.parking === "string") {
        lines.push(`Parking: ${ev.parking}`);
      } else if (ev.parking) {
        if (ev.parking.lot) lines.push(`Park at: ${ev.parking.lot}${ev.parking.fee_usd ? ` ($${ev.parking.fee_usd})` : ""}`);
        if (ev.parking.walking_directions?.length) {
          lines.push("Walking directions:");
          ev.parking.walking_directions.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`));
        }
        if (ev.parking.pro_tip) lines.push(`Pro tip: ${ev.parking.pro_tip}`);
      }
      if (ev.if_lost) lines.push(`If lost: ${ev.if_lost}`);
      return { content: [{ type: "text", text: lines.join("\n") }] };
    }

    case "get_dress_code": {
      const id = String(args.event ?? "");
      const ev = findEvent(id);
      if (!ev) return { content: [{ type: "text", text: `Unknown event: ${id}` }], isError: true };
      return { content: [{ type: "text", text: ev.attire ?? "(no specific dress code)" }] };
    }

    case "get_oncall_contact": {
      const c = data.contacts.find((x) => x.preferred_for_day_of) ?? data.contacts[0];
      const note = c.note ?? "Text first if you need help.";
      return { content: [{ type: "text", text: `${c.name}\n${c.phone}\n\n${note}` }] };
    }

    case "check_in_at_phone_drop": {
      const name = String(args.name ?? "anonymous teen");
      return {
        content: [
          {
            type: "text",
            text: `${name} is now phone-free. Welcome to the party. Mazel tov.`,
          },
        ],
      };
    }

    default:
      return { content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
