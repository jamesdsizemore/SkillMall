# Share core behavior behind thin surfaces

SkillMall exposes the same domain workflows through the Web Surface, CLI Surface, and MCP Surface. Core behavior should live in shared modules, while Next.js routes, CLI commands, and MCP handlers act as adapters for transport, auth, input parsing, and presentation.

**Status:** accepted

**Consequences:** When behavior appears in both a route and a CLI command, prefer deepening a shared module over copying logic. Standalone adapters may stay pure Node, but they should still depend on shared domain interfaces when that does not pull in Next.js-only code.
