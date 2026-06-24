export default function AmbientOrbs() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <div
        className="orb w-[600px] h-[600px] -top-32 -left-32 opacity-30"
        style={{ background: "radial-gradient(circle, #4A2D8A 0%, transparent 70%)" }}
      />
      <div
        className="orb w-[500px] h-[500px] top-1/2 -right-40 opacity-20"
        style={{ background: "radial-gradient(circle, #6B5BA6 0%, transparent 70%)" }}
      />
      <div
        className="orb w-[400px] h-[400px] -bottom-20 left-1/3 opacity-15"
        style={{ background: "radial-gradient(circle, #D4AF5F 0%, transparent 70%)" }}
      />
    </div>
  );
}
