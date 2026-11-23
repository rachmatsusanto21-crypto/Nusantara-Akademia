import type { GenderType, GuildType, WeaponTier } from '../types/game';

export function GuildCrestSvg({ guild, className = 'w-6 h-6' }: { guild: GuildType; className?: string }) {
  if (guild === 'Swordsman') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
        <path d="M18.5 3.5L20.5 5.5L10 16L8 14L18.5 3.5Z" fill="#60A5FA" stroke="#E0F2FE" strokeWidth="1.2" />
        <path d="M6.5 13.5L10.5 17.5M5 19L8 16" stroke="#F59E0B" strokeWidth="2" strokeLinecap="square" />
      </svg>
    );
  }
  if (guild === 'Archer') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
        <path d="M6 4C14 4 19 9 19 17" stroke="#34D399" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M6 4L19 17" stroke="#CBD5E1" strokeWidth="1" />
        <path d="M5 19L16 8M16 8H12M16 8V12" stroke="#FBBF24" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (guild === 'Mage') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
        <path d="M12 3L14.5 8.5L20 11L14.5 13.5L12 19L9.5 13.5L4 11L9.5 8.5L12 3Z" fill="#C4B5FD" stroke="#7C3AED" strokeWidth="1.4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path d="M12 4V20" stroke="#D97706" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M6 6C9 6 11 8 12 10C13 8 15 6 18 6V12C15 12 13 11 12 9.5C11 11 9 12 6 12V6Z" fill="#FB923C" stroke="#FFEDD5" strokeWidth="1.2" />
    </svg>
  );
}

export function HeroAvatarPreview({
  guild,
  gender,
  weaponTier,
}: {
  guild: GuildType;
  gender: GenderType;
  weaponTier: WeaponTier;
}) {
  const tierColor: Record<WeaponTier, string> = {
    Bronze: '#CD7F32',
    Silver: '#E2E8F0',
    Gold: '#FACC15',
    Mythic: '#E879F9',
  };

  return (
    <div className="relative w-12 h-12 rounded-md bg-slate-900 border border-amber-500/40 flex items-center justify-center shrink-0">
      <GuildCrestSvg guild={guild} className="w-7 h-7" />
      <span
        className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-sm border border-slate-950"
        style={{ backgroundColor: tierColor[weaponTier] }}
        title={`Senjata ${weaponTier} (${gender})`}
      />
    </div>
  );
}
