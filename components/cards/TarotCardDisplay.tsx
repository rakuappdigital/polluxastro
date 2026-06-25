"use client";

import { useState } from "react";
import Image from "next/image";
import { TarotCard } from "@/lib/tarot-data";

interface TarotCardDisplayProps {
  card?: TarotCard;
  isRevealed?: boolean;
  isReversed?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  onClick?: () => void;
  showBack?: boolean;
  position?: string;
  animDelay?: number;
}

const CARD_ICONS: Record<string, string> = {
  wands: "/icons/suit-wands.png",
  cups: "/icons/suit-cups.png",
  swords: "/icons/suit-swords.png",
  pentacles: "/icons/suit-pentacles.png",
};

const MAJOR_SYMBOLS: Record<number, string> = {
  0: "☿", 1: "☽", 2: "♀", 3: "♂", 4: "♃", 5: "♄",
  6: "⊙", 7: "♈", 8: "♍", 9: "♎", 10: "♏", 11: "♐",
  12: "♑", 13: "♒", 14: "♓", 15: "☉", 16: "☾", 17: "♆",
  18: "♇", 19: "⚸", 20: "☿", 21: "♄",
};

export default function TarotCardDisplay({
  card,
  isRevealed = false,
  isReversed = false,
  size = "md",
  onClick,
  showBack = true,
  position,
  animDelay = 0,
}: TarotCardDisplayProps) {
  const [flipped, setFlipped] = useState(isRevealed);
  const [hasFlipped, setHasFlipped] = useState(isRevealed);

  const sizeMap = {
    sm: { w: "w-20", h: "h-32", text: "text-xs" },
    md: { w: "w-28", h: "h-44", text: "text-sm" },
    lg: { w: "w-36", h: "h-56", text: "text-base" },
    xl: { w: "w-44", h: "h-72", text: "text-lg" },
  };
  const dims = sizeMap[size];

  const handleClick = () => {
    if (showBack && !flipped) {
      setFlipped(true);
      setTimeout(() => setHasFlipped(true), 400);
    }
    onClick?.();
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {position && (
        <span
          className="text-xs uppercase tracking-widest font-sans-app opacity-60"
          style={{ color: "var(--text-muted)" }}
        >
          {position}
        </span>
      )}

      <div
        className={`card-container ${dims.w} ${dims.h} cursor-pointer`}
        onClick={handleClick}
        style={{
          animationDelay: `${animDelay}ms`,
        }}
      >
        <div className={`card-inner ${flipped ? "flipped" : ""}`}>
          {/* Card Back */}
          <div className="card-face card-front glow-purple">
            <div
              className="w-full h-full flex flex-col items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #2D1B5E, #1A0A2E)",
                border: "1px solid rgba(212, 175, 95, 0.25)",
              }}
            >
              <div
                className="w-3/4 h-3/4 flex items-center justify-center rounded-lg"
                style={{
                  background: "repeating-linear-gradient(45deg, rgba(212,175,95,0.04) 0px, rgba(212,175,95,0.04) 1px, transparent 1px, transparent 8px)",
                  border: "1px solid rgba(212, 175, 95, 0.15)",
                }}
              >
                <span className="text-3xl opacity-40">✦</span>
              </div>
            </div>
          </div>

          {/* Card Front */}
          <div className="card-face card-back">
            {card ? (
              <div
                className="w-full h-full flex flex-col"
                style={{
                  background: `linear-gradient(165deg, ${card.color}22, #1A0A2E)`,
                  border: `1px solid ${card.color}44`,
                  transform: isReversed ? "rotate(180deg)" : undefined,
                }}
              >
                {/* Card Art Area */}
                <div
                  className="flex-1 flex flex-col items-center justify-center p-3"
                  style={{
                    background: `radial-gradient(ellipse at 50% 40%, ${card.color}15, transparent 70%)`,
                  }}
                >
                  <div
                    className="mb-2"
                    style={{ filter: `drop-shadow(0 0 10px ${card.color}80)` }}
                  >
                    {card.suit && CARD_ICONS[card.suit] ? (
                      <Image
                        src={CARD_ICONS[card.suit]}
                        alt={card.suit}
                        width={size === "sm" ? 20 : size === "md" ? 28 : 36}
                        height={size === "sm" ? 20 : size === "md" ? 28 : 36}
                        style={{ objectFit: "contain", opacity: 0.85 }}
                      />
                    ) : (
                      <span className="text-3xl" style={{ color: card.color }}>✦</span>
                    )}
                  </div>

                  {/* Decorative lines */}
                  <div
                    className="w-12 h-px mb-2"
                    style={{ background: `${card.color}60` }}
                  />

                  <div
                    className={`text-center font-display ${dims.text} leading-tight`}
                    style={{ color: card.color, textShadow: `0 0 20px ${card.color}50` }}
                  >
                    {card.nameTR}
                  </div>

                  {card.arcana === "major" && (
                    <div className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                      {typeof card.number === "number" ? `${card.number}` : card.number}
                    </div>
                  )}
                </div>

                {/* Keywords strip */}
                <div
                  className="px-2 py-1 flex flex-wrap gap-1 justify-center"
                  style={{ borderTop: `1px solid ${card.color}20` }}
                >
                  {card.keywordsTR.slice(0, 2).map(kw => (
                    <span
                      key={kw}
                      className="text-[9px] uppercase tracking-wide"
                      style={{ color: `${card.color}99` }}
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center glass">
                <span className="text-2xl">✦</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
