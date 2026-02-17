export default function BaseLayout({ children }) {
  return (
    <div className="min-h-screen bg-background text-text font-sans">
      <main className="safe-pt pb-safe-10">{children}</main>
    </div>
  );
}