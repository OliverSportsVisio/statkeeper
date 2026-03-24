"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

interface Props {
  boardId: string;
  compact?: boolean;
}

export function SharePanel({ boardId, compact }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");

  useEffect(() => {
    const base = window.location.origin;
    const publicUrl = `${base}/board/${boardId}`;
    setUrl(publicUrl);

    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, publicUrl, {
        width: compact ? 160 : 240,
        margin: 2,
        color: { dark: "#EAEDF0", light: "#0A0A0F" },
      });
    }
  }, [boardId, compact]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  };

  const handleDownloadQR = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `statkeeper-${boardId}-qr.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className={compact ? "text-center" : "max-w-md mx-auto px-4 py-8 text-center"}>
      <h2 className={`gradient-text font-bold ${compact ? "text-base mb-3" : "text-xl mb-6"}`}>
        Share This Board
      </h2>

      <div className={compact ? "mb-3" : "glass-card inline-block p-6 mb-6"}>
        <canvas ref={canvasRef} className="mx-auto" />
      </div>

      <div className={`flex items-center gap-2 ${compact ? "mb-3" : "glass-card p-3 mb-4"}`}>
        <input
          readOnly
          value={url}
          className={`flex-1 bg-transparent text-[var(--text-secondary)] outline-none truncate ${compact ? "text-xs" : "text-sm"}`}
        />
        <button
          onClick={handleCopy}
          className={`shrink-0 rounded-lg font-semibold gradient-pill ${compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"}`}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      <button
        onClick={handleDownloadQR}
        className={`rounded-lg font-medium bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-medium)] transition-colors ${compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"}`}
      >
        Download QR
      </button>

      <p className={`text-[var(--text-muted)] ${compact ? "text-[10px] mt-3" : "text-xs mt-6"}`}>
        Scan the QR code or share the link to follow live.
      </p>
    </div>
  );
}
