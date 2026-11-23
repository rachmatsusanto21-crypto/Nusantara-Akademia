import Phaser from 'phaser';
import type { GenderType, GuildType, WeaponTier } from '../types/game';

const WEAPON_TIER_COLORS: Record<WeaponTier, { primary: string; glow: string }> = {
  Bronze: { primary: '#CD7F32', glow: '#92400E' },
  Silver: { primary: '#E2E8F0', glow: '#94A3B8' },
  Gold: { primary: '#FACC15', glow: '#D97706' },
  Mythic: { primary: '#E879F9', glow: '#7C3AED' },
};

const GUILD_ARMOR: Record<GuildType, { robe: string; accent: string }> = {
  Swordsman: { robe: '#1D4ED8', accent: '#60A5FA' },
  Archer: { robe: '#047857', accent: '#34D399' },
  Mage: { robe: '#5B21B6', accent: '#C4B5FD' },
  Axeman: { robe: '#B45309', accent: '#FDBA74' },
};

export function getHeroTextureKey(guild: GuildType, gender: GenderType, tier: WeaponTier): string {
  return `hero_${guild}_${gender}_${tier}`;
}

function drawPixelRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function createHeroCanvas(guild: GuildType, gender: GenderType, tier: WeaponTier): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;

  const armor = GUILD_ARMOR[guild];
  const weapon = WEAPON_TIER_COLORS[tier];

  // Shadow
  drawPixelRect(ctx, 8, 27, 16, 3, 'rgba(0,0,0,0.45)');

  // Weapon Aura behind character for Gold/Mythic
  if (tier === 'Gold' || tier === 'Mythic') {
    drawPixelRect(ctx, 23, 7, 5, 17, weapon.glow);
  }

  // Legs / Boots (posture differs subtly by gender)
  if (gender === 'Female') {
    drawPixelRect(ctx, 11, 22, 4, 6, '#334155');
    drawPixelRect(ctx, 17, 22, 4, 6, '#334155');
  } else {
    drawPixelRect(ctx, 10, 22, 5, 6, '#1E293B');
    drawPixelRect(ctx, 17, 22, 5, 6, '#1E293B');
  }

  // Torso / Tunic
  drawPixelRect(ctx, 10, 14, 12, 9, armor.robe);
  drawPixelRect(ctx, 12, 15, 8, 6, armor.accent);

  // Face
  drawPixelRect(ctx, 11, 6, 10, 8, '#FDE68A');
  // Eyes
  drawPixelRect(ctx, 13, 9, 2, 2, '#0F172A');
  drawPixelRect(ctx, 17, 9, 2, 2, '#0F172A');

  // Hair & Guild Headgear
  if (gender === 'Female') {
    drawPixelRect(ctx, 9, 6, 2, 10, '#78350F');
    drawPixelRect(ctx, 21, 6, 2, 10, '#78350F');
  }

  if (guild === 'Swordsman') {
    // Knight visor crest
    drawPixelRect(ctx, 10, 4, 12, 4, '#94A3B8');
    drawPixelRect(ctx, 14, 2, 4, 3, '#38BDF8');
    // Sword on right hand
    drawPixelRect(ctx, 23, 8, 3, 12, weapon.primary);
    drawPixelRect(ctx, 21, 18, 7, 2, '#92400E');
  } else if (guild === 'Archer') {
    // Ranger hood + feather
    drawPixelRect(ctx, 9, 4, 14, 4, '#065F46');
    drawPixelRect(ctx, 19, 2, 3, 3, '#FBBF24');
    // Bow
    drawPixelRect(ctx, 23, 7, 2, 15, weapon.primary);
    drawPixelRect(ctx, 25, 9, 2, 11, weapon.glow);
  } else if (guild === 'Mage') {
    // Pointed Arcane Hat
    drawPixelRect(ctx, 8, 5, 16, 3, '#4C1D95');
    drawPixelRect(ctx, 11, 2, 10, 3, '#6D28D9');
    drawPixelRect(ctx, 14, 0, 4, 2, '#A78BFA');
    // Arcane Staff
    drawPixelRect(ctx, 24, 9, 2, 16, '#78350F');
    drawPixelRect(ctx, 22, 5, 6, 5, weapon.primary);
  } else {
    // Axeman horned helm
    drawPixelRect(ctx, 10, 4, 12, 4, '#78350F');
    drawPixelRect(ctx, 8, 2, 3, 4, '#F8FAFC');
    drawPixelRect(ctx, 21, 2, 3, 4, '#F8FAFC');
    // Battleaxe
    drawPixelRect(ctx, 23, 8, 2, 16, '#78350F');
    drawPixelRect(ctx, 22, 7, 7, 6, weapon.primary);
  }

  return canvas;
}

export function registerPixelTextureAtlas(scene: Phaser.Scene) {
  if (scene.textures.exists('airship_sprite')) return;

  const guilds: GuildType[] = ['Swordsman', 'Archer', 'Mage', 'Axeman'];
  const genders: GenderType[] = ['Male', 'Female'];
  const tiers: WeaponTier[] = ['Bronze', 'Silver', 'Gold', 'Mythic'];

  // Combine into fast cached canvas textures (zero draw-call overhead)
  guilds.forEach((g) => {
    genders.forEach((gen) => {
      tiers.forEach((t) => {
        const key = getHeroTextureKey(g, gen, t);
        if (!scene.textures.exists(key)) {
          const c = createHeroCanvas(g, gen, t);
          scene.textures.addCanvas(key, c);
        }
      });
    });
  });

  // Airship Sprite (48x48)
  const airship = document.createElement('canvas');
  airship.width = 48;
  airship.height = 48;
  const actx = airship.getContext('2d')!;
  drawPixelRect(actx, 10, 38, 28, 4, 'rgba(0,0,0,0.35)');
  // Hull
  drawPixelRect(actx, 8, 22, 32, 10, '#78350F');
  drawPixelRect(actx, 12, 24, 24, 6, '#B45309');
  drawPixelRect(actx, 6, 20, 6, 6, '#D97706');
  // Mast & Sail
  drawPixelRect(actx, 22, 6, 3, 18, '#451A03');
  drawPixelRect(actx, 13, 8, 18, 12, '#FEF3C7');
  drawPixelRect(actx, 16, 10, 12, 3, '#F59E0B');
  // Propeller
  drawPixelRect(actx, 40, 22, 4, 8, '#CBD5E1');
  scene.textures.addCanvas('airship_sprite', airship);

  // Province Castle Node (40x40)
  const castle = document.createElement('canvas');
  castle.width = 40;
  castle.height = 40;
  const cctx = castle.getContext('2d')!;
  drawPixelRect(cctx, 6, 32, 28, 5, 'rgba(0,0,0,0.4)');
  drawPixelRect(cctx, 8, 14, 24, 18, '#475569');
  drawPixelRect(cctx, 6, 8, 8, 24, '#64748B');
  drawPixelRect(cctx, 26, 8, 8, 24, '#64748B');
  drawPixelRect(cctx, 6, 4, 8, 4, '#F59E0B');
  drawPixelRect(cctx, 26, 4, 8, 4, '#F59E0B');
  drawPixelRect(cctx, 16, 20, 8, 12, '#1E293B');
  drawPixelRect(cctx, 18, 10, 4, 6, '#38BDF8');
  scene.textures.addCanvas('castle_icon', castle);

  // Main Quest Node (32x32)
  const qMain = document.createElement('canvas');
  qMain.width = 32;
  qMain.height = 32;
  const mctx = qMain.getContext('2d')!;
  drawPixelRect(mctx, 6, 24, 20, 4, 'rgba(0,0,0,0.4)');
  drawPixelRect(mctx, 10, 6, 12, 16, '#0EA5E9');
  drawPixelRect(mctx, 12, 4, 8, 20, '#38BDF8');
  drawPixelRect(mctx, 14, 8, 4, 12, '#E0F2FE');
  scene.textures.addCanvas('quest_main_icon', qMain);

  // Side Quest Node (32x32)
  const qSide = document.createElement('canvas');
  qSide.width = 32;
  qSide.height = 32;
  const sctx = qSide.getContext('2d')!;
  drawPixelRect(sctx, 6, 24, 20, 4, 'rgba(0,0,0,0.4)');
  drawPixelRect(sctx, 10, 10, 12, 14, '#D97706');
  drawPixelRect(sctx, 12, 6, 8, 16, '#FBBF24');
  drawPixelRect(sctx, 14, 10, 4, 8, '#FEF3C7');
  scene.textures.addCanvas('quest_side_icon', qSide);

  // Boss Node (40x40)
  const qBoss = document.createElement('canvas');
  qBoss.width = 40;
  qBoss.height = 40;
  const bctx = qBoss.getContext('2d')!;
  drawPixelRect(bctx, 6, 33, 28, 5, 'rgba(0,0,0,0.5)');
  drawPixelRect(bctx, 8, 8, 24, 24, '#7F1D1D');
  drawPixelRect(bctx, 12, 12, 16, 16, '#DC2626');
  drawPixelRect(bctx, 15, 16, 3, 4, '#FDE047');
  drawPixelRect(bctx, 22, 16, 3, 4, '#FDE047');
  drawPixelRect(bctx, 14, 24, 12, 4, '#FCA5A5');
  scene.textures.addCanvas('boss_icon', qBoss);

  // Remedial Sage NPC (32x32)
  const qRem = document.createElement('canvas');
  qRem.width = 32;
  qRem.height = 32;
  const rctx = qRem.getContext('2d')!;
  drawPixelRect(rctx, 6, 25, 20, 4, 'rgba(0,0,0,0.4)');
  drawPixelRect(rctx, 10, 12, 12, 14, '#059669');
  drawPixelRect(rctx, 11, 5, 10, 7, '#FDE68A');
  drawPixelRect(rctx, 9, 3, 14, 3, '#34D399');
  drawPixelRect(rctx, 13, 10, 6, 5, '#F8FAFC');
  scene.textures.addCanvas('remedial_icon', qRem);
}
