"use client";

import { useEffect, useRef, useState } from "react";

interface Stat {
  value: number;
  label: string;
  fillPercent: number;
}

function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return count;
}

function Counter({ stat, delay }: { stat: Stat; delay: number }) {
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const count = useCountUp(started ? stat.value : 0, 1400);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div ref={ref} className="flex flex-col gap-2">
      {/* Doto number */}
      <div
        className="text-6xl font-black leading-none text-sm-display sm:text-7xl"
        style={{ fontFamily: '"Doto", monospace' }}
      >
        {count}
      </div>

      {/* Space Mono ALL CAPS label */}
      <div
        className="text-[10px] tracking-widest text-sm-secondary"
        style={{ fontFamily: "var(--font-space-mono, monospace)" }}
      >
        [ {stat.label} ]
      </div>

      {/* Segmented bar */}
      <div className="h-0.5 w-full bg-sm-border">
        <div
          className="h-full bg-sm-display"
          style={{
            width: started ? `${stat.fillPercent}%` : "0%",
            transition: `width 1.2s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
          }}
        />
      </div>
    </div>
  );
}

export function StatCounters({
  skillCount,
  categoryCount,
  agentCount = 54,
}: {
  skillCount: number;
  categoryCount: number;
  agentCount?: number;
}) {
  const stats: Stat[] = [
    { value: skillCount, label: "SKILLS", fillPercent: Math.min((skillCount / 200) * 100, 100) },
    { value: categoryCount, label: "CATEGORIES", fillPercent: (categoryCount / 8) * 100 },
    { value: agentCount, label: "AGENTS", fillPercent: 100 },
  ];

  return (
    <section className="border-b border-sm-border bg-sm-bg px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-3 gap-8 sm:gap-16">
          {stats.map((stat, i) => (
            <Counter key={stat.label} stat={stat} delay={i * 150} />
          ))}
        </div>
      </div>
    </section>
  );
}
