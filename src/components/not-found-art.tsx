/** The 404 mascot: a ticket card that lost its page. Pure SVG so it needs no assets and scales with the layout. */
export function NotFoundArt({ bubble, tag, className }: { bubble: string; tag: string; className?: string }) {
  const ink = "#15161a";
  const lines = bubble.length > 14 ? [bubble.slice(0, bubble.lastIndexOf(" ", 14)), bubble.slice(bubble.lastIndexOf(" ", 14) + 1)] : [bubble];
  return (
    <svg viewBox="0 0 460 460" role="img" aria-label={tag} className={className} fontFamily="var(--font-sans)">
      <circle cx="230" cy="230" r="205" fill="#EAF1FF" />
      <circle cx="230" cy="230" r="150" fill="#DCE8FF" opacity="0.6" />
      <ellipse cx="230" cy="421" rx="115" ry="13" fill={ink} opacity="0.1" />
      {/* legs and shoes */}
      <rect x="185" y="368" width="14" height="46" rx="7" fill={ink} />
      <rect x="261" y="372" width="14" height="46" rx="7" fill={ink} />
      <ellipse cx="191" cy="416" rx="19" ry="8" fill={ink} />
      <ellipse cx="267" cy="420" rx="19" ry="8" fill={ink} />
      {/* ticket character */}
      <g transform="rotate(-7 230 250)">
        <defs>
          <clipPath id="nf-card"><rect x="120" y="110" width="220" height="280" rx="22" /></clipPath>
        </defs>
        <rect x="120" y="110" width="220" height="280" rx="22" fill="#fff" stroke={ink} strokeWidth="3.5" />
        <g clipPath="url(#nf-card)">
          <rect x="120" y="110" width="220" height="50" fill={ink} />
        </g>
        <text x="138" y="143" fontFamily="var(--font-mono)" fontSize="18" fontWeight="500" fill="#fff">VEN-404</text>
        <g stroke="#E5484D" strokeWidth="3.6" strokeLinecap="round">
          <path d="M170 192 L198 220 M198 192 L170 220" />
          <path d="M260 192 L288 220 M288 192 L260 220" />
        </g>
        <ellipse cx="155" cy="248" rx="13" ry="7" fill="#FFC2CF" />
        <ellipse cx="305" cy="248" rx="13" ry="7" fill="#FFC2CF" />
        <rect x="198" y="260" width="64" height="7" rx="3.5" fill={ink} transform="rotate(-6 230 263)" />
        <rect x="178" y="294" width="104" height="28" rx="14" fill="#FDECEC" />
        <circle cx="196" cy="308" r="4" fill="#E5484D" />
        <text x="208" y="313" fontSize="14" fontWeight="600" fill="#B42318">{tag}</text>
        <rect x="155" y="346" width="150" height="9" rx="4.5" fill="#E4E6EB" />
        <rect x="155" y="364" width="100" height="9" rx="4.5" fill="#E4E6EB" />
      </g>
      {/* band-aid */}
      <g transform="translate(284 352) rotate(-35)">
        <rect width="84" height="26" rx="13" fill="#F3D3A4" stroke="#D9B27C" strokeWidth="2" />
        <rect x="30" y="3" width="24" height="20" rx="3" fill="#E8BF86" />
      </g>
      {/* speech bubble */}
      <rect x="250" y="34" width="204" height="62" rx="18" fill={ink} />
      <rect x="276" y="88" width="16" height="16" rx="3" fill={ink} transform="rotate(45 284 96)" />
      <text fontSize="15" fontWeight="600" fill="#fff">
        {lines.map((l, i) => (<tspan key={i} x="266" y={58 + i * 20}>{i === 0 ? "“" + l : l + "”"}</tspan>))}
      </text>
      {/* floating bits */}
      <text x="36" y="196" fontFamily="var(--font-mono)" fontSize="44" fontWeight="500" fill="#8B5CF6" transform="rotate(-12 36 196)">{"{ }"}</text>
      <text x="376" y="272" fontSize="64" fontWeight="700" fill="#8B5CF6" transform="rotate(12 376 272)">?</text>
      <text x="58" y="336" fontSize="40" fontWeight="700" fill="#F59E0B" transform="rotate(-10 58 336)">?</text>
      <rect x="342" y="330" width="86" height="36" rx="10" fill="#fff" stroke="#E4E6EB" strokeWidth="1.5" />
      <text x="362" y="355" fontFamily="var(--font-mono)" fontSize="18" fontWeight="500" fill="#E5484D">404</text>
      <g transform="translate(64 66) scale(1.25)" fill="none" stroke="#E5484D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m8 2 1.88 1.88M14.12 3.88 16 2M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
        <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6M12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M3 21c0-2.1 1.7-3.9 3.8-4M20.97 5c0 2.1-1.6 3.8-3.5 4M22 13h-4M17.2 17c2.1.1 3.8 1.9 3.8 4" />
      </g>
      <g transform="translate(396 150) scale(1.1)" fill="none" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      </g>
    </svg>
  );
}
