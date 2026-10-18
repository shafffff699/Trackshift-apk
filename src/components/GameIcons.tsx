import React from 'react';

export function TrackshiftTitleSvg({ className = 'w-full max-w-md' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 540 132"
      className={className}
      role="img"
      aria-label="TRACKSHIFT: NEON RUN"
    >
      <defs>
        <linearGradient id="ts-rail-cyan" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="65%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="ts-rail-amber" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>

      {/* Outer Angled Metro Plaque Silhouette */}
      <polygon
        points="16,10 526,10 508,118 4,118"
        fill="#070b17"
        stroke="#06b6d4"
        strokeWidth="2.5"
      />
      <polygon
        points="24,18 514,18 500,110 14,110"
        fill="#0b1326"
        stroke="#1e293b"
        strokeWidth="1.5"
      />

      {/* Top & Bottom Speed Rail Accents */}
      <rect x="32" y="18" width="180" height="5" fill="url(#ts-rail-cyan)" />
      <rect x="290" y="105" width="205" height="5" fill="url(#ts-rail-amber)" />

      {/* Emblem Icon Left: Stylized Twin Tracks + Bolt */}
      <g transform="translate(34, 34)">
        <polygon points="10,56 26,4 36,4 20,56" fill="#06b6d4" />
        <polygon points="32,56 48,4 58,4 42,56" fill="#f97316" />
        <rect x="6" y="16" width="54" height="5" fill="#e2e8f0" />
        <rect x="2" y="36" width="54" height="5" fill="#e2e8f0" />
      </g>

      {/* Primary Lockup Lettering */}
      <text
        x="106"
        y="68"
        textLength="368"
        lengthAdjust="spacingAndGlyphs"
        fill="#f8fafc"
        fontFamily="'Chakra Petch', sans-serif"
        fontWeight="700"
        fontStyle="italic"
        fontSize="44"
        letterSpacing="1.5"
      >
        TRACKSHIFT
      </text>

      {/* Subtitle Lockup */}
      <text
        x="108"
        y="96"
        fill="#22d3ee"
        fontFamily="'Chakra Petch', sans-serif"
        fontWeight="700"
        fontSize="16"
        letterSpacing="4"
      >
        NEON RUN
      </text>

      {/* Tagline Accent Right */}
      <text
        x="246"
        y="95"
        textLength="238"
        lengthAdjust="spacingAndGlyphs"
        fill="#fbbf24"
        fontFamily="'JetBrains Mono', monospace"
        fontWeight="700"
        fontSize="10.5"
        letterSpacing="0.8"
      >
        RUN THE RAILS · BEAT THE CITY
      </text>
    </svg>
  );
}

export function CoinSvgIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#78350f" stroke="#05070f" strokeWidth="2" />
      <circle cx="12" cy="12" r="8" fill="#fbbf24" />
      <polygon points="12,6 16,12 12,18 8,12" fill="#fef08a" />
    </svg>
  );
}

export function TokenSvgIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <polygon
        points="12,2 21,9 18,20 6,20 3,9"
        fill="#701a75"
        stroke="#05070f"
        strokeWidth="2"
      />
      <polygon points="12,4 19,10 16,18 8,18 5,10" fill="#e879f9" />
      <circle cx="12" cy="12" r="3" fill="#ffffff" />
    </svg>
  );
}

export function VortexSvgIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M6 4v7a6 6 0 0 0 12 0V4h-3v7a3 3 0 0 1-6 0V4H6z"
        fill="#f43f5e"
        stroke="#05070f"
        strokeWidth="1.5"
      />
      <rect x="6" y="3" width="3" height="3" fill="#38bdf8" />
      <rect x="15" y="3" width="3" height="3" fill="#38bdf8" />
    </svg>
  );
}

export function BootsSvgIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M8 4h6l-1 8h6l-2 7H5l2-9h1V4z"
        fill="#f59e0b"
        stroke="#05070f"
        strokeWidth="1.5"
      />
      <path d="M5 20h12" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function GliderSvgIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <polygon
        points="12,3 22,16 15,15 12,20 9,15 2,16"
        fill="#06b6d4"
        stroke="#05070f"
        strokeWidth="1.5"
      />
      <polygon points="12,6 16,13 12,11 8,13" fill="#cffafe" />
    </svg>
  );
}

export function AegisSvgIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 2L4 6v6c0 5.5 3.4 9.8 8 11 4.6-1.2 8-5.5 8-11V6l-8-4z"
        fill="#10b981"
        stroke="#05070f"
        strokeWidth="1.5"
      />
      <path d="M12 5l5 2.5v4.5c0 3.6-2.1 6.6-5 7.6V5z" fill="#6ee7b7" />
    </svg>
  );
}

export function SoundOnSvgIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#38bdf8" />
      <path
        d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"
        stroke="#f8fafc"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SoundOffSvgIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#64748b" />
      <path
        d="M22 9l-6 6M16 9l6 6"
        stroke="#f43f5e"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PauseSvgIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="6" y="4" width="4.5" height="16" rx="1" fill="#f8fafc" />
      <rect x="13.5" y="4" width="4.5" height="16" rx="1" fill="#f8fafc" />
    </svg>
  );
}
