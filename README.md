# zeke-bar-mitzvah-mcp

An MCP server that exposes logistics for Zeke's Bar Mitzvah, May 9 2026.

A stdio MCP server. It fetches structured event data from <https://benjaminste.in/zekes-bar-mitzvah/index.json> and exposes it as MCP tools, so any AI assistant that speaks MCP (Claude Desktop, Claude Code, etc.) can answer questions about the day-of schedule, get directions, look up dress codes, or confirm phone-drop check-ins for teens.

## Install

```sh
npx github:benstein/zeke-bar-mitzvah-mcp
```

## Tools

- `get_schedule` — full day-of schedule (service, kiddush, reception) with times, locations, attire.
- `get_directions(event)` — parking + walking directions for `service` | `kiddush` | `reception`.
- `get_dress_code(event)` — dress code for the named event.
- `get_oncall_contact` — day-of on-call number to text.
- `check_in_at_phone_drop(name)` — honor-system check-in confirming a teenager has handed in their phone at the reception door.

## Wiring it into Claude Desktop

In Claude Desktop, go to **Claude → Settings → Developer → Edit Config**. That opens `claude_desktop_config.json` in your default editor (and creates it if needed). Add this:

```json
{
  "mcpServers": {
    "zeke-bar-mitzvah": {
      "command": "npx",
      "args": ["-y", "github:benstein/zeke-bar-mitzvah-mcp"]
    }
  }
}
```

Restart Claude Desktop, then ask "what time does Zeke's bar mitzvah service start, and what should I wear?"

## Wiring it into Claude Code

```sh
claude mcp add zeke-bar-mitzvah -- npx -y github:benstein/zeke-bar-mitzvah-mcp
```

## Dev

```sh
npm install
npm run build
node dist/index.js   # speaks MCP over stdio; pipe in JSON-RPC by hand if you're feeling brave
```

## License

MIT
