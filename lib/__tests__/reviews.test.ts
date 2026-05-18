import { describe, it, expect, beforeAll } from "vitest";
import Database from "better-sqlite3";
import path from "path";
import os from "os";
import fs from "fs";

// Test database
const TEST_DB_PATH = path.join(os.tmpdir(), `reviews-test-${process.pid}.db`);
let testDb: Database.Database;

// Mock getDb to use test database
import { vi } from "vitest";
vi.mock("../db/client", () => {
  const Database = vi.fn().mockImplementation(() => testDb);
  return {
    getDb: () => testDb,
  };
});

beforeAll(() => {
  fs.mkdirSync(path.dirname(TEST_DB_PATH), { recursive: true });
  testDb = new Database(TEST_DB_PATH);
  testDb.pragma("journal_mode = WAL");
  testDb.exec(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      skill_slug TEXT NOT NULL,
      reviewer_github_id TEXT NOT NULL,
      reviewer_login TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 150),
      is_generic INTEGER NOT NULL DEFAULT 0,
      has_install_signal INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(skill_slug, reviewer_github_id)
    );
    CREATE TABLE IF NOT EXISTS install_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      skill_slug TEXT NOT NULL,
      agent_type TEXT NOT NULL,
      installed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
});

describe("isGenericReview", () => {
  it("returns true for generic phrases", async () => {
    const { isGenericReview } = await import("../reviews");
    expect(isGenericReview("great skill")).toBe(true);
    expect(isGenericReview("very useful")).toBe(true);
    expect(isGenericReview("awesome")).toBe(true);
    expect(isGenericReview("👍")).toBe(true);
  });

  it("returns false for specific reviews", async () => {
    const { isGenericReview } = await import("../reviews");
    expect(
      isGenericReview(
        "Used this to analyze our pricing strategy. Saved 3 hours."
      )
    ).toBe(false);
    expect(isGenericReview("The ERRC grid output was immediately usable in our board deck.")).toBe(false);
  });
});

describe("createReview + getReviews", () => {
  it("stores a review and retrieves it", async () => {
    const { createReview, getReviews } = await import("../reviews");

    createReview({
      skillSlug: "test-skill",
      reviewerGithubId: "user-1",
      reviewerLogin: "testuser1",
      rating: 5,
      body: "Applied this to a real project and it saved significant time.",
      hasInstallSignal: true,
    });

    const reviews = getReviews("test-skill");
    expect(reviews.length).toBeGreaterThanOrEqual(1);
    expect(reviews[0].rating).toBe(5);
    expect(reviews[0].reviewer_login).toBe("testuser1");
  });

  it("throws on duplicate review (same skill + user)", async () => {
    const { createReview } = await import("../reviews");

    expect(() =>
      createReview({
        skillSlug: "test-skill",
        reviewerGithubId: "user-1",
        reviewerLogin: "testuser1",
        rating: 4,
        body: "Second review attempt.",
        hasInstallSignal: true,
      })
    ).toThrow("already reviewed");
  });

  it("sets is_generic for generic reviews", async () => {
    const { createReview, getReviews } = await import("../reviews");

    createReview({
      skillSlug: "generic-skill",
      reviewerGithubId: "user-2",
      reviewerLogin: "testuser2",
      rating: 5,
      body: "great skill",
      hasInstallSignal: false,
    });

    const reviews = getReviews("generic-skill");
    expect(reviews[0].is_generic).toBe(1);
  });

  it("specific reviews appear before generic reviews", async () => {
    const { createReview, getReviews } = await import("../reviews");

    createReview({
      skillSlug: "order-skill",
      reviewerGithubId: "gen-user",
      reviewerLogin: "genuser",
      rating: 5,
      body: "great skill",
      hasInstallSignal: false,
    });

    createReview({
      skillSlug: "order-skill",
      reviewerGithubId: "spec-user",
      reviewerLogin: "specuser",
      rating: 4,
      body: "Used this in production for competitive analysis. Works well.",
      hasInstallSignal: true,
    });

    const reviews = getReviews("order-skill");
    expect(reviews[0].is_generic).toBe(0); // specific first
    expect(reviews[1].is_generic).toBe(1); // generic second
  });
});

describe("getEffectivenessScore", () => {
  it("returns null when no reviews exist", async () => {
    const { getEffectivenessScore } = await import("../reviews");
    expect(getEffectivenessScore("no-reviews-skill")).toBeNull();
  });

  it("weights specific reviews 2x generic reviews", async () => {
    const { createReview, getEffectivenessScore } = await import("../reviews");

    // 1 specific 5-star + 1 generic 1-star
    // score = (5*2 + 1*1) / (2+1) = 11/3 = 3.7
    createReview({
      skillSlug: "weighted-skill",
      reviewerGithubId: "spec-w",
      reviewerLogin: "specw",
      rating: 5,
      body: "Used this for strategic analysis in a board presentation — saved 3 hours.",
      hasInstallSignal: true,
    });

    createReview({
      skillSlug: "weighted-skill",
      reviewerGithubId: "gen-w",
      reviewerLogin: "genw",
      rating: 1,
      body: "nice",
      hasInstallSignal: false,
    });

    const score = getEffectivenessScore("weighted-skill");
    expect(score).not.toBeNull();
    expect(score).toBeCloseTo(3.7, 1);
  });
});
