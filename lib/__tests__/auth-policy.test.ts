import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  authenticationRequiredResponse,
  forbiddenResponse,
  getSessionFromRequest,
  isSkillAuthor,
  requireSkillAuthor,
  requireSkillAuthorWhenPresent,
} from "../auth/policy";
import type { Session } from "../db/types";

const session: Session = {
  id: "session-id",
  github_id: "123",
  github_login: "author-user",
  scopes: "",
  created_at: "2026-01-01T00:00:00.000Z",
  expires_at: "2026-01-08T00:00:00.000Z",
};

describe("auth policy", () => {
  it("identifies exact skill authorship", () => {
    expect(isSkillAuthor(session, { author: "author-user" })).toBe(true);
    expect(isSkillAuthor(session, { author: "other-user" })).toBe(false);
    expect(isSkillAuthor(session, { author: "" })).toBe(false);
  });

  it("returns an auth-disabled session when GitHub OAuth is unconfigured", () => {
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;
    delete process.env.SKILL_MALL_AUTH_DISABLED;

    const disabledSession = getSessionFromRequest(new NextRequest("http://localhost:3123/api/reviews"));

    expect(disabledSession).toMatchObject({
      id: "auth-disabled",
      github_login: "local-dev",
    });
    expect(isSkillAuthor(disabledSession!, { author: "any-skill-author" })).toBe(true);
  });

  it("requires exact author ownership when requested", async () => {
    expect(requireSkillAuthor(session, { author: "author-user" }, "forbidden")).toBeNull();

    const response = requireSkillAuthor(session, { author: "" }, "forbidden");

    expect(response?.status).toBe(403);
    expect(await response?.json()).toEqual({ error: "forbidden" });
  });

  it("allows missing author only for legacy unowned-skill policies", async () => {
    expect(requireSkillAuthorWhenPresent(session, { author: "" }, "forbidden")).toBeNull();
    expect(requireSkillAuthorWhenPresent(session, { author: "author-user" }, "forbidden")).toBeNull();

    const response = requireSkillAuthorWhenPresent(session, { author: "other-user" }, "forbidden");

    expect(response?.status).toBe(403);
    expect(await response?.json()).toEqual({ error: "forbidden" });
  });

  it("builds consistent auth error responses", async () => {
    expect(authenticationRequiredResponse().status).toBe(401);
    expect(await forbiddenResponse("nope").json()).toEqual({ error: "nope" });
  });
});
