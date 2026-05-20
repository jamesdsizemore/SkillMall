import { pc } from "../utils.js";
import { writeProviderConfig } from "../../../lib/providers/config-store";
import { resolveRouterProviderConfig } from "../../../lib/llm/router/config";
import {
  getRoutingPolicyRecord,
  listRoutingPolicies,
  setRoutingPolicyEnabled,
  upsertRoutingPolicy,
} from "../../../lib/llm/router/routing-policy-store";
import { simulateRoutingPolicyDecision } from "../../../lib/llm/router/routing-policy-simulation";

interface PolicyFlags {
  id?: string;
  name?: string;
  mode?: string;
  remainingUsd?: number;
  limitUsd?: number;
  estimatedCostUsd?: number;
  operation?: "skill.generate" | "skill.preview" | "skill.optimize_prompt" | "provider.test" | "chat.text" | "embedding";
  requirePricing?: boolean;
  candidateCurrent?: boolean;
  json?: boolean;
  help?: boolean;
  rejectedUnsafeFlag?: string;
}

const unsafeFlags = new Set([
  "--key",
  "--api-key",
  "--raw-key",
  "--token",
  "--access-token",
  "--session-token",
  "--browser-token",
  "--credential-path",
  "--credential-file",
  "--prompt",
  "--system-prompt",
  "--user-prompt",
  "--messages",
  "--response",
  "--output",
]);
const routeOperations = new Set([
  "skill.generate",
  "skill.preview",
  "skill.optimize_prompt",
  "provider.test",
  "chat.text",
  "embedding",
]);

function numberFlag(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseFlags(args: string[]): PolicyFlags {
  const flags: PolicyFlags = {};
  for (let i = 0; i < args.length; i++) {
    if (unsafeFlags.has(args[i])) {
      flags.rejectedUnsafeFlag = args[i];
      if (args[i + 1] && !args[i + 1].startsWith("--")) i += 1;
    } else if (args[i] === "--id" && args[i + 1]) flags.id = args[++i];
    else if (args[i] === "--name" && args[i + 1]) flags.name = args[++i];
    else if (args[i] === "--mode" && args[i + 1]) flags.mode = args[++i];
    else if (args[i] === "--remaining-usd" && args[i + 1]) flags.remainingUsd = numberFlag(args[++i]);
    else if (args[i] === "--limit-usd" && args[i + 1]) flags.limitUsd = numberFlag(args[++i]);
    else if (args[i] === "--estimated-cost-usd" && args[i + 1]) flags.estimatedCostUsd = numberFlag(args[++i]);
    else if (args[i] === "--operation" && args[i + 1]) flags.operation = args[++i] as PolicyFlags["operation"];
    else if (args[i] === "--require-pricing") flags.requirePricing = true;
    else if (args[i] === "--candidate-current") flags.candidateCurrent = true;
    else if (args[i] === "--json") flags.json = true;
    else if (args[i] === "--help" || args[i] === "-h") flags.help = true;
  }
  return flags;
}

function help(): void {
  console.log(`
${pc.bold("Usage:")}  npx skill-mall policies <command> [options]

${pc.bold("Commands:")}
  list                         List routing policies
  show --id <id>               Show a routing policy
  upsert --id <id> --name <n>  Create or update a supported routing policy
  enable --id <id>             Enable a routing policy
  disable --id <id>            Disable a routing policy
  activate --id <id>           Activate a policy on the current provider config
  simulate --id <id>           Simulate local routing and budget behavior

${pc.bold("Options:")}
  --mode <mode>                manual, fallback_chain, local_first, budget_guarded_manual
  --candidate-current          Add the current provider/model as the policy candidate
  --remaining-usd <n>          Remaining budget for budget_guarded_manual
  --limit-usd <n>              Budget limit metadata
  --estimated-cost-usd <n>     Numeric estimate for simulation or candidate metadata
  --operation <name>           chat.text, skill.generate, skill.preview, skill.optimize_prompt, provider.test, embedding
  --require-pricing            Require usable pricing during route eligibility simulation
  --json                       Print JSON

Raw keys, tokens, credential paths, prompts, messages, responses, and outputs are rejected.
`);
}

function requireId(flags: PolicyFlags): string | undefined {
  if (flags.id) return flags.id;
  console.error(pc.red("  --id is required."));
  process.exitCode = 1;
  return undefined;
}

function rejectUnsafe(flags: PolicyFlags): boolean {
  if (!flags.rejectedUnsafeFlag) return false;
  console.error(pc.red(`  Refusing unsafe policy input ${flags.rejectedUnsafeFlag}. Use references and numeric estimates only.`));
  process.exitCode = 1;
  return true;
}

function rejectInvalidOperation(flags: PolicyFlags): boolean {
  if (!flags.operation || routeOperations.has(flags.operation)) return false;
  console.error(pc.red(`  Unsupported simulation operation ${flags.operation}.`));
  process.exitCode = 1;
  return true;
}

function printPolicy(policy: NonNullable<ReturnType<typeof getRoutingPolicyRecord>>): void {
  console.log(`${pc.bold(policy.name)} (${policy.id})`);
  console.log(`  Mode: ${policy.mode}`);
  console.log(`  Enabled: ${policy.enabled ? "yes" : "no"}`);
  console.log(`  Candidates: ${policy.rules.candidates?.length ?? 0}`);
  console.log(`  Remaining USD: ${policy.budget.remainingUsd ?? "not configured"}`);
  console.log(`  Limit USD: ${policy.budget.limitUsd ?? "not configured"}`);
}

function currentCandidate(flags: PolicyFlags) {
  if (!flags.candidateCurrent) return undefined;
  const config = resolveRouterProviderConfig();
  return {
    id: `${config.providerRegistryId}-${config.model}`.replace(/[^a-zA-Z0-9._-]+/g, "-").toLowerCase(),
    config,
    ...(flags.estimatedCostUsd !== undefined ? { estimatedCostUsd: flags.estimatedCostUsd } : {}),
  };
}

function buildUpsertPayload(flags: PolicyFlags) {
  if (!flags.id || !flags.name || !flags.mode) {
    throw new Error("upsert requires --id, --name, and --mode");
  }
  const candidate = currentCandidate(flags);
  return {
    id: flags.id,
    name: flags.name,
    mode: flags.mode,
    rules: candidate ? { candidates: [candidate] } : {},
    budget: {
      ...(flags.remainingUsd !== undefined ? { remainingUsd: flags.remainingUsd } : {}),
      ...(flags.limitUsd !== undefined ? { limitUsd: flags.limitUsd } : {}),
    },
  };
}

async function activatePolicy(id: string, flags: PolicyFlags): Promise<void> {
  const policy = getRoutingPolicyRecord(id);
  if (!policy) {
    console.error(pc.red(`  Routing policy not found: ${id}`));
    process.exitCode = 1;
    return;
  }
  const config = resolveRouterProviderConfig();
  const saved = await writeProviderConfig({
    provider: config.provider,
    providerRegistryId: config.providerRegistryId,
    executionKind: config.executionKind,
    model: config.model,
    authMode: config.authMode,
    secretRef: config.secretRef,
    gatewayBackend: config.gatewayBackend,
    baseURL: config.baseURL,
    routingPolicyId: policy.id,
  });
  const payload = {
    activated: true,
    routingPolicyId: policy.id,
    activeProviderRegistryId: saved.providerRegistryId,
  };
  if (flags.json) console.log(JSON.stringify(payload, null, 2));
  else console.log(pc.green(`  Activated ${policy.id} for ${saved.providerRegistryId}.`));
}

function simulatePolicy(id: string, flags: PolicyFlags): void {
  const policy = getRoutingPolicyRecord(id);
  if (!policy) {
    console.error(pc.red(`  Routing policy not found: ${id}`));
    process.exitCode = 1;
    return;
  }
  const result = simulateRoutingPolicyDecision({
    baseConfig: resolveRouterProviderConfig(),
    policy,
    estimatedCostUsd: flags.estimatedCostUsd,
    operation: flags.operation,
    requirePricing: flags.requirePricing,
  });
  if (flags.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(`${pc.bold(policy.name)} (${policy.id})`);
  console.log(`  Simulation: ${result.blocked ? "blocked" : "allowed"}`);
  console.log(`  Provider request sent: ${result.providerRequestSent ? "yes" : "no"}`);
  console.log(`  Prompt stored: ${result.promptStored ? "yes" : "no"}`);
  console.log(`  Response stored: ${result.responseStored ? "yes" : "no"}`);
  if (result.selected) {
    console.log(`  Selected: ${result.selected.providerId} / ${result.selected.modelId}`);
  }
  for (const attempt of result.attempts) {
    console.log(`  - ${attempt.candidateId}: ${attempt.status}${attempt.reason ? ` (${attempt.reason})` : ""}`);
  }
  if (result.eligibility.length > 0) {
    console.log("  Eligibility:");
    for (const item of result.eligibility) {
      console.log(
        `  - ${item.candidateId}: capability=${item.capabilityStatus}, pricing=${item.pricingStatus}` +
          `${item.blockerCodes.length > 0 ? ` (${item.blockerCodes.join(", ")})` : ""}`
      );
    }
  }
}

export async function providerPoliciesCommand(args: string[]): Promise<void> {
  const command = args[0] ?? "help";
  const flags = parseFlags(args.slice(1));
  if (flags.help || command === "help" || command === "--help" || command === "-h") {
    help();
    return;
  }
  if (rejectUnsafe(flags)) return;
  if (rejectInvalidOperation(flags)) return;

  try {
    switch (command) {
      case "list": {
        const policies = listRoutingPolicies();
        if (flags.json) {
          console.log(JSON.stringify({ policies }, null, 2));
          return;
        }
        if (policies.length === 0) {
          console.log(pc.yellow("  No routing policies configured."));
          return;
        }
        for (const policy of policies) printPolicy(policy);
        break;
      }
      case "show": {
        const id = requireId(flags);
        if (!id) return;
        const policy = getRoutingPolicyRecord(id);
        if (!policy) {
          console.error(pc.red(`  Routing policy not found: ${id}`));
          process.exitCode = 1;
          return;
        }
        if (flags.json) console.log(JSON.stringify(policy, null, 2));
        else printPolicy(policy);
        break;
      }
      case "upsert": {
        const policy = upsertRoutingPolicy(buildUpsertPayload(flags));
        if (flags.json) console.log(JSON.stringify({ policy }, null, 2));
        else console.log(pc.green(`  Saved routing policy ${policy.id}.`));
        break;
      }
      case "enable":
      case "disable": {
        const id = requireId(flags);
        if (!id) return;
        const policy = setRoutingPolicyEnabled(id, command === "enable");
        if (flags.json) console.log(JSON.stringify({ policy }, null, 2));
        else console.log(pc.green(`  ${command === "enable" ? "Enabled" : "Disabled"} ${policy.id}.`));
        break;
      }
      case "activate": {
        const id = requireId(flags);
        if (!id) return;
        await activatePolicy(id, flags);
        break;
      }
      case "simulate": {
        const id = requireId(flags);
        if (!id) return;
        simulatePolicy(id, flags);
        break;
      }
      default:
        console.error(pc.red(`Unknown policies command: ${command}`));
        help();
        process.exitCode = 1;
    }
  } catch (error) {
    console.error(pc.red(`  Routing policy command failed: ${error instanceof Error ? error.message : "unknown error"}`));
    process.exitCode = 1;
  }
}
