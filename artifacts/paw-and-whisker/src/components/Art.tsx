import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { title?: string };
const base = (title?: string) => (title ? { role: "img", "aria-label": title } : { "aria-hidden": true as const, focusable: false as const });

export function Puppy({ title, ...p }: P) {
  return (
    <svg viewBox="0 0 200 200" {...base(title)} {...p}>
      <ellipse cx="100" cy="182" rx="64" ry="9" fill="#161a38" opacity=".14" />
      <path d="M50 178C44 124 68 98 100 98s56 26 50 80z" fill="#f0b27a" />
      <ellipse cx="100" cy="150" rx="26" ry="28" fill="#ffe9cf" />
      <ellipse cx="60" cy="76" rx="17" ry="32" transform="rotate(18 60 76)" fill="#b8693a" />
      <ellipse cx="140" cy="76" rx="17" ry="32" transform="rotate(-18 140 76)" fill="#b8693a" />
      <ellipse cx="100" cy="78" rx="44" ry="40" fill="#f0b27a" />
      <ellipse cx="100" cy="94" rx="23" ry="17" fill="#ffe9cf" />
      <ellipse cx="100" cy="85" rx="8" ry="5.5" fill="#161a38" />
      <path d="M100 90v7M91 99q9 7 18 0" stroke="#161a38" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="82" cy="70" r="5" fill="#161a38" /><circle cx="118" cy="70" r="5" fill="#161a38" />
      <circle cx="83.6" cy="68.4" r="1.6" fill="#fff" /><circle cx="119.6" cy="68.4" r="1.6" fill="#fff" />
      <ellipse cx="78" cy="180" rx="13" ry="7" fill="#ffe9cf" /><ellipse cx="122" cy="180" rx="13" ry="7" fill="#ffe9cf" />
      <path d="M100 118q-8 16 0 20 8-4 0-20z" fill="#e85d4a" opacity="0" />
    </svg>
  );
}

export function Cat({ title, ...p }: P) {
  return (
    <svg viewBox="0 0 200 200" {...base(title)} {...p}>
      <ellipse cx="100" cy="184" rx="60" ry="8" fill="#161a38" opacity=".14" />
      <path d="M150 176c30 0 38-40 14-52" stroke="#2a2f66" strokeWidth="14" fill="none" strokeLinecap="round" />
      <path d="M54 180C46 130 66 100 100 100s54 30 46 80z" fill="#2a2f66" />
      <path d="M54 68l6-38 30 20zM146 68l-6-38-30 20z" fill="#2a2f66" />
      <path d="M62 62l3-18 14 10zM138 62l-3-18-14 10z" fill="#ffb6a6" />
      <ellipse cx="100" cy="82" rx="46" ry="40" fill="#2a2f66" />
      <ellipse cx="82" cy="78" rx="8" ry="9.5" fill="#ffe7a3" /><ellipse cx="118" cy="78" rx="8" ry="9.5" fill="#ffe7a3" />
      <ellipse cx="82" cy="78" rx="2.6" ry="7" fill="#161a38" /><ellipse cx="118" cy="78" rx="2.6" ry="7" fill="#161a38" />
      <path d="M95 94h10l-5 6z" fill="#ff8c75" />
      <path d="M100 100q-6 7-12 3M100 100q6 7 12 3" stroke="#dcecf6" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M62 92l-22-4M62 98l-22 4M138 92l22-4M138 98l22 4" stroke="#dcecf6" strokeWidth="1.8" strokeLinecap="round" />
      <ellipse cx="82" cy="180" rx="13" ry="7" fill="#3a417f" /><ellipse cx="118" cy="180" rx="13" ry="7" fill="#3a417f" />
    </svg>
  );
}

export function Bowl({ title, ...p }: P) {
  return (
    <svg viewBox="0 0 200 200" {...base(title)} {...p}>
      <ellipse cx="100" cy="176" rx="72" ry="9" fill="#161a38" opacity=".14" />
      <ellipse cx="100" cy="104" rx="70" ry="20" fill="#ffd2c6" />
      <g fill="#b8693a"><circle cx="70" cy="96" r="9" /><circle cx="95" cy="88" r="10" /><circle cx="122" cy="94" r="9" /><circle cx="108" cy="100" r="8" /><circle cx="82" cy="104" r="8" /></g>
      <path d="M30 108c0 44 28 66 70 66s70-22 70-66c-14 14-40 20-70 20s-56-6-70-20z" fill="#e85d4a" />
      <path d="M30 108c14 14 40 20 70 20s56-6 70-20" fill="none" stroke="#c7402a" strokeWidth="3" />
      <g fill="#fff3ee" transform="translate(100 148)"><ellipse cx="0" cy="6" rx="8" ry="6.5" /><circle cx="-11" cy="-4" r="3.4" /><circle cx="-4" cy="-9" r="3.4" /><circle cx="4" cy="-9" r="3.4" /><circle cx="11" cy="-4" r="3.4" /></g>
    </svg>
  );
}

export function Paw({ title, ...p }: P) {
  return (
    <svg viewBox="0 0 64 64" {...base(title)} {...p}>
      <g fill="currentColor"><ellipse cx="32" cy="42" rx="14" ry="11" /><ellipse cx="13" cy="28" rx="6" ry="8" transform="rotate(-20 13 28)" /><ellipse cx="25" cy="16" rx="6" ry="8.5" transform="rotate(-6 25 16)" /><ellipse cx="39" cy="16" rx="6" ry="8.5" transform="rotate(6 39 16)" /><ellipse cx="51" cy="28" rx="6" ry="8" transform="rotate(20 51 28)" /></g>
    </svg>
  );
}

export function Moon({ title, ...p }: P) {
  return (
    <svg viewBox="0 0 120 120" {...base(title)} {...p}>
      <defs><radialGradient id="pwMoonG" cx=".35" cy=".3" r=".9"><stop offset="0" stopColor="#fffbe8" /><stop offset="1" stopColor="#ffe08a" /></radialGradient></defs>
      <path d="M78 12A50 50 0 1 0 108 82 40 40 0 0 1 78 12z" fill="url(#pwMoonG)" />
      <circle cx="40" cy="70" r="6" fill="#f2c96a" opacity=".55" /><circle cx="56" cy="92" r="4" fill="#f2c96a" opacity=".55" /><circle cx="34" cy="48" r="3.2" fill="#f2c96a" opacity=".55" />
    </svg>
  );
}

/** Brand mark: a moon with a paw print */
export function Mark(p: P) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false" {...p}>
      <circle cx="20" cy="20" r="20" fill="#161a38" />
      <path d="M26 6a15 15 0 1 0 8 19A12 12 0 0 1 26 6z" fill="#ffe08a" />
      <g fill="#ff8c75" transform="translate(21 22) scale(.2)"><ellipse cx="0" cy="12" rx="14" ry="11" /><ellipse cx="-19" cy="-2" rx="6" ry="8" /><ellipse cx="-7" cy="-14" rx="6" ry="8.5" /><ellipse cx="7" cy="-14" rx="6" ry="8.5" /><ellipse cx="19" cy="-2" rx="6" ry="8" /></g>
    </svg>
  );
}

const STARS: [number, number, number, number][] = [[6, 10, 2.2, 0], [14, 28, 1.6, 1.2], [22, 7, 1.8, .6], [31, 20, 2.4, 2], [42, 9, 1.6, .3], [55, 24, 2, 1.7], [63, 6, 1.5, .9], [71, 18, 2.4, 2.4], [80, 8, 1.8, .2], [88, 26, 1.6, 1.4], [94, 12, 2.2, 1.9], [48, 34, 1.4, .7], [9, 44, 1.5, 2.1], [91, 42, 1.4, 1.1]];
export function Stars() {
  return (
    <div className="pw-stars" aria-hidden="true">
      {STARS.map(([x, y, s, d], i) => (
        <i key={i} style={{ left: `${x}%`, top: `${y}%`, width: s * 2, height: s * 2, animationDelay: `${d}s` }} />
      ))}
    </div>
  );
}

/** A doorframe with pencil height marks, used for the first-30-days timeline */
export function Doorframe({ title, ...p }: P) {
  return (
    <svg viewBox="0 0 160 220" {...base(title)} {...p}>
      <path d="M30 214V30h100v184" fill="#fff0e6" stroke="none" />
      <path d="M30 214V30h100v184" fill="none" stroke="#b8693a" strokeWidth="12" strokeLinejoin="round" />
      <path d="M20 22h120" stroke="#b8693a" strokeWidth="10" strokeLinecap="round" />
      <path d="M36 214L36 40 124 40 124 214" fill="#ffe7a3" opacity=".5" />
      <g stroke="#161a38" strokeWidth="2.2" strokeLinecap="round">
        <path d="M30 190h18M30 160h12M30 130h20M30 98h12M30 66h20" />
      </g>
      <g fontFamily="Figtree, sans-serif" fontSize="9" fontWeight="700" fill="#161a38">
        <text x="54" y="193">day 1</text><text x="48" y="163">week 1</text><text x="56" y="133">week 2</text><text x="48" y="101">week 3</text><text x="56" y="69">day 30</text>
      </g>
      <g fill="#e85d4a" transform="translate(104 192) scale(.28)"><ellipse cx="32" cy="42" rx="14" ry="11" /><ellipse cx="13" cy="28" rx="6" ry="8" /><ellipse cx="25" cy="16" rx="6" ry="8.5" /><ellipse cx="39" cy="16" rx="6" ry="8.5" /><ellipse cx="51" cy="28" rx="6" ry="8" /></g>
    </svg>
  );
}

export function NightScene({ title, ...p }: P) {
  return (
    <svg viewBox="0 0 240 200" {...base(title)} {...p}>
      <rect width="240" height="200" rx="28" fill="#1f2459" />
      <g fill="#ffe7a3"><circle cx="30" cy="30" r="2" /><circle cx="76" cy="18" r="1.6" /><circle cx="200" cy="40" r="2" /><circle cx="170" cy="20" r="1.5" /><circle cx="40" cy="80" r="1.5" /></g>
      <path d="M170 28a30 30 0 1 0 22 46 24 24 0 0 1-22-46z" fill="#ffe08a" />
      <path d="M0 150c40-20 80-10 120-4s80 6 120-14v68H0z" fill="#ffb59c" opacity=".35" />
      <g transform="translate(60 56) scale(.8)"><Cat /></g>
    </svg>
  );
}

/** Illustrated placeholder for a real photo we do not yet have. Never presented as a genuine photograph. */
export function PhotoSlot({ slot, caption, kind = "puppy" }: { slot: string; caption: string; kind?: "puppy" | "cat" }) {
  return (
    <figure className="pw-slot" data-photo-slot={slot}>
      <div className="pw-slot-frame">
        {kind === "puppy" ? <Puppy className="pw-slot-art" /> : <Cat className="pw-slot-art" />}
        <span className="pw-slot-badge">Future photo slot: {slot}</span>
      </div>
      <figcaption>{caption} This is an illustration standing in until a real photo is added.</figcaption>
    </figure>
  );
}
