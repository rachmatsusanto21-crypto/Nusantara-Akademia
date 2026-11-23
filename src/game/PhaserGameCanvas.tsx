import Phaser from 'phaser';
import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import type {
  ActivePlayerState,
  NilaiProgres,
  ProvinceData,
  QuestItem,
  UserProfile,
} from '../types/game';
import { getWeaponTierForLevel } from '../types/game';
import { soundFx } from '../utils/soundFx';
import { getHeroTextureKey, registerPixelTextureAtlas } from './textureAtlas';

export interface GameBridgeCallbacks {
  getWorldData: () => {
    user: UserProfile;
    provinces: ProvinceData[];
    quests: QuestItem[];
    progress: NilaiProgres[];
    remotePlayers: Record<string, ActivePlayerState>;
    selectedProvince: ProvinceData | null;
  };
  onArriveProvince: (province: ProvinceData) => void;
  onTriggerQuest: (quest: QuestItem, province: ProvinceData) => void;
  onShowToast: (msg: string) => void;
  onSceneChanged: (sceneName: 'WorldMap' | 'ProvinceIso', province?: ProvinceData) => void;
  socket: Socket | null;
}

class BootScene extends Phaser.Scene {
  private failedKeys = new Set<string>();

  constructor() {
    super('BootScene');
  }

  preload() {
    const loadingText = this.add
      .text(400, 225, 'Memuat Peta Nusantara...', {
        fontSize: '16px',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        color: '#FDE68A',
      })
      .setOrigin(0.5);

    this.load.on('loaderror', (file: { key: string }) => {
      this.failedKeys.add(file.key);
    });

    this.load.on('complete', () => {
      loadingText.destroy();
    });

    this.load.image('world_map_bg', '/src/assets/images/world_map_archipelago_1795414478155.jpg');
    this.load.image('iso_province_bg', '/src/assets/images/province_iso_bg_1795414478840.jpg');
  }

  private ensureFallbackBackgrounds() {
    if (this.failedKeys.has('world_map_bg') || !this.textures.exists('world_map_bg')) {
      const c = document.createElement('canvas');
      c.width = 800;
      c.height = 450;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#0E4C92';
      ctx.fillRect(0, 0, 800, 450);
      ctx.fillStyle = '#15803D';
      ctx.fillRect(90, 70, 210, 130);
      ctx.fillRect(490, 70, 210, 130);
      ctx.fillStyle = '#CA8A04';
      ctx.fillRect(495, 260, 210, 130);
      ctx.fillStyle = '#334155';
      ctx.fillRect(100, 255, 210, 130);
      this.textures.addCanvas('world_map_bg', c);
    }

    if (this.failedKeys.has('iso_province_bg') || !this.textures.exists('iso_province_bg')) {
      const c = document.createElement('canvas');
      c.width = 800;
      c.height = 450;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#166534';
      ctx.fillRect(0, 0, 800, 450);
      ctx.fillStyle = '#4ADE80';
      ctx.fillRect(40, 40, 720, 370);
      this.textures.addCanvas('iso_province_bg', c);
    }
  }

  create() {
    this.ensureFallbackBackgrounds();
    registerPixelTextureAtlas(this);
    this.scene.start('WorldMapScene');
  }
}

class WorldMapScene extends Phaser.Scene {
  private airship!: Phaser.GameObjects.Sprite;
  private remoteSprites: Record<string, { sprite: Phaser.GameObjects.Sprite; label: Phaser.GameObjects.Text }> = {};
  private isFlying = false;

  constructor() {
    super('WorldMapScene');
  }

  private getBridge(): GameBridgeCallbacks {
    return this.game.registry.get('bridge') as GameBridgeCallbacks;
  }

  create() {
    const bridge = this.getBridge();
    bridge.onSceneChanged('WorldMap');

    const bg = this.add.image(400, 225, 'world_map_bg');
    bg.setDisplaySize(800, 450);

    const { provinces, progress, user } = bridge.getWorldData();

    // Render province nodes from GAS/Server curriculum
    provinces.forEach((prov) => {
      const passedProv = progress.some(
        (n) =>
          n.ID_Provinsi === prov.ID_Provinsi &&
          (n.Jenis_Nilai === 'Sumatif' || n.Jenis_Nilai === 'Remedial') &&
          n.Status.startsWith('Lulus')
      );

      const glow = this.add.circle(prov.MapX, prov.MapY + 4, 24, passedProv ? 0x10b981 : 0xf59e0b, 0.28);
      this.tweens.add({
        targets: glow,
        scale: { from: 0.9, to: 1.2 },
        alpha: { from: 0.4, to: 0.15 },
        duration: 1200,
        yoyo: true,
        repeat: -1,
      });

      const node = this.add.sprite(prov.MapX, prov.MapY, 'castle_icon').setInteractive({ useHandCursor: true });
      node.setScale(1.1);

      const badgeLabel = passedProv ? `★ ${prov.Nama_Provinsi}` : prov.Nama_Provinsi;
      this.add
        .text(prov.MapX, prov.MapY + 28, badgeLabel, {
          fontSize: '12px',
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontStyle: 'bold',
          color: passedProv ? '#A7F3D0' : '#FEF3C7',
          backgroundColor: 'rgba(11, 17, 32, 0.85)',
          padding: { x: 6, y: 3 },
        })
        .setOrigin(0.5, 0);

      node.on('pointerdown', () => {
        if (this.isFlying) return;
        this.flyAirshipTo(prov);
      });
    });

    // Classic Final Fantasy III Airship with hover bobbing tween
    this.airship = this.add.sprite(400, 225, 'airship_sprite').setDepth(20);
    this.tweens.add({
      targets: this.airship,
      y: '-=7',
      duration: 850,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    bridge.socket?.emit('playerMove', {
      x: 400,
      y: 225,
      scene: 'WorldMap',
      status: 'Memilih Provinsi',
      level: user.Level,
    });
  }

  private flyAirshipTo(prov: ProvinceData) {
    const bridge = this.getBridge();
    const { user } = bridge.getWorldData();
    this.isFlying = true;
    soundFx.playAirshipLaunch();

    this.airship.setFlipX(prov.MapX < this.airship.x);

    this.tweens.add({
      targets: this.airship,
      x: prov.MapX,
      y: prov.MapY - 14,
      duration: 1300,
      ease: 'Cubic.easeInOut',
      onUpdate: () => {
        bridge.socket?.emit('playerMove', {
          x: Math.round(this.airship.x),
          y: Math.round(this.airship.y),
          scene: 'WorldMap',
          status: `Terbang ke ${prov.Nama_Provinsi}`,
          level: user.Level,
        });
      },
      onComplete: () => {
        this.isFlying = false;
        soundFx.playSelect();
        bridge.onArriveProvince(prov);
      },
    });
  }

  update() {
    const bridge = this.getBridge();
    const { remotePlayers, user } = bridge.getWorldData();
    const activeIds = new Set<string>();

    Object.values(remotePlayers).forEach((rp) => {
      if (rp.nisn === user.NISN || rp.scene !== 'WorldMap') return;
      activeIds.add(rp.socketId);
      if (!this.remoteSprites[rp.socketId]) {
        const sprite = this.add.sprite(rp.x, rp.y, 'airship_sprite').setScale(0.65).setAlpha(0.75).setDepth(15);
        const label = this.add
          .text(rp.x, rp.y - 22, rp.nama, {
            fontSize: '10px',
            color: '#E2E8F0',
            backgroundColor: 'rgba(15,23,42,0.75)',
            padding: { x: 4, y: 1 },
          })
          .setOrigin(0.5)
          .setDepth(16);
        this.remoteSprites[rp.socketId] = { sprite, label };
      } else {
        const ref = this.remoteSprites[rp.socketId];
        ref.sprite.x = Phaser.Math.Linear(ref.sprite.x, rp.x, 0.18);
        ref.sprite.y = Phaser.Math.Linear(ref.sprite.y, rp.y, 0.18);
        ref.label.setPosition(ref.sprite.x, ref.sprite.y - 22);
      }
    });

    Object.keys(this.remoteSprites).forEach((sid) => {
      if (!activeIds.has(sid)) {
        this.remoteSprites[sid].sprite.destroy();
        this.remoteSprites[sid].label.destroy();
        delete this.remoteSprites[sid];
      }
    });
  }
}

class ProvinceIsoScene extends Phaser.Scene {
  private province!: ProvinceData;
  private player!: Phaser.GameObjects.Sprite;
  private playerLabel!: Phaser.GameObjects.Text;
  private moveTween: Phaser.Tweens.Tween | null = null;
  private remoteSprites: Record<string, { sprite: Phaser.GameObjects.Sprite; label: Phaser.GameObjects.Text }> = {};

  constructor() {
    super('ProvinceIsoScene');
  }

  init(data: { province: ProvinceData }) {
    this.province = data.province;
  }

  private getBridge(): GameBridgeCallbacks {
    return this.game.registry.get('bridge') as GameBridgeCallbacks;
  }

  create() {
    const bridge = this.getBridge();
    bridge.onSceneChanged('ProvinceIso', this.province);

    const bg = this.add.image(400, 225, 'iso_province_bg');
    bg.setDisplaySize(800, 450);

    const { user, quests, progress } = bridge.getWorldData();
    const provQuests = quests
      .filter((q) => q.ID_Provinsi === this.province.ID_Provinsi)
      .sort((a, b) => a.Urutan_Linear - b.Urutan_Linear);

    const passedIds = new Set(
      progress
        .filter((n) => n.ID_Provinsi === this.province.ID_Provinsi && n.Status.startsWith('Lulus'))
        .map((n) => n.ID_Quest)
    );

    const failedBoss = progress.some(
      (n) =>
        n.ID_Provinsi === this.province.ID_Provinsi &&
        n.Jenis_Nilai === 'Sumatif' &&
        n.Status.includes('Gagal')
    );

    const passedSumatif = progress.some(
      (n) =>
        n.ID_Provinsi === this.province.ID_Provinsi &&
        (n.Jenis_Nilai === 'Sumatif' || n.Jenis_Nilai === 'Remedial') &&
        n.Status.startsWith('Lulus')
    );

    // Draw isometric linear quest connector path
    const mainNodes = provQuests.filter((q) => q.Tipe_Quest === 'Main' || q.Tipe_Quest === 'Boss');
    const graphics = this.add.graphics();
    graphics.lineStyle(3, 0xfbbf24, 0.55);
    for (let i = 0; i < mainNodes.length - 1; i++) {
      graphics.lineBetween(mainNodes[i].MapX, mainNodes[i].MapY, mainNodes[i + 1].MapX, mainNodes[i + 1].MapY);
    }

    // Place Quest Nodes
    provQuests.forEach((q) => {
      // Remedial quest only spawns when student failed Boss and hasn't passed Sumatif/Remedial yet
      if (q.Tipe_Quest === 'Remedial' && (!failedBoss || passedSumatif)) {
        return;
      }

      let unlocked = true;
      if (q.Tipe_Quest === 'Main' && q.Urutan_Linear > 1) {
        const prevMain = mainNodes.find((m) => m.Urutan_Linear === q.Urutan_Linear - 1);
        unlocked = prevMain ? passedIds.has(prevMain.ID_Quest) : true;
      } else if (q.Tipe_Quest === 'Boss') {
        const allMains = mainNodes.filter((m) => m.Tipe_Quest === 'Main');
        unlocked = allMains.every((m) => passedIds.has(m.ID_Quest));
      }

      const isCompleted = passedIds.has(q.ID_Quest);
      const tex =
        q.Tipe_Quest === 'Boss'
          ? 'boss_icon'
          : q.Tipe_Quest === 'Side'
            ? 'quest_side_icon'
            : q.Tipe_Quest === 'Remedial'
              ? 'remedial_icon'
              : 'quest_main_icon';

      const marker = this.add.sprite(q.MapX, q.MapY, tex).setInteractive({ useHandCursor: true }).setDepth(10);
      if (!unlocked) marker.setTint(0x64748b);
      if (isCompleted) marker.setTint(0x86efac);

      const statusText = isCompleted ? '✓ ' : !unlocked ? '🔒 ' : '';
      this.add
        .text(q.MapX, q.MapY + 24, `${statusText}${q.Judul_Quest}`, {
          fontSize: '11px',
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontStyle: 'bold',
          color: isCompleted ? '#86EFAC' : unlocked ? '#F8FAFC' : '#94A3B8',
          backgroundColor: 'rgba(11, 17, 32, 0.85)',
          padding: { x: 5, y: 2 },
        })
        .setOrigin(0.5, 0)
        .setDepth(11);

      marker.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        if (!unlocked) {
          soundFx.playDamage();
          bridge.onShowToast('Selesaikan Quest sebelumnya terlebih dahulu untuk membuka segel ini.');
          return;
        }
        soundFx.playSelect();
        this.movePlayerAndTrigger(q.MapX, q.MapY + 18, () => {
          bridge.onTriggerQuest(q, this.province);
        });
      });
    });

    // Player Hero Sprite with Guild, Gender & Weapon Tier Aura
    const weaponTier = getWeaponTierForLevel(user.Level);
    const heroTex = getHeroTextureKey(user.Guild, user.Gender, weaponTier);
    this.player = this.add.sprite(110, 365, heroTex).setScale(1.35).setDepth(20);
    this.playerLabel = this.add
      .text(110, 336, `${user.Nama} · Lv.${user.Level}`, {
        fontSize: '11px',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontStyle: 'bold',
        color: '#FEF3C7',
        backgroundColor: 'rgba(11, 17, 32, 0.85)',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(21);

    // Click / Tap to Move on Isometric Field
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const clampedX = Phaser.Math.Clamp(pointer.x, 32, 768);
      const clampedY = Phaser.Math.Clamp(pointer.y, 48, 420);
      soundFx.playStep();
      this.movePlayerAndTrigger(clampedX, clampedY, null);
    });

    bridge.socket?.emit('playerMove', {
      x: 110,
      y: 365,
      scene: this.province.ID_Provinsi,
      status: `Menjelajah ${this.province.Nama_Provinsi}`,
      level: user.Level,
    });
  }

  private movePlayerAndTrigger(targetX: number, targetY: number, callback: (() => void) | null) {
    const bridge = this.getBridge();
    const { user } = bridge.getWorldData();

    if (this.moveTween) {
      this.moveTween.stop();
    }

    this.player.setFlipX(targetX < this.player.x);
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, targetX, targetY);
    const duration = Math.max(220, Math.min(900, dist * 2.2));

    this.moveTween = this.tweens.add({
      targets: this.player,
      x: targetX,
      y: targetY,
      duration,
      ease: 'Sine.easeOut',
      onUpdate: () => {
        this.playerLabel.setPosition(this.player.x, this.player.y - 28);
        bridge.socket?.emit('playerMove', {
          x: Math.round(this.player.x),
          y: Math.round(this.player.y),
          scene: this.province.ID_Provinsi,
          status: `Menjelajah ${this.province.Nama_Provinsi}`,
          level: user.Level,
        });
      },
      onComplete: () => {
        if (callback) callback();
      },
    });
  }

  update() {
    const bridge = this.getBridge();
    const { remotePlayers, user } = bridge.getWorldData();
    const activeIds = new Set<string>();

    Object.values(remotePlayers).forEach((rp) => {
      if (rp.nisn === user.NISN || rp.scene !== this.province.ID_Provinsi) return;
      activeIds.add(rp.socketId);
      if (!this.remoteSprites[rp.socketId]) {
        const tex = getHeroTextureKey(rp.guild, rp.gender, rp.weaponTier || getWeaponTierForLevel(rp.level));
        const sprite = this.add.sprite(rp.x, rp.y, tex).setScale(1.2).setAlpha(0.9).setDepth(18);
        const label = this.add
          .text(rp.x, rp.y - 26, `${rp.nama} · Lv.${rp.level}`, {
            fontSize: '10px',
            color: '#BAE6FD',
            backgroundColor: 'rgba(15,23,42,0.75)',
            padding: { x: 4, y: 1 },
          })
          .setOrigin(0.5)
          .setDepth(19);
        this.remoteSprites[rp.socketId] = { sprite, label };
      } else {
        const ref = this.remoteSprites[rp.socketId];
        ref.sprite.setFlipX(rp.x < ref.sprite.x);
        ref.sprite.x = Phaser.Math.Linear(ref.sprite.x, rp.x, 0.22);
        ref.sprite.y = Phaser.Math.Linear(ref.sprite.y, rp.y, 0.22);
        ref.label.setPosition(ref.sprite.x, ref.sprite.y - 26);
      }
    });

    Object.keys(this.remoteSprites).forEach((sid) => {
      if (!activeIds.has(sid)) {
        this.remoteSprites[sid].sprite.destroy();
        this.remoteSprites[sid].label.destroy();
        delete this.remoteSprites[sid];
      }
    });
  }
}

interface PhaserGameCanvasProps {
  bridgeRef: React.MutableRefObject<GameBridgeCallbacks>;
  sceneTrigger: { key: 'WorldMapScene' | 'ProvinceIsoScene'; province?: ProvinceData; nonce: number };
}

export function PhaserGameCanvas({ bridgeRef, sceneTrigger }: PhaserGameCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 450,
      parent: containerRef.current,
      backgroundColor: '#0B1120',
      pixelArt: true,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [BootScene, WorldMapScene, ProvinceIsoScene],
    };

    const game = new Phaser.Game(config);
    game.registry.set('bridge', bridgeRef.current);
    gameRef.current = game;

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, [bridgeRef]);

  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;
    game.registry.set('bridge', bridgeRef.current);
    if (sceneTrigger.nonce === 0) return;

    const active = game.scene.getScenes(true)[0];
    if (active) {
      if (sceneTrigger.key === 'ProvinceIsoScene' && sceneTrigger.province) {
        active.scene.start('ProvinceIsoScene', { province: sceneTrigger.province });
      } else if (sceneTrigger.key === 'WorldMapScene') {
        active.scene.start('WorldMapScene');
      }
    }
  }, [sceneTrigger, bridgeRef]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center bg-[#0B1120]"
      aria-label="Kanvas Dunia Nusantara Akademia"
    />
  );
}
