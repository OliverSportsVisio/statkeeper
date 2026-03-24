"use client";

import { useCallback, useRef } from "react";

interface Props {
  onSelect: (x: number, y: number) => void;
  shots?: Array<{ x: number; y: number; made: boolean; number: string }>;
}

export function CourtDiagram({ onSelect, shots }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      onSelect(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
    },
    [onSelect]
  );

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 500 470"
      className="w-full cursor-crosshair"
      onClick={handleClick}
      style={{ maxHeight: "60vh" }}
    >
      {/* Court background */}
      <rect x="0" y="0" width="500" height="470" rx="8" fill="#1a1a2e" />

      {/* Court outline */}
      <rect
        x="10" y="10" width="480" height="450" rx="4"
        fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2"
      />

      {/* Paint / key */}
      <rect
        x="170" y="10" width="160" height="190"
        fill="rgba(254,198,121,0.06)" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"
      />

      {/* Free throw circle */}
      <circle
        cx="250" cy="200" r="60"
        fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5"
      />

      {/* Basket */}
      <circle
        cx="250" cy="52" r="8"
        fill="none" stroke="var(--accent)" strokeWidth="2"
      />
      {/* Backboard */}
      <line
        x1="220" y1="40" x2="280" y2="40"
        stroke="rgba(255,255,255,0.3)" strokeWidth="2"
      />

      {/* 3-point arc */}
      <path
        d={`M 40 10 L 40 105 A 210 210 0 0 0 460 105 L 460 10`}
        fill="none"
        stroke="rgba(254,198,121,0.25)"
        strokeWidth="1.5"
      />

      {/* Half-court line */}
      <line
        x1="10" y1="460" x2="490" y2="460"
        stroke="rgba(255,255,255,0.1)" strokeWidth="1"
      />

      {/* Center circle (half) */}
      <path
        d="M 190 460 A 60 60 0 0 1 310 460"
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="1"
      />

      {/* Restricted area arc */}
      <path
        d={`M 210 10 A 40 40 0 0 0 290 10`}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="1"
        transform="translate(0, 42)"
      />

      {/* Plotted shots */}
      {shots?.map((shot, i) => {
        const sx = (shot.x / 100) * 500;
        const sy = (shot.y / 100) * 470;
        return shot.made ? (
          <g key={i}>
            <circle cx={sx} cy={sy} r="10" fill="rgba(66,245,102,0.3)" stroke="var(--green)" strokeWidth="1.5" />
            <text x={sx} y={sy + 4} textAnchor="middle" fontSize="9" fill="var(--green)" fontWeight="bold">
              {shot.number}
            </text>
          </g>
        ) : (
          <g key={i}>
            <line x1={sx - 6} y1={sy - 6} x2={sx + 6} y2={sy + 6} stroke="var(--red)" strokeWidth="2" />
            <line x1={sx + 6} y1={sy - 6} x2={sx - 6} y2={sy + 6} stroke="var(--red)" strokeWidth="2" />
            <text x={sx} y={sy - 9} textAnchor="middle" fontSize="8" fill="var(--red)" fontWeight="bold">
              {shot.number}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
