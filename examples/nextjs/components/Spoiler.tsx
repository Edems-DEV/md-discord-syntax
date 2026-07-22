"use client";

import React, { useState } from "react";

export function Spoiler({ children }: { children: React.ReactNode }) {
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <span
      onClick={() => setIsRevealed(!isRevealed)}
      style={{
        backgroundColor: isRevealed ? "rgba(255, 255, 255, 0.12)" : "#2f3136",
        color: isRevealed ? "inherit" : "transparent",
        borderRadius: "3px",
        padding: "0 4px",
        cursor: "pointer",
        userSelect: isRevealed ? "text" : "none",
        transition: "background-color 0.2s ease, color 0.2s ease",
      }}
      title={isRevealed ? "" : "Click to reveal spoiler"}
    >
      {children}
    </span>
  );
}
