import { NextResponse } from "next/server";
import { ConfigError, resolveProviderConfig } from "@/lib/providers";

const PROVIDER_CATALOG = [
  {
    id: "openai",
    name: "OpenAI",
    requiresApiKey: true,
    defaultModel: "gpt-4o",
    availableModels: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
    setupUrl: "https://platform.openai.com/api-keys",
    setupInstructions: "Get an API key from platform.openai.com and add SKILL_MALL_API_KEY to .env.local",
  },
  {
    id: "claude-code",
    name: "Claude Code CLI",
    requiresApiKey: false,
    defaultModel: "claude-sonnet-4-6",
    availableModels: ["claude-sonnet-4-6", "claude-opus-4-7", "claude-haiku-4-5-20251001"],
    setupUrl: "https://claude.ai/code",
    setupInstructions: "Install Claude Code CLI and authenticate. No API key required.",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    requiresApiKey: true,
    defaultModel: "gemini-2.0-flash-exp",
    availableModels: ["gemini-2.0-flash-exp", "gemini-1.5-pro"],
    setupUrl: "https://aistudio.google.com/app/apikey",
    setupInstructions: "Get an API key from Google AI Studio and add SKILL_MALL_API_KEY to .env.local",
  },
  {
    id: "groq",
    name: "Groq",
    requiresApiKey: true,
    defaultModel: "llama-3.3-70b-versatile",
    availableModels: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
    setupUrl: "https://console.groq.com/keys",
    setupInstructions: "Get an API key from Groq console and add SKILL_MALL_API_KEY to .env.local",
  },
  {
    id: "ollama",
    name: "Ollama (Local)",
    requiresApiKey: false,
    defaultModel: "llama3.1",
    availableModels: ["llama3.1", "mistral", "codellama"],
    setupUrl: "https://ollama.ai",
    setupInstructions: "Install Ollama, run 'ollama pull llama3.1', then 'ollama serve'. No API key needed.",
  },
];

export async function GET() {
  try {
    const config = resolveProviderConfig();
    return NextResponse.json({
      configured: true,
      activeProvider: config.provider,
      activeModel: config.model,
      providers: PROVIDER_CATALOG,
    });
  } catch (err) {
    if (err instanceof ConfigError) {
      return NextResponse.json({
        configured: false,
        activeProvider: null,
        activeModel: null,
        providers: PROVIDER_CATALOG,
      });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
