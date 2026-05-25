import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
});

describe("GitHub auth login route", () => {
  it("redirects locally when auth is disabled by missing GitHub OAuth config", async () => {
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;
    delete process.env.SKILL_MALL_AUTH_DISABLED;
    delete process.env.NEXT_PUBLIC_APP_URL;

    const { GET } = await import("../login/route");
    const response = await GET(new NextRequest("http://localhost:3123/api/auth/login"));

    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    expect(response.headers.get("location")).toBe("http://localhost:3123/settings");
    expect(response.headers.get("location")).not.toContain("github.com");
    expect(response.headers.get("location")).not.toContain("/settings/providers");
  });

  it("returns a local configuration error instead of redirecting with client_id=undefined when auth is forced on", async () => {
    delete process.env.GITHUB_CLIENT_ID;
    process.env.GITHUB_CLIENT_SECRET = "test-client-secret";
    process.env.SKILL_MALL_AUTH_DISABLED = "false";
    delete process.env.NEXT_PUBLIC_APP_URL;

    const { GET } = await import("../login/route");
    const response = await GET(new NextRequest("http://localhost:3123/api/auth/login"));
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(json).toEqual({
      error: "configuration_error",
      message: "GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.",
    });
  });

  it("redirects to GitHub with a real client ID and request-origin callback", async () => {
    process.env.GITHUB_CLIENT_ID = "test-client-id";
    process.env.GITHUB_CLIENT_SECRET = "test-client-secret";
    process.env.SKILL_MALL_AUTH_DISABLED = "false";
    delete process.env.NEXT_PUBLIC_APP_URL;

    const { GET } = await import("../login/route");
    const response = await GET(new NextRequest("http://localhost:3123/api/auth/login"));
    const location = response.headers.get("location");

    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    expect(location).toBeTruthy();

    const redirect = new URL(location ?? "");
    expect(redirect.origin + redirect.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(redirect.searchParams.get("client_id")).toBe("test-client-id");
    expect(redirect.searchParams.get("redirect_uri")).toBe("http://localhost:3123/api/auth/callback/github");
    expect(location).not.toContain("undefined");
    expect(response.headers.get("set-cookie")).toContain("oauth_state=");
  });
});
