import {
  Award,
  BookOpen,
  Compass,
  FileText,
  Pause,
  Shield,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { AdminDashboard } from './components/AdminDashboard';
import { BattleModal } from './components/BattleModal';
import { DiplomaModal } from './components/DiplomaModal';
import { GuildCrestSvg, HeroAvatarPreview } from './components/GuildCrestSvg';
import { RaporModal } from './components/RaporModal';
import { type GameBridgeCallbacks, PhaserGameCanvas } from './game/PhaserGameCanvas';
import type {
  ActivePlayerState,
  GenderType,
  GuildType,
  NilaiProgres,
  NilaiType,
  PartyMember,
  ProvinceData,
  QuestItem,
  UserProfile,
} from './types/game';
import { getWeaponTierForLevel, GUILD_PERKS } from './types/game';
import { soundFx } from './utils/soundFx';

type AppScreen = 'TITLE' | 'AUTH_STUDENT' | 'AUTH_ADMIN' | 'PLAYING' | 'ADMIN_PANEL';

const GUILD_LIST: GuildType[] = ['Swordsman', 'Archer', 'Mage', 'Axeman'];

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('TITLE');
  const [muted, setMuted] = useState(false);

  // World data from server / GAS
  const [provinces, setProvinces] = useState<ProvinceData[]>([]);
  const [quests, setQuests] = useState<QuestItem[]>([]);

  // In-memory Bearer tokens (never persisted to localStorage)
  const [studentToken, setStudentToken] = useState<string>('');
  const [adminToken, setAdminToken] = useState<string>('');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [progress, setProgress] = useState<NilaiProgres[]>([]);

  // Student auth form state
  const [nisn, setNisn] = useState('');
  const [nama, setNama] = useState('');
  const [password, setPassword] = useState('');
  const [guild, setGuild] = useState<GuildType>('Swordsman');
  const [gender, setGender] = useState<GenderType>('Male');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Admin auth / first-run claim state
  const [adminConfigured, setAdminConfigured] = useState<boolean | null>(null);
  const [adminPasscode, setAdminPasscode] = useState('');
  const [adminError, setAdminError] = useState('');

  // Active Game State
  const [currentScene, setCurrentScene] = useState<'WorldMap' | 'ProvinceIso'>('WorldMap');
  const [activeProvince, setActiveProvince] = useState<ProvinceData | null>(null);
  const [prologProvince, setPrologProvince] = useState<ProvinceData | null>(null);
  const [activeBattle, setActiveBattle] = useState<{ quest: QuestItem; province: ProvinceData } | null>(null);
  const [sceneTrigger, setSceneTrigger] = useState<{
    key: 'WorldMapScene' | 'ProvinceIsoScene';
    province?: ProvinceData;
    nonce: number;
  }>({ key: 'WorldMapScene', nonce: 0 });
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modals in Playing HUD
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [showRaporModal, setShowRaporModal] = useState(false);
  const [showDiplomaModal, setShowDiplomaModal] = useState(false);

  // Multiplayer & Party Socket.io
  const socketRef = useRef<Socket | null>(null);
  const [remotePlayers, setRemotePlayers] = useState<Record<string, ActivePlayerState>>({});
  const [partyInput, setPartyInput] = useState('TIM-1');
  const [partyId, setPartyId] = useState<string | null>(null);
  const [partyMembers, setPartyMembers] = useState<PartyMember[]>([]);

  const fetchWorldData = useCallback(async () => {
    try {
      const resp = await fetch('/api/world');
      if (!resp.ok) return;
      const data = await resp.json();
      setProvinces(data.provinsi || []);
      setQuests(data.quests || []);
    } catch {
      // Ignore transient load error
    }
  }, []);

  useEffect(() => {
    fetchWorldData();
  }, [fetchWorldData]);

  // Connect Socket.io once (polling first ensures Cloudflare Tunnel / Ngrok handshake succeeds before WS upgrade)
  useEffect(() => {
    const socket = io({ transports: ['polling', 'websocket'], upgrade: true });
    socketRef.current = socket;

    socket.on('updateAllPlayers', (playersMap: Record<string, ActivePlayerState>) => {
      setRemotePlayers(playersMap || {});
    });

    socket.on('playerMoved', (moved: ActivePlayerState) => {
      setRemotePlayers((prev) => ({
        ...prev,
        [moved.socketId]: moved,
      }));
    });

    socket.on('playerDisconnected', (sid: string) => {
      setRemotePlayers((prev) => {
        const next = { ...prev };
        delete next[sid];
        return next;
      });
    });

    socket.on('partyUpdated', (data: { partyId: string; members: PartyMember[] }) => {
      setPartyId(data.partyId);
      setPartyMembers(data.members || []);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Keyboard shortcuts: Enter/Space on Title Screen, Esc to Pause while Playing
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (screen === 'TITLE' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        soundFx.playSelect();
        setScreen('AUTH_STUDENT');
      } else if (screen === 'PLAYING' && e.key === 'Escape') {
        if (activeBattle) return;
        setShowPauseModal((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, activeBattle]);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3400);
  }, []);

  // Bridge for Phaser Scenes (avoids restarting Phaser loop on React state changes)
  const worldStateRef = useRef({
    user,
    provinces,
    quests,
    progress,
    remotePlayers,
    activeProvince,
  });
  worldStateRef.current = {
    user,
    provinces,
    quests,
    progress,
    remotePlayers,
    activeProvince,
  };

  const bridgeRef = useRef<GameBridgeCallbacks>({
    getWorldData: () => ({
      user: worldStateRef.current.user!,
      provinces: worldStateRef.current.provinces,
      quests: worldStateRef.current.quests,
      progress: worldStateRef.current.progress,
      remotePlayers: worldStateRef.current.remotePlayers,
      selectedProvince: worldStateRef.current.activeProvince,
    }),
    onArriveProvince: (prov) => {
      setPrologProvince(prov);
    },
    onTriggerQuest: (quest, prov) => {
      setActiveBattle({ quest, province: prov });
    },
    onShowToast: showToast,
    onSceneChanged: (sceneName, prov) => {
      setCurrentScene(sceneName);
      setActiveProvince(prov || null);
    },
    socket: socketRef.current,
  });

  bridgeRef.current.socket = socketRef.current;

  const toggleMute = () => {
    const next = !muted;
    soundFx.muted = next;
    setMuted(next);
  };

  const handleOpenAdminAuth = async () => {
    soundFx.playSelect();
    setAdminError('');
    setAdminPasscode('');
    setScreen('AUTH_ADMIN');
    try {
      const resp = await fetch('/api/auth/admin-status');
      const data = await resp.json();
      setAdminConfigured(Boolean(data.configured));
    } catch {
      setAdminConfigured(true);
    }
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      if (provinces.length === 0) {
        await fetchWorldData();
      }
      const resp = await fetch('/api/auth/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nisn: nisn.trim(),
          nama: nama.trim() || `Petualang ${nisn.trim()}`,
          password,
          guild,
          gender,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setAuthError(data.error || 'Gagal masuk ke dunia game.');
        setAuthLoading(false);
        return;
      }

      soundFx.playVictory();
      setStudentToken(data.token);
      setUser(data.user);
      setProgress(data.progress || []);
      setScreen('PLAYING');

      socketRef.current?.emit('playerJoin', {
        nisn: data.user.NISN,
        nama: data.user.Nama,
        guild: data.user.Guild,
        gender: data.user.Gender,
        level: data.user.Level,
      });
    } catch {
      setAuthError('Tidak dapat terhubung ke server sekolah. Pastikan server Node.js berjalan.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    const endpoint = adminConfigured ? '/api/auth/admin-login' : '/api/auth/admin-claim';
    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: adminPasscode }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setAdminError(data.error || 'Autentikasi Guru gagal.');
        return;
      }
      soundFx.playSelect();
      setAdminToken(data.token);
      setScreen('ADMIN_PANEL');
    } catch {
      setAdminError('Gagal menghubungi server.');
    }
  };

  const handleEnterProvince = () => {
    if (!prologProvince) return;
    const prov = prologProvince;
    setPrologProvince(null);
    soundFx.playSelect();
    setSceneTrigger((prev) => ({
      key: 'ProvinceIsoScene',
      province: prov,
      nonce: prev.nonce + 1,
    }));
  };

  const handleReturnToWorldMap = () => {
    soundFx.playAirshipLaunch();
    setSceneTrigger((prev) => ({
      key: 'WorldMapScene',
      nonce: prev.nonce + 1,
    }));
  };

  const handleSubmitBattleResult = async (payload: {
    id_provinsi: string;
    id_quest: string;
    jenis_nilai: NilaiType;
    skor: number;
  }) => {
    const resp = await fetch('/api/gas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        action: 'submitScore',
        ...payload,
      }),
    });
    const data = await resp.json();
    if (data.user) setUser(data.user);
    if (data.progress) setProgress(data.progress);

    // Refresh province map nodes so newly unlocked Quest / Remedial Sage appears immediately
    if (activeProvince) {
      setSceneTrigger((prev) => ({
        key: 'ProvinceIsoScene',
        province: activeProvince,
        nonce: prev.nonce + 1,
      }));
    }

    return {
      finalScore: data.finalScore,
      questStatus: data.questStatus,
      kkm: data.kkm,
    };
  };

  const handleJoinParty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !partyInput.trim()) return;
    const cleanCode = partyInput.trim().toUpperCase();
    soundFx.playSelect();
    socketRef.current?.emit('joinParty', {
      partyId: cleanCode,
      nisn: user.NISN,
      nama: user.Nama,
      guild: user.Guild,
      level: user.Level,
    });
  };

  const handleLeaveParty = () => {
    if (!partyId) return;
    socketRef.current?.emit('leaveParty', { partyId });
    setPartyId(null);
    setPartyMembers([]);
  };

  // --- SCREEN 1: TITLE SCREEN ---
  if (screen === 'TITLE') {
    return (
      <div className="relative min-h-screen w-full overflow-hidden flex flex-col justify-between bg-[#0B1120]">
        <img
          src="/src/assets/images/title_key_art_1795414477873.jpg"
          alt="Kepulauan Terapung Nusantara Akademia"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B1120]/85 via-[#0B1120]/25 to-[#0B1120]/95" />

        {/* Upper Calm Sky Lockup */}
        <div className="relative z-10 pt-10 sm:pt-14 px-6 flex flex-col items-center text-center">
          <svg
            viewBox="0 0 64 64"
            className="w-14 h-14 mb-3 drop-shadow-lg animate-float-slow"
            fill="none"
            aria-hidden="true"
          >
            <polygon
              points="32,4 48,24 32,60 16,24"
              fill="#38BDF8"
              stroke="#FEF3C7"
              strokeWidth="2.5"
            />
            <polygon points="32,4 48,24 32,30" fill="#BAE6FD" opacity="0.7" />
            <circle cx="32" cy="26" r="5" fill="#F59E0B" />
          </svg>

          <h1
            className="font-display font-bold text-amber-200 tracking-wide drop-shadow-md max-w-2xl"
            style={{ fontSize: 'clamp(2.25rem, 5vw, 3.75rem)', textWrap: 'balance' }}
          >
            Nusantara Akademia
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-200 max-w-xl">
            MMORPG Edukasi 2.5D Isometric Pixel Art · Taklukkan Provinsi Kurikulum bersama Guild dan Party Kelasmu
          </p>
        </div>

        {/* Bottom Primary CTA & Single Control Hint */}
        <div className="relative z-10 pb-10 px-6 flex flex-col items-center gap-4">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                soundFx.playSelect();
                setScreen('AUTH_STUDENT');
              }}
              className="px-8 py-3.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-base shadow-lg transition-transform active:scale-95 cursor-pointer"
            >
              Masuk Dunia
            </button>
            <button
              onClick={handleOpenAdminAuth}
              className="px-5 py-3.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-600 text-slate-100 font-semibold text-sm transition-colors cursor-pointer"
            >
              Panel Guru
            </button>
          </div>
          <p className="text-xs text-slate-300/90 tracking-wide">
            Klik Peta untuk Terbang · Sentuh Node untuk Quest · Esc Jeda
          </p>
        </div>
      </div>
    );
  }

  // --- SCREEN 2: STUDENT AUTH & CHARACTER CREATOR ---
  if (screen === 'AUTH_STUDENT') {
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-4">
        <div className="rpg-panel w-full max-w-2xl rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-amber-300">
                Masuk atau Buat Karakter Siswa
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Masukkan NISN untuk melanjutkan petualangan atau pilih Guild baru untuk petualang pemula.
              </p>
            </div>
            <button
              onClick={() => setScreen('TITLE')}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              aria-label="Kembali"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleStudentSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">NISN</label>
                <input
                  type="text"
                  required
                  minLength={3}
                  value={nisn}
                  onChange={(e) => setNisn(e.target.value)}
                  placeholder="Contoh: 102938"
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white font-mono-tabular focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Isi untuk karakter baru"
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Kata Sandi</label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 4 karakter"
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Gender Selector */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-300">Postur Karakter:</span>
              <div className="flex gap-2">
                {(['Male', 'Female'] as GenderType[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                      gender === g
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {g === 'Male' ? 'Male (Ksatria)' : 'Female (Srikandi)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Guild Selector */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-300">Pilih Guild & Skill Pasif:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {GUILD_LIST.map((g) => {
                  const info = GUILD_PERKS[g];
                  const selected = guild === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        soundFx.playSelect();
                        setGuild(g);
                      }}
                      className={`text-left p-3.5 rounded-lg border transition-all flex items-start gap-3 cursor-pointer ${
                        selected
                          ? 'bg-slate-800/90 border-amber-400'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <GuildCrestSvg guild={g} className="w-7 h-7 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white">
                          {g} · <span className="text-amber-300 font-medium">{info.skillName}</span>
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5 leading-snug">{info.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {authError && <p className="text-sm text-rose-400">{authError}</p>}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setScreen('TITLE')}
                className="px-4 py-2.5 rounded-lg border border-slate-700 text-sm text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={authLoading}
                className="px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer disabled:opacity-60"
              >
                {authLoading ? 'Memuat Dunia...' : 'Mulai Petualangan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // --- SCREEN 3: GURU ADMIN AUTH / FIRST-RUN CLAIM ---
  if (screen === 'AUTH_ADMIN') {
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-4">
        <div className="rpg-panel w-full max-w-md rounded-xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-xl font-bold text-amber-300">
                {adminConfigured === false
                  ? 'Aktifkan Kata Sandi Guru Pertama Kali'
                  : 'Masuk Panel Guru'}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                {adminConfigured === false
                  ? 'Server belum memiliki sandi Guru. Buat kata sandi minimal 6 karakter untuk mengunci Panel Admin.'
                  : 'Masukkan kata sandi Guru untuk mengakses Live Radar Map, CRUD Nilai, dan Kurikulum.'}
              </p>
            </div>
            <button
              onClick={() => setScreen('TITLE')}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleAdminSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Kata Sandi Guru</label>
              <input
                type="password"
                required
                minLength={adminConfigured === false ? 6 : 1}
                value={adminPasscode}
                onChange={(e) => setAdminPasscode(e.target.value)}
                placeholder={adminConfigured === false ? 'Minimal 6 karakter' : 'Masukkan kata sandi'}
                className="w-full px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            {adminError && <p className="text-xs text-rose-400">{adminError}</p>}

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
            >
              {adminConfigured === false ? 'Simpan & Buka Panel Guru' : 'Masuk Panel Guru'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- SCREEN 4: ADMIN DASHBOARD ---
  if (screen === 'ADMIN_PANEL') {
    return (
      <AdminDashboard
        adminToken={adminToken}
        socket={socketRef.current}
        onExit={() => setScreen('TITLE')}
        onWorldUpdated={fetchWorldData}
      />
    );
  }

  // --- SCREEN 5: ACTIVE GAMEPLAY (PHASER 3 + LOW-OCCLUSION HUD) ---
  if (!user) return null;

  const weaponTier = getWeaponTierForLevel(user.Level);
  const allProvincesPassed = provinces.length > 0 && user.Piala >= provinces.length;
  const onlineCount = Object.keys(remotePlayers).length;

  return (
    <div className="relative w-screen h-[100dvh] overflow-hidden bg-[#0B1120] select-none">
      {/* Isolated Phaser 3 Viewport */}
      <PhaserGameCanvas bridgeRef={bridgeRef} sceneTrigger={sceneTrigger} />

      {/* Unobstructed Perimeter HUD (pointer-events-none wrapper, no backdrop-filter over canvas) */}
      <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-4">
        {/* Top Perimeter Bar */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          {/* Top-Left Character Status Cluster */}
          <div className="pointer-events-auto flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-950/90 border border-amber-500/40">
            <HeroAvatarPreview guild={user.Guild} gender={user.Gender} weaponTier={weaponTier} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-white">
                <span className="truncate max-w-[140px]">{user.Nama}</span>
                <span className="text-amber-300 font-mono-tabular">Lv.{user.Level}</span>
              </div>
              <p className="text-[11px] text-slate-300 font-mono-tabular">
                {user.Guild} · Senjata {weaponTier} · XP {user.XP} · Piala {user.Piala}/{provinces.length}
              </p>
            </div>
          </div>

          {/* Top-Right Compact Action Cluster */}
          <div className="pointer-events-auto flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowPartyModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-950/90 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-sky-300 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              {partyId ? `Party ${partyId} (${partyMembers.length})` : `Party (${onlineCount} Online)`}
            </button>

            <button
              onClick={() => setShowRaporModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-950/90 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-100 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-amber-300" />
              Rapor
            </button>

            {allProvincesPassed && (
              <button
                onClick={() => setShowDiplomaModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow cursor-pointer"
              >
                <Award className="w-3.5 h-3.5" />
                Klaim Diploma Kerajaan
              </button>
            )}

            <button
              onClick={toggleMute}
              className="p-2 rounded-lg bg-slate-950/90 hover:bg-slate-800 border border-slate-700 text-slate-200 cursor-pointer"
              aria-label={muted ? 'Aktifkan Suara' : 'Matikan Suara'}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setShowPauseModal(true)}
              className="p-2 rounded-lg bg-slate-950/90 hover:bg-slate-800 border border-slate-700 text-slate-200 cursor-pointer"
              aria-label="Jeda"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom Perimeter Bar */}
        <div className="flex items-end justify-between gap-3">
          {currentScene === 'ProvinceIso' && activeProvince ? (
            <div className="pointer-events-auto flex items-center gap-3">
              <button
                onClick={handleReturnToWorldMap}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-950/90 hover:bg-slate-800 border border-amber-500/40 text-xs font-semibold text-amber-200 cursor-pointer"
              >
                <Compass className="w-4 h-4" />
                Kembali ke World Map
              </button>
              <span className="hidden sm:inline text-xs text-slate-200 bg-slate-950/85 px-3 py-2 rounded-lg border border-slate-800">
                {activeProvince.Nama_Provinsi} · KKM {activeProvince.KKM} · Ketuk peta untuk bergerak
              </span>
            </div>
          ) : (
            <div className="pointer-events-auto text-xs text-slate-200 bg-slate-950/85 px-3 py-2 rounded-lg border border-slate-800">
              Ketuk kastil provinsi pada peta untuk menerbangkan kapal udara
            </div>
          )}
        </div>
      </div>

      {/* Non-blocking Toast */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 rounded-lg bg-slate-900 border border-amber-400 text-xs font-medium text-amber-200 shadow-lg">
          {toastMsg}
        </div>
      )}

      {/* Prolog CP Modal (Before entering ProvinceIsoScene) */}
      {prologProvince && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4">
          <div className="rpg-panel w-full max-w-lg rounded-xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-amber-300 font-medium">{prologProvince.Mata_Pelajaran}</p>
                <h2 className="font-display text-2xl font-bold text-white mt-0.5">
                  {prologProvince.Nama_Provinsi}
                </h2>
              </div>
              <button
                onClick={() => setPrologProvince(null)}
                className="p-1.5 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-lg bg-slate-900/90 border border-slate-700 space-y-2">
              <p className="text-sm text-amber-100 leading-relaxed">{prologProvince.Prolog_Cerita}</p>
              <p className="text-xs text-slate-400 pt-2 border-t border-slate-800">
                <BookOpen className="w-3.5 h-3.5 inline mr-1 text-sky-400" />
                Capaian Pembelajaran: {prologProvince.CP_Asli}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>
                <Shield className="w-3.5 h-3.5 inline mr-1 text-rose-400" />
                Boss Elemen: <strong>{prologProvince.Elemen_Boss}</strong>
              </span>
              <span className="font-mono-tabular">KKM Provinsi: {prologProvince.KKM}</span>
            </div>

            <button
              onClick={handleEnterProvince}
              className="w-full py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
            >
              Masuki Provinsi
            </button>
          </div>
        </div>
      )}

      {/* Turn-Based Quest / Boss Battle Modal */}
      {activeBattle && (
        <BattleModal
          quest={activeBattle.quest}
          province={activeBattle.province}
          user={user}
          partyId={partyId}
          partyMembers={partyMembers}
          socket={socketRef.current}
          onClose={() => setActiveBattle(null)}
          onSubmitBattleResult={handleSubmitBattleResult}
        />
      )}

      {/* Co-op Party Modal */}
      {showPartyModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4">
          <div className="rpg-panel w-full max-w-md rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-amber-300">
                Party Kelompok (Co-op Quest)
              </h2>
              <button
                onClick={() => setShowPartyModal(false)}
                className="p-1.5 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Masukkan kode ruang kelompok yang sama dengan temanmu. Saat satu anggota menjawab benar dalam tantangan, serangan bonus disinkronkan ke seluruh anggota party!
            </p>

            <form onSubmit={handleJoinParty} className="flex gap-2">
              <input
                type="text"
                value={partyInput}
                onChange={(e) => setPartyInput(e.target.value)}
                placeholder="Kode Party (misal: TIM-1)"
                className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white font-mono-tabular uppercase"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer"
              >
                Gabung Party
              </button>
            </form>

            {partyId && (
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-300">Aktif di Party {partyId}</span>
                  <button
                    onClick={handleLeaveParty}
                    className="text-rose-400 hover:underline cursor-pointer"
                  >
                    Keluar Party
                  </button>
                </div>
                <div className="space-y-1">
                  {partyMembers.map((m) => (
                    <p key={m.socketId} className="text-xs text-slate-300">
                      {m.nama} · {m.guild} · Lv.{m.level}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pause Modal */}
      {showPauseModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4">
          <div className="rpg-panel w-full max-w-sm rounded-xl p-6 text-center space-y-4">
            <h2 className="font-display text-2xl font-bold text-amber-300">Permainan Dijeda</h2>
            <p className="text-xs text-slate-400">
              {user.Nama} · Level {user.Level} · Senjata {weaponTier}
            </p>
            <div className="flex flex-col gap-2.5 pt-2">
              <button
                onClick={() => setShowPauseModal(false)}
                className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
              >
                Lanjutkan Petualangan
              </button>
              <button
                onClick={() => {
                  setShowPauseModal(false);
                  setScreen('TITLE');
                }}
                className="w-full py-2.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-200 text-sm cursor-pointer"
              >
                Keluar ke Layar Utama
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rapor A4 Print Modal */}
      {showRaporModal && (
        <RaporModal
          user={user}
          provinces={provinces}
          nilai={progress}
          defaultTheme="siswa"
          onClose={() => setShowRaporModal(false)}
        />
      )}

      {/* HTML5 Canvas Diploma Modal */}
      {showDiplomaModal && (
        <DiplomaModal
          user={user}
          totalProvinces={provinces.length}
          onClose={() => setShowDiplomaModal(false)}
        />
      )}
    </div>
  );
}
