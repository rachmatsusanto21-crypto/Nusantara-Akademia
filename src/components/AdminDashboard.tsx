import {
  Check,
  Copy,
  Database,
  LogOut,
  Map as MapIcon,
  Pencil,
  Plus,
  Printer,
  Radar,
  RefreshCw,
  Search,
  Trash2,
  Wand2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type {
  ActivePlayerState,
  NilaiProgres,
  ProvinceData,
  QuestItem,
  UserProfile,
} from '../types/game';
import { convertCpToFantasyProlog } from '../utils/cpConverter';
import { GAS_CODE_GS, SHEET_SCHEMA_TABS } from '../utils/gasTemplate';
import { RaporModal } from './RaporModal';

interface AdminDashboardProps {
  adminToken: string;
  socket: Socket | null;
  onExit: () => void;
  onWorldUpdated: () => void;
}

type AdminTab = 'radar' | 'nilai' | 'kurikulum' | 'gas';

export function AdminDashboard({
  adminToken,
  socket,
  onExit,
  onWorldUpdated,
}: AdminDashboardProps) {
  const [tab, setTab] = useState<AdminTab>('radar');
  const [radarSceneFilter, setRadarSceneFilter] = useState<string>('ALL');
  const [livePlayers, setLivePlayers] = useState<Record<string, ActivePlayerState>>({});
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [nilai, setNilai] = useState<NilaiProgres[]>([]);
  const [provinces, setProvinces] = useState<ProvinceData[]>([]);
  const [quests, setQuests] = useState<QuestItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editScoreVal, setEditScoreVal] = useState<string>('');
  const [editStatusVal, setEditStatusVal] = useState<string>('');
  const [raporTargetUser, setRaporTargetUser] = useState<UserProfile | null>(null);

  // Kurikulum Builder Form
  const [provId, setProvId] = useState('PROV_IPS');
  const [provName, setProvName] = useState('Provinsi Niaga Nusantara');
  const [provMapel, setProvMapel] = useState('IPS · Ekonomi & Sejarah');
  const [provCp, setProvCp] = useState('Memahami kegiatan ekonomi produksi, distribusi, dan konsumsi.');
  const [provBoss, setProvBoss] = useState('Saudagar Bayangan');
  const [provBossType, setProvBossType] = useState<ProvinceData['Tipe_Boss']>('Golem');
  const [provKkm, setProvKkm] = useState(75);
  const [provProlog, setProvProlog] = useState('');
  const [kurikulumFeedback, setKurikulumFeedback] = useState('');

  // Quest TP Builder Form
  const [qProvId, setQProvId] = useState('PROV_MTK');
  const [qTitle, setQTitle] = useState('');
  const [qTp, setQTp] = useState('');
  const [qType, setQType] = useState<'Main' | 'Side' | 'Boss'>('Main');
  const [qUrutan, setQUrutan] = useState(4);
  const [qPertanyaan, setQPertanyaan] = useState('');
  const [qA, setQA] = useState('');
  const [qB, setQB] = useState('');
  const [qC, setQC] = useState('');
  const [qD, setQD] = useState('');
  const [qKunci, setQKunci] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [questFeedback, setQuestFeedback] = useState('');

  // GAS Config & Production Checklist Status
  const [gasUrl, setGasUrl] = useState('');
  const [gasStatus, setGasStatus] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [serverMode, setServerMode] = useState<'production' | 'development'>('development');
  const [adminPasscodeSource, setAdminPasscodeSource] = useState<'env' | 'claimed'>('claimed');

  const loadDashboard = useCallback(async () => {
    try {
      const resp = await fetch('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!resp.ok) return;
      const data = await resp.json();
      setUsers(data.users || []);
      setNilai(data.nilai || []);
      setProvinces(data.provinces || []);
      setQuests(data.quests || []);
      setGasUrl(data.gasUrl || '');
      if (data.serverMode) setServerMode(data.serverMode);
      if (data.adminPasscodeSource) setAdminPasscodeSource(data.adminPasscodeSource);
      if (data.activePlayers) {
        setLivePlayers(data.activePlayers);
      }
    } catch {
      // Ignore transient network errors
    }
  }, [adminToken]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('joinAdmin', { token: adminToken });
    const handler = (playersMap: Record<string, ActivePlayerState>) => {
      setLivePlayers(playersMap || {});
    };
    socket.on('adminLiveMapUpdate', handler);
    return () => {
      socket.off('adminLiveMapUpdate', handler);
    };
  }, [socket, adminToken]);

  const playerList = useMemo(() => {
    const all = Object.values(livePlayers);
    if (radarSceneFilter === 'ALL') return all;
    return all.filter((p) => p.scene === radarSceneFilter);
  }, [livePlayers, radarSceneFilter]);

  const filteredNilai = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return nilai;
    return nilai.filter(
      (n) =>
        n.NISN.toLowerCase().includes(q) ||
        (n.Nama || '').toLowerCase().includes(q) ||
        n.ID_Provinsi.toLowerCase().includes(q) ||
        n.ID_Quest.toLowerCase().includes(q)
    );
  }, [nilai, searchQuery]);

  const handleSaveEditScore = async (idLog: string) => {
    await fetch('/api/gas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        action: 'adminEditScore',
        id_log: idLog,
        new_score: Number(editScoreVal),
        new_status: editStatusVal,
      }),
    });
    setEditingLogId(null);
    loadDashboard();
  };

  const handleDeleteScore = async (idLog: string) => {
    await fetch('/api/gas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        action: 'adminEditScore',
        id_log: idLog,
        delete: true,
      }),
    });
    loadDashboard();
  };

  const handleGenerateProlog = () => {
    setProvProlog(convertCpToFantasyProlog(provName, provCp, provBoss));
  };

  const handleSaveKurikulum = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalProlog = provProlog.trim() || convertCpToFantasyProlog(provName, provCp, provBoss);
    const resp = await fetch('/api/gas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        action: 'saveKurikulum',
        id_provinsi: provId.trim().toUpperCase(),
        nama_provinsi: provName.trim(),
        mata_pelajaran: provMapel.trim(),
        cp_asli: provCp.trim(),
        prolog_cerita: finalProlog,
        elemen_boss: provBoss.trim(),
        tipe_boss: provBossType,
        kkm: Number(provKkm),
        map_x: 390 + Math.floor(Math.random() * 80 - 40),
        map_y: 220 + Math.floor(Math.random() * 60 - 30),
      }),
    });
    if (resp.ok) {
      setKurikulumFeedback('Provinsi kurikulum berhasil disimpan dan langsung aktif di Peta Dunia!');
      loadDashboard();
      onWorldUpdated();
    }
  };

  const handleSaveQuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qTitle.trim() || !qPertanyaan.trim()) return;
    const newQuest: QuestItem = {
      ID_Quest: `${qProvId}_${Date.now().toString().slice(-4)}`,
      ID_Provinsi: qProvId,
      Urutan_Linear: Number(qUrutan),
      Judul_Quest: qTitle.trim(),
      TP_Deskripsi: qTp.trim() || qTitle.trim(),
      Tipe_Quest: qType,
      Poin: 100,
      MapX: qType === 'Boss' ? 675 : 220 + (Number(qUrutan) % 4) * 110,
      MapY: qType === 'Side' ? 160 : 280 - (Number(qUrutan) % 3) * 45,
      Pertanyaan: qPertanyaan.trim(),
      Opsi_A: qA.trim() || 'Opsi A',
      Opsi_B: qB.trim() || 'Opsi B',
      Opsi_C: qC.trim() || 'Opsi C',
      Opsi_D: qD.trim() || 'Opsi D',
      Kunci: qKunci,
    };

    const resp = await fetch('/api/gas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ action: 'saveQuest', quest: newQuest }),
    });
    if (resp.ok) {
      setQuestFeedback('Quest Tujuan Pembelajaran baru berhasil ditambahkan!');
      setQTitle('');
      setQTp('');
      setQPertanyaan('');
      setQA('');
      setQB('');
      setQC('');
      setQD('');
      loadDashboard();
      onWorldUpdated();
    }
  };

  const handleSaveGasUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setGasStatus('Menguji koneksi ke Google Apps Script...');
    const resp = await fetch('/api/admin/gas-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ gasUrl }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      setGasStatus(data.error || 'Gagal menyimpan URL GAS');
      return;
    }
    if (data.gasUrl) {
      if (data.reachable) {
        const s = data.summary;
        setGasStatus(
          s
            ? `Terhubung & tersinkronisasi (${s.usersSynced} siswa, ${s.provincesSynced} provinsi, ${s.nilaiSynced} log nilai).`
            : 'Terhubung! Sinkronisasi Google Sheets aktif.'
        );
        loadDashboard();
        onWorldUpdated();
      } else {
        setGasStatus('URL tersimpan, namun endpoint belum merespons doGet.');
      }
    } else {
      setGasStatus('Mode Server Lokal aktif (tanpa GAS eksternal).');
    }
  };

  const handleManualGasSync = async () => {
    setGasStatus('Menarik data terbaru dari Google Sheets...');
    const resp = await fetch('/api/admin/gas-sync', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await resp.json();
    if (!resp.ok) {
      setGasStatus(data.error || 'Gagal menarik data dari Google Sheets.');
      return;
    }
    const s = data.summary;
    setGasStatus(
      `Sinkronisasi selesai (${s?.usersSynced || 0} siswa, ${s?.provincesSynced || 0} provinsi, ${s?.questsSynced || 0} quest, ${s?.nilaiSynced || 0} nilai).`
    );
    loadDashboard();
    onWorldUpdated();
  };

  const handleCopyCodeGs = () => {
    navigator.clipboard.writeText(GAS_CODE_GS);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col">
      {/* Clean 3-Zone Top Bar */}
      <header className="flex items-center justify-between gap-6 px-6 py-3.5 border-b border-slate-800 bg-slate-900/90">
        <div className="font-display text-lg font-bold tracking-wide text-amber-300 whitespace-nowrap shrink-0">
          Panel Guru Nusantara Akademia
        </div>

        <nav className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg overflow-x-auto">
          <button
            onClick={() => setTab('radar')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              tab === 'radar' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Radar className="w-3.5 h-3.5" />
            Radar Live ({Object.keys(livePlayers).length})
          </button>
          <button
            onClick={() => setTab('nilai')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              tab === 'nilai' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Pencil className="w-3.5 h-3.5" />
            Manajemen Nilai ({nilai.length})
          </button>
          <button
            onClick={() => setTab('kurikulum')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              tab === 'kurikulum' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            Kurikulum & Quest
          </button>
          <button
            onClick={() => setTab('gas')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              tab === 'gas' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Integrasi Sheets & GAS
          </button>
        </nav>

        <button
          onClick={onExit}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs font-medium text-slate-200 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Keluar Panel
        </button>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-5 sm:p-6 space-y-6">
        {/* TAB 1: LIVE RADAR MAP */}
        {tab === 'radar' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl font-bold text-white">
                  Radar Aktivitas Kelas Real-Time
                </h1>
                <p className="text-sm text-slate-400">
                  Pantau pergerakan posisi siswa, kelompok party, dan pertempuran Boss melalui Socket.io.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="radar-filter" className="text-xs text-slate-400">
                  Filter Lokasi:
                </label>
                <select
                  id="radar-filter"
                  value={radarSceneFilter}
                  onChange={(e) => setRadarSceneFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100"
                >
                  <option value="ALL">Semua Lokasi</option>
                  <option value="WorldMap">World Map (Kapal Udara)</option>
                  {provinces.map((p) => (
                    <option key={p.ID_Provinsi} value={p.ID_Provinsi}>
                      {p.Nama_Provinsi}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Live Mini Radar Canvas */}
              <div className="lg:col-span-2 relative aspect-video rounded-xl overflow-hidden border border-slate-700 bg-slate-900">
                <img
                  src={
                    radarSceneFilter === 'WorldMap' || radarSceneFilter === 'ALL'
                      ? '/src/assets/images/world_map_archipelago_1795414478155.jpg'
                      : '/src/assets/images/province_iso_bg_1795414478840.jpg'
                  }
                  alt="Peta Radar Monitoring Guru"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover opacity-65"
                />

                {playerList.map((p) => {
                  const leftPct = Math.max(4, Math.min(96, (p.x / 800) * 100));
                  const topPct = Math.max(6, Math.min(94, (p.y / 450) * 100));
                  return (
                    <div
                      key={p.socketId}
                      style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-150"
                    >
                      <span className="px-1.5 py-0.5 rounded bg-slate-950/90 border border-amber-400/60 text-[10px] font-medium text-amber-200 whitespace-nowrap">
                        {p.nama}
                      </span>
                      <span className="mt-0.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-slate-950 shadow" />
                    </div>
                  );
                })}

                {playerList.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50">
                    <p className="text-sm text-slate-300">
                      Belum ada siswa aktif pada tampilan radar ini.
                    </p>
                  </div>
                )}
              </div>

              {/* Active Student Telemetry List */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
                <h2 className="text-sm font-semibold text-slate-200">
                  Siswa Terhubung ({playerList.length})
                </h2>
                <div className="divide-y divide-slate-800 max-h-80 overflow-y-auto">
                  {playerList.length === 0 ? (
                    <p className="py-4 text-xs text-slate-400">
                      Menunggu siswa masuk melalui klien game atau tab lain.
                    </p>
                  ) : (
                    playerList.map((p) => (
                      <div key={p.socketId} className="py-2.5 flex items-start justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate">{p.nama}</p>
                          <p className="text-slate-400 truncate">
                            {p.guild} · Lv.{p.level} · {p.scene}
                          </p>
                        </div>
                        <span className="text-amber-300 font-medium text-right shrink-0">
                          {p.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Registered Students Quick Rapor */}
                {users.length > 0 && (
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <h3 className="text-xs font-semibold text-slate-300">
                      Cetak Rapor Resmi Siswa ({users.length})
                    </h3>
                    <div className="space-y-1.5 max-h-44 overflow-y-auto">
                      {users.map((u) => (
                        <div
                          key={u.NISN}
                          className="flex items-center justify-between gap-2 text-xs py-1"
                        >
                          <span className="truncate text-slate-200">
                            {u.Nama} ({u.NISN})
                          </span>
                          <button
                            onClick={() => setRaporTargetUser(u)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-100 shrink-0 cursor-pointer"
                          >
                            <Printer className="w-3 h-3" />
                            Rapor
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MANAJEMEN NILAI (CRUD) */}
        {tab === 'nilai' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl font-bold text-white">Manajemen Nilai Siswa</h1>
                <p className="text-sm text-slate-400">
                  Cari NISN/nama, ubah skor manual jika terjadi kendala teknis, atau hapus log duplikat.
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama, NISN, atau quest..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/70 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-slate-800 text-slate-400 bg-slate-900">
                  <tr>
                    <th className="py-3 px-4">NISN / Nama</th>
                    <th className="py-3 px-4">Provinsi</th>
                    <th className="py-3 px-4">Quest</th>
                    <th className="py-3 px-4">Jenis</th>
                    <th className="py-3 px-4 text-right">Skor</th>
                    <th className="py-3 px-4">Status KKM</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredNilai.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Belum ada log nilai yang sesuai pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredNilai.map((row) => {
                      const isEditing = editingLogId === row.ID_Log;
                      return (
                        <tr key={row.ID_Log} className="hover:bg-slate-800/40">
                          <td className="py-3 px-4">
                            <p className="font-medium text-white">{row.Nama || row.NISN}</p>
                            <p className="font-mono-tabular text-slate-400">{row.NISN}</p>
                          </td>
                          <td className="py-3 px-4">{row.ID_Provinsi}</td>
                          <td className="py-3 px-4 font-mono-tabular">{row.ID_Quest}</td>
                          <td className="py-3 px-4">{row.Jenis_Nilai}</td>
                          <td className="py-3 px-4 text-right font-mono-tabular font-semibold">
                            {isEditing ? (
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={editScoreVal}
                                onChange={(e) => setEditScoreVal(e.target.value)}
                                className="w-16 px-2 py-1 rounded bg-slate-950 border border-amber-400 text-right text-white"
                              />
                            ) : (
                              row.Skor_Diperoleh
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editStatusVal}
                                onChange={(e) => setEditStatusVal(e.target.value)}
                                className="w-40 px-2 py-1 rounded bg-slate-950 border border-amber-400 text-white"
                              />
                            ) : (
                              <span
                                className={
                                  row.Status.startsWith('Lulus') ? 'text-emerald-400' : 'text-amber-300'
                                }
                              >
                                {row.Status}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            {isEditing ? (
                              <button
                                onClick={() => handleSaveEditScore(row.ID_Log)}
                                className="px-2.5 py-1 rounded bg-emerald-500 text-slate-950 font-semibold mr-1 cursor-pointer"
                              >
                                Simpan
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingLogId(row.ID_Log);
                                  setEditScoreVal(String(row.Skor_Diperoleh));
                                  setEditStatusVal(row.Status);
                                }}
                                className="p-1.5 rounded hover:bg-slate-700 text-slate-300 mr-1 cursor-pointer"
                                title="Edit Nilai"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteScore(row.ID_Log)}
                              className="p-1.5 rounded hover:bg-rose-950 text-rose-400 cursor-pointer"
                              title="Hapus Log"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: KURIKULUM & QUEST BUILDER */}
        {tab === 'kurikulum' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form 1: Konversi CP -> Provinsi & Boss */}
            <form
              onSubmit={handleSaveKurikulum}
              className="rounded-xl border border-slate-800 bg-slate-900/75 p-5 space-y-4"
            >
              <div>
                <h2 className="font-display text-lg font-bold text-amber-300">
                  1. Konversi CP ke Provinsi & Boss
                </h2>
                <p className="text-xs text-slate-400">
                  Ubah Capaian Pembelajaran (CP) menjadi narasi prolog fantasi dan Boss Elemen.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">ID Provinsi</label>
                  <input
                    type="text"
                    value={provId}
                    onChange={(e) => setProvId(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">KKM Provinsi</label>
                  <input
                    type="number"
                    min={50}
                    max={100}
                    value={provKkm}
                    onChange={(e) => setProvKkm(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-mono-tabular"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Nama Provinsi</label>
                  <input
                    type="text"
                    value={provName}
                    onChange={(e) => setProvName(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Mata Pelajaran</label>
                  <input
                    type="text"
                    value={provMapel}
                    onChange={(e) => setProvMapel(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Nama Boss Elemen</label>
                  <input
                    type="text"
                    value={provBoss}
                    onChange={(e) => setProvBoss(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Tipe Boss</label>
                  <select
                    value={provBossType}
                    onChange={(e) => setProvBossType(e.target.value as ProvinceData['Tipe_Boss'])}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                  >
                    <option value="Golem">Golem Aritmatika</option>
                    <option value="Leviathan">Leviathan Elemen</option>
                    <option value="Dragon">Naga Dimensi</option>
                    <option value="Titan">Titan Energi</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Capaian Pembelajaran (CP Asli)</label>
                <textarea
                  rows={2}
                  value={provCp}
                  onChange={(e) => setProvCp(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate-300">Prolog Narasi Fantasi</label>
                  <button
                    type="button"
                    onClick={handleGenerateProlog}
                    className="inline-flex items-center gap-1 text-xs text-amber-300 hover:text-amber-200 cursor-pointer"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    Buat dari Template CP
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={provProlog}
                  onChange={(e) => setProvProlog(e.target.value)}
                  placeholder="Klik 'Buat dari Template CP' atau tulis narasi prolog..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              {kurikulumFeedback && <p className="text-xs text-emerald-400">{kurikulumFeedback}</p>}

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer"
              >
                Simpan Provinsi Kurikulum
              </button>
            </form>

            {/* Form 2: Tambah Quest TP */}
            <form
              onSubmit={handleSaveQuest}
              className="rounded-xl border border-slate-800 bg-slate-900/75 p-5 space-y-3"
            >
              <div>
                <h2 className="font-display text-lg font-bold text-amber-300">
                  2. Tambah Quest Tujuan Pembelajaran ({quests.length})
                </h2>
                <p className="text-xs text-slate-400">
                  Setiap TP menjadi node tantangan linear di peta isometrik provinsi.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Provinsi</label>
                  <select
                    value={qProvId}
                    onChange={(e) => setQProvId(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                  >
                    {provinces.map((p) => (
                      <option key={p.ID_Provinsi} value={p.ID_Provinsi}>
                        {p.Nama_Provinsi}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Tipe Quest</label>
                  <select
                    value={qType}
                    onChange={(e) => setQType(e.target.value as 'Main' | 'Side' | 'Boss')}
                    className="w-full px-2.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                  >
                    <option value="Main">Main (Formatif)</option>
                    <option value="Side">Side (Bonus XP)</option>
                    <option value="Boss">Boss (Sumatif)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Urutan Linear</label>
                  <input
                    type="number"
                    min={0}
                    value={qUrutan}
                    onChange={(e) => setQUrutan(Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-mono-tabular"
                  />
                </div>
              </div>

              <input
                type="text"
                value={qTitle}
                onChange={(e) => setQTitle(e.target.value)}
                placeholder="Judul Quest (contoh: Gerbang Pecahan)"
                required
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
              />
              <input
                type="text"
                value={qTp}
                onChange={(e) => setQTp(e.target.value)}
                placeholder="Deskripsi Tujuan Pembelajaran (TP)"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
              />
              <textarea
                rows={2}
                value={qPertanyaan}
                onChange={(e) => setQPertanyaan(e.target.value)}
                placeholder="Pertanyaan tantangan..."
                required
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={qA}
                  onChange={(e) => setQA(e.target.value)}
                  placeholder="Opsi A"
                  required
                  className="px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-xs text-white"
                />
                <input
                  type="text"
                  value={qB}
                  onChange={(e) => setQB(e.target.value)}
                  placeholder="Opsi B"
                  required
                  className="px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-xs text-white"
                />
                <input
                  type="text"
                  value={qC}
                  onChange={(e) => setQC(e.target.value)}
                  placeholder="Opsi C"
                  required
                  className="px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-xs text-white"
                />
                <input
                  type="text"
                  value={qD}
                  onChange={(e) => setQD(e.target.value)}
                  placeholder="Opsi D"
                  required
                  className="px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <label className="text-xs text-slate-300">Kunci Jawaban Benar:</label>
                <select
                  value={qKunci}
                  onChange={(e) => setQKunci(e.target.value as 'A' | 'B' | 'C' | 'D')}
                  className="px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-xs text-white"
                >
                  <option value="A">Opsi A</option>
                  <option value="B">Opsi B</option>
                  <option value="C">Opsi C</option>
                  <option value="D">Opsi D</option>
                </select>
              </div>

              {questFeedback && <p className="text-xs text-emerald-400">{questFeedback}</p>}

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Tambahkan Quest TP
              </button>
            </form>
          </div>
        )}

        {/* TAB 4: GOOGLE SHEETS & GAS SETUP */}
        {tab === 'gas' && (
          <div className="space-y-6">
            {/* Status Checklist Opsi 1 (24/7 Cloud + Google Sheets + Mode Produksi) */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/75 p-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-slate-400">Mode Eksekusi Server</p>
                <p className="mt-1 font-semibold text-white">
                  {serverMode === 'production'
                    ? 'Produksi (dist/ aktif · CPU & RAM Hemat)'
                    : 'Development (Jalankan npm run build && npm start untuk produksi)'}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Kunci Sandi Guru (ADMIN_PASSCODE)</p>
                <p className="mt-1 font-semibold text-white">
                  {adminPasscodeSource === 'env'
                    ? 'Terkunci via Environment Variable (ADMIN_PASSCODE)'
                    : 'Tersimpan di server (Set ADMIN_PASSCODE di Secrets untuk lintas restart)'}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Basis Data Google Sheets (GAS_WEB_APP_URL)</p>
                <p className={`mt-1 font-semibold ${gasUrl ? 'text-emerald-400' : 'text-amber-300'}`}>
                  {gasUrl ? 'Terhubung ke Google Apps Script' : 'Belum terhubung (Penyimpanan Lokal)'}
                </p>
              </div>
            </div>

            <form
              onSubmit={handleSaveGasUrl}
              className="rounded-xl border border-slate-800 bg-slate-900/75 p-5 space-y-3"
            >
              <h2 className="font-display text-lg font-bold text-amber-300">
                Hubungkan Web App Google Apps Script (Zero Cloud Cost)
              </h2>
              <p className="text-xs text-slate-400">
                Tempel URL Web App hasil Deploy Apps Script (berawal dengan https://script.google.com/macros/s/...) untuk sinkronisasi otomatis ke 5 tab Google Sheets Anda. Kosongkan jika menggunakan penyimpanan lokal server sekolah.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="url"
                  value={gasUrl}
                  onChange={(e) => setGasUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-mono-tabular"
                />
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs whitespace-nowrap cursor-pointer"
                >
                  Simpan & Uji Koneksi
                </button>
                {gasUrl && (
                  <button
                    type="button"
                    onClick={handleManualGasSync}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs whitespace-nowrap cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Tarik Data Sheets
                  </button>
                )}
              </div>
              {gasStatus && <p className="text-xs text-sky-300">{gasStatus}</p>}
            </form>

            {/* 5-Tab Spreadsheet Schema */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/75 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-white">Struktur 5 Tab Google Spreadsheet</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SHEET_SCHEMA_TABS.map((t) => (
                  <div key={t.tabName} className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <p className="text-xs font-semibold text-amber-300">{t.tabName}</p>
                    <p className="mt-1 text-[11px] font-mono-tabular text-slate-400 leading-relaxed">
                      {t.columns.join(' · ')}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Copyable Code.gs */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/75 p-5 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-sm font-semibold text-white">
                  Kode Google Apps Script (Extensions &gt; Apps Script &gt; Code.gs)
                </h3>
                <button
                  onClick={handleCopyCodeGs}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-100 cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCode ? 'Tersalin' : 'Salin Code.gs'}
                </button>
              </div>
              <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono-tabular text-slate-300 overflow-x-auto max-h-80">
                {GAS_CODE_GS}
              </pre>
            </div>
          </div>
        )}
      </main>

      {raporTargetUser && (
        <RaporModal
          user={raporTargetUser}
          provinces={provinces}
          nilai={nilai}
          defaultTheme="guru"
          onClose={() => setRaporTargetUser(null)}
        />
      )}
    </div>
  );
}
