import { useMemo } from "react";

function StarLayer({ count, size, opacity, duration }: { count: number; size: number; opacity: number; duration: number }) {
  const shadow = useMemo(() => {
    const parts: string[] = [];
    for (let i = 0; i < count; i++) {
      const x = Math.floor(Math.random() * 2000);
      const y = Math.floor(Math.random() * 2000);
      parts.push(`${x}px ${y}px #FFF`);
    }
    return parts.join(", ");
  }, [count]);
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ opacity }}
      aria-hidden
    >
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          background: "transparent",
          boxShadow: shadow,
          borderRadius: "50%",
          animation: `star-drift ${duration}s linear infinite`,
          position: "absolute",
        }}
      />
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          background: "transparent",
          boxShadow: shadow,
          borderRadius: "50%",
          position: "absolute",
          top: "2000px",
          animation: `star-drift ${duration}s linear infinite`,
        }}
      />
    </div>
  );
}

export function AppBackground({ subtle = false }: { subtle?: boolean }) {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 20% 0%, #0A0F1F 0%, #030712 45%, #020617 100%)",
        }}
      />
      {!subtle && (
        <>
          <StarLayer count={90} size={1} opacity={0.35} duration={200} />
          <StarLayer count={40} size={2} opacity={0.25} duration={140} />
          <div className="absolute inset-0 bp-grid opacity-[0.05]" />
          <div
            className="orbital-glow"
            style={{
              width: "820px",
              height: "820px",
              top: "-160px",
              right: "-160px",
              opacity: 0.55,
            }}
          />
        </>
      )}
    </div>
  );
}