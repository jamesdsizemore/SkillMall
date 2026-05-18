import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/github";
import { getInstallsByAgentType, getInstallCount } from "@/lib/analytics";
import { getAllSkills } from "@/lib/skills";

export default async function DashboardPage() {
  // Auth check — session cookie
  const cookieStore = await cookies();
  const token = cookieStore.get("sm_session")?.value;
  const session = token ? getSession(token) : null;

  if (!session) {
    redirect("/api/auth/login");
  }

  // Get all skills authored by this user
  const allSkills = getAllSkills();
  const mySkills = allSkills.filter(
    (s) => s.author === session.github_login
  );

  return (
    <div className="bg-sm-bg min-h-screen px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <p
          className="mb-2 text-[9px] tracking-widest text-sm-secondary"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ CONTRIBUTOR DASHBOARD ]
        </p>
        <h1 className="mb-2 text-2xl font-bold text-sm-display">
          {session.github_login}&apos;s Skills
        </h1>
        <p className="mb-8 text-sm text-sm-secondary">
          Aggregate install analytics for your skills. No user data is shown — counts are aggregate only.
        </p>

        {mySkills.length === 0 ? (
          <div className="border border-sm-border p-6 text-center">
            <p
              className="text-[9px] tracking-widest text-sm-disabled"
              style={{ fontFamily: "var(--font-space-mono, monospace)" }}
            >
              [ NO SKILLS FOUND ]
            </p>
            <p className="mt-2 text-sm text-sm-secondary">
              Add your GitHub username as the <code>author</code> field in your SKILL.md frontmatter.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {mySkills.map((skill) => {
              const total = getInstallCount(skill.slug);
              const byAgent = getInstallsByAgentType(skill.slug);

              return (
                <div key={skill.slug} className="border border-sm-border bg-sm-surface p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-sm-display">{skill.name}</p>
                      <p
                        className="text-[9px] tracking-widest text-sm-secondary"
                        style={{ fontFamily: "var(--font-space-mono, monospace)" }}
                      >
                        [ {skill.category.toUpperCase()} ] v{skill.version}
                      </p>
                    </div>
                    <div
                      className="text-2xl font-black text-sm-display"
                      style={{ fontFamily: '"Doto", monospace' }}
                    >
                      {total}
                    </div>
                  </div>

                  {Object.keys(byAgent).length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(byAgent).map(([agent, count]) => (
                        <div
                          key={agent}
                          className="text-center border border-sm-border-subtle p-2"
                        >
                          <p
                            className="text-[8px] tracking-widest text-sm-disabled mb-1"
                            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
                          >
                            {agent}
                          </p>
                          <p className="text-sm font-semibold text-sm-primary">{count}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p
                      className="text-[9px] tracking-widest text-sm-disabled"
                      style={{ fontFamily: "var(--font-space-mono, monospace)" }}
                    >
                      [ NO INSTALLS RECORDED YET ]
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
