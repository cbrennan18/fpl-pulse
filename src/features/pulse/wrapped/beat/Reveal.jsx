// features/pulse/wrapped/beat/Reveal.jsx
//
// Presentation-only reveal primitive for tap-to-reveal slots (Chips, Maverick).
// Renders its children ALWAYS, so the slot is sized for its revealed state from
// first paint — the surrounding layout never reflows when the value appears.
// Until `show`, the content is fully invisible (opacity-0) and non-interactive
// (pointer-events-none + aria-hidden), so a tap can never land on the hidden
// slot instead of the card. On reveal it fades + rises into place.
//
// This is PRESENTATION only — the tap/guard behaviour lives in each beat. The
// nemesis climax (RaceBeat) deliberately does NOT use this; it gets a weightier
// framer-motion entrance of its own.

export default function Reveal({ show, className = '', children }) {
  return (
    <div
      aria-hidden={!show}
      className={`transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'
      } ${className}`}
    >
      {children}
    </div>
  );
}
