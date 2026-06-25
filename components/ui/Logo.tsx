import Image from "next/image";

interface LogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}

export default function Logo({ size = 48, showWordmark = false, className = "" }: LogoProps) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <Image
        src="/logo-mark.svg"
        alt="Pollux Astro"
        width={size}
        height={size}
        priority
        style={{ filter: "drop-shadow(0 0 12px rgba(212,175,95,0.5))" }}
      />
      {showWordmark && (
        <div className="text-center mt-2">
          <div
            className="font-display tracking-[0.2em] uppercase"
            style={{ color: "var(--gold)", fontSize: size * 0.28 }}
          >
            POLLUX
          </div>
          <div
            className="tracking-[0.35em] uppercase"
            style={{
              color: "var(--text-muted)",
              fontSize: size * 0.14,
              fontFamily: "var(--font-inter)",
              letterSpacing: "0.35em",
            }}
          >
            ASTRO
          </div>
        </div>
      )}
    </div>
  );
}
