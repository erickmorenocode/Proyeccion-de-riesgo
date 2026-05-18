export default function BrandHeader() {
  return (
    <div
      className="px-6 py-3 flex items-center gap-3 border-b"
      style={{ backgroundColor: '#0d1b2a', borderColor: '#1a2f45' }}
    >
      <img
        src="/logo_synergy.png"
        alt="Synergy Apex Partners"
        className="h-9 w-auto"
      />
      <span className="text-white font-semibold text-sm tracking-wide">
        Synergy Apex Partners
      </span>
    </div>
  );
}
