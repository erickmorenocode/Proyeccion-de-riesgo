import Image from 'next/image';

export default function BrandHeader() {
  return (
    <div className="bg-gray-950 border-b border-gray-800 px-6 py-3 flex items-center gap-3">
      <Image
        src="/logo_synergy.png"
        alt="Synergy Apex Partners"
        width={36}
        height={36}
        className="rounded"
        priority
      />
      <span className="text-white font-semibold text-sm tracking-wide">
        Synergy Apex Partners
      </span>
    </div>
  );
}
