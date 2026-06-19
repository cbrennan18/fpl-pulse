// features/pulse/wrapped/WrappedScreen.jsx
//
// Shared full-bleed surface for every Wrapped screen. Centralises the warm-stock
// paper background and — critically — pins the font stack to Manrope (font-sans)
// so Wrapped NEVER inherits the app's global/Inter body font. Titles opt into
// Bebas via `font-display`; kickers/labels into DM Mono via `font-mono`.

export default function WrappedScreen({ children, className = '' }) {
  return (
    <div
      className={
        'relative w-full min-h-screen overflow-hidden bg-wrapped-paper text-wrapped-ink ' +
        'font-sans antialiased selection:bg-wrapped-green/20 ' +
        className
      }
    >
      {children}
    </div>
  );
}
