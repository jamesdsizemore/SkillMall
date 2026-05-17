import type { LLMClient, CompletionOptions } from "../../providers";

export class MockLLMClient implements LLMClient {
  readonly provider = "openai" as const;
  public calls: Array<{ prompt: string; options?: CompletionOptions }> = [];
  private responses: Map<string, string>;
  private callCount = 0;
  private responseSequence?: string[];

  constructor(responses: Record<string, string> = {}) {
    this.responses = new Map(Object.entries(responses));
  }

  /** Use when you need to return different responses on successive calls */
  withSequence(responses: string[]): this {
    this.responseSequence = responses;
    this.callCount = 0;
    return this;
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    this.calls.push({ prompt, options });

    if (this.responseSequence) {
      const response = this.responseSequence[this.callCount] ?? this.responseSequence[this.responseSequence.length - 1];
      this.callCount++;
      return response;
    }

    for (const [key, response] of this.responses) {
      if (prompt.includes(key)) return response;
    }

    throw new Error(
      `MockLLMClient: no response matched. Prompt starts with: "${prompt.slice(0, 80)}"\nRegistered keys: ${[...this.responses.keys()].join(", ")}`
    );
  }
}
