# Writable local workflows are not serverless portable

Skill creation, prompt regeneration, forking, deployment, improvement application, and other mutation workflows write to the local filesystem. We accept that these workflows require a writable local, Railway, or VPS-style environment; read-only serverless deployments such as Vercel can serve browsing and documentation but cannot support the full local authoring workflow.

**Status:** accepted

**Consequences:** Do not hide filesystem writes behind pretend serverless compatibility. Routes and docs should report writable-filesystem requirements clearly, and architecture reviews should treat read-only deployment support as a separate product decision rather than an implicit requirement.
