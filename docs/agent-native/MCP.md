# Escala MCP

Read-only Model Context Protocol endpoint. Does **not** replace `/api/tokens`.

- **Discovery:** `GET /api/mcp`
- **JSON-RPC:** `POST /api/mcp` (`initialize`, `tools/list`, `tools/call`, `ping`)
- **Schema:** `/docs/agent-native/tokens.schema.json` (copy of `docs/agent-native/tokens.schema.json`)
- **Publish/fetch:** still `GET|POST /api/tokens?project=`

## Tools

| Tool | Needs published JSON | Notes |
|---|---|---|
| `get_tokens` | yes | Same payload the plugin fetches |
| `resolve_token` | yes | Catalogue id or Figma slashes → CSS + hex |
| `list_components` | no | Catalogue only |
| `get_component` | no | Props + a11y + Figma sets |
| `list_icons` | yes | `icons.aiSource` + custom names |
| `check_contrast` | no | `lib/color/apca.ts` (`evaluate`) |

## Cursor

```json
{
  "mcpServers": {
    "escala-tokens": {
      "url": "https://escalatokens.com/api/mcp"
    }
  }
}
```

Public, no auth (same as `/api/tokens`). CORS `*`.

Implementation: `src/lib/agentAccess/` (pure) + `api/mcp.ts` (Blob read).
