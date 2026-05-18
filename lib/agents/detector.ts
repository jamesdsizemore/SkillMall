import fs from "fs";
import path from "path";
import os from "os";
import { AGENT_REGISTRY } from "./registry";

export interface DetectedAgent {
  id: string;
  name: string;
  skillsDir: string;
  detected: boolean;
}

export interface DeployAgentResult {
  agent: DetectedAgent;
  success: boolean;
  error?: string;
}

/** Detect which agents are installed by checking filesystem for their home directories. */
export function detectAgents(): DetectedAgent[] {
  const home = os.homedir();
  return AGENT_REGISTRY.map((agent) => {
    const dir = agent.skillsDir(home);
    return {
      id: agent.id,
      name: agent.name,
      skillsDir: dir,
      detected: fs.existsSync(dir),
    };
  });
}

function copyDirRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirRecursive(s, d);
    else fs.copyFileSync(s, d);
  }
}

/**
 * Deploy a skill directory to all detected agents (or a filtered subset).
 * Logs an install event for each successful deployment.
 */
export function deployToAgents(
  skillPath: string,
  agentIds?: string[]
): DeployAgentResult[] {
  const candidates = detectAgents().filter((a) => {
    if (!a.detected) return false;
    if (agentIds && agentIds.length > 0) return agentIds.includes(a.id);
    return true;
  });

  return candidates.map((agent) => {
    try {
      const skillName = path.basename(skillPath);
      const dest = path.join(agent.skillsDir, skillName);
      copyDirRecursive(skillPath, dest);
      return { agent, success: true };
    } catch (err) {
      return {
        agent,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });
}
