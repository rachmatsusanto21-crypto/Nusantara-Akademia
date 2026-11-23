import 'dotenv/config';
import axios from 'axios';
import crypto from 'crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import type {
  ActivePlayerState,
  GenderType,
  GuildType,
  NilaiType,
  PartyMember,
  ProvinceData,
  QuestItem,
  UserRole,
} from './src/types/game.js';
import { getWeaponTierForLevel } from './src/types/game.js';
import { store } from './server/store.js';

const PORT = 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

interface SessionPayload {
  sub: string;
  role: UserRole;
  exp: number;
}

function signToken(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyToken(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8')) as SessionPayload;
    if (Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

interface AuthedRequest extends Request {
  auth?: SessionPayload;
}

function requireAuth(role?: UserRole) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Autentikasi diperlukan' });
      return;
    }
    const token = header.slice(7);
    const verified = verifyToken(token);
    if (!verified) {
      res.status(401).json({ error: 'Sesi tidak valid atau kedaluwarsa' });
      return;
    }
    if (role && verified.role !== role) {
      res.status(403).json({ error: 'Akses ditolak untuk peran ini' });
      return;
    }
    req.auth = verified;
    next();
  };
}

function isAllowedGasUrl(rawUrl: string): boolean {
  if (!rawUrl) return false;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return host === 'script.google.com' || host === 'script.googleusercontent.com';
  } catch {
    return false;
  }
}

async function forwardToGasIfConfigured(payload: Record<string, unknown>): Promise<unknown | null> {
  const gasUrl = store.getGasUrl();
  if (!isAllowedGasUrl(gasUrl)) return null;
  try {
    const resp = await axios.post(gasUrl, payload, { timeout: 6000 });
    return resp.data;
  } catch {
    return null;
  }
}

async function hydrateFromGas(): Promise<{
  ok: boolean;
  summary?: { usersSynced: number; provincesSynced: number; questsSynced: number; nilaiSynced: number };
}> {
  const gasUrl = store.getGasUrl();
  if (!isAllowedGasUrl(gasUrl)) return { ok: false };
  try {
    const [worldResp, adminResp] = await Promise.all([
      axios.get(`${gasUrl}?action=getWorldData`, { timeout: 7000 }),
      axios.get(`${gasUrl}?action=getAdminDashboard`, { timeout: 7000 }),
    ]);
    const summary = store.hydrateFromGasData({
      provinsi: worldResp.data?.provinsi,
      quests: worldResp.data?.quests,
      users: adminResp.data?.users,
      nilai: adminResp.data?.nilai,
    });
    return { ok: true, summary };
  } catch {
    return { ok: false };
  }
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: {
      origin: true,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    allowEIO3: true,
  });

  app.use(express.json({ limit: '1mb' }));

  // Hydrate initial curriculum, students, and grades from Google Sheets if GAS_WEB_APP_URL is configured
  await hydrateFromGas();

  // --- In-memory Real-time State (RAM < 5MB for 100 players, zero SSD wear) ---
  const activePlayers: Record<string, ActivePlayerState> = {};
  const activeParties: Record<string, PartyMember[]> = {};

  io.on('connection', (socket) => {
    socket.on(
      'playerJoin',
      (playerData: {
        nisn: string;
        nama: string;
        guild: GuildType;
        gender: GenderType;
        level: number;
      }) => {
        if (!playerData?.nisn) return;
        const level = Math.max(1, Number(playerData.level) || 1);
        activePlayers[socket.id] = {
          socketId: socket.id,
          nisn: String(playerData.nisn),
          nama: String(playerData.nama || 'Petualang').slice(0, 32),
          guild: playerData.guild || 'Swordsman',
          gender: playerData.gender || 'Male',
          level,
          weaponTier: getWeaponTierForLevel(level),
          scene: 'WorldMap',
          x: 400,
          y: 225,
          status: 'Menjelajah',
        };
        io.emit('updateAllPlayers', activePlayers);
        io.to('admin_room').emit('adminLiveMapUpdate', activePlayers);
      }
    );

    socket.on(
      'playerMove',
      (moveData: { x: number; y: number; scene: string; status?: string; level?: number }) => {
        const player = activePlayers[socket.id];
        if (!player) return;
        player.x = Number(moveData.x) || 400;
        player.y = Number(moveData.y) || 225;
        player.scene = String(moveData.scene || 'WorldMap');
        player.status = String(moveData.status || 'Menjelajah').slice(0, 48);
        if (moveData.level) {
          player.level = Number(moveData.level);
          player.weaponTier = getWeaponTierForLevel(player.level);
        }
        socket.broadcast.emit('playerMoved', player);
        io.to('admin_room').emit('adminLiveMapUpdate', activePlayers);
      }
    );

    socket.on('joinParty', (data: { partyId: string; nisn: string; nama?: string; guild?: GuildType; level?: number }) => {
      const partyId = String(data?.partyId || '').trim().toUpperCase().slice(0, 16);
      if (!partyId) return;
      socket.join(partyId);
      if (!activeParties[partyId]) activeParties[partyId] = [];
      const exists = activeParties[partyId].some((m) => m.socketId === socket.id);
      if (!exists) {
        activeParties[partyId].push({
          socketId: socket.id,
          nisn: String(data.nisn),
          nama: String(data.nama || activePlayers[socket.id]?.nama || 'Rekan'),
          guild: data.guild || activePlayers[socket.id]?.guild || 'Swordsman',
          level: Number(data.level || activePlayers[socket.id]?.level || 1),
        });
      }
      if (activePlayers[socket.id]) {
        activePlayers[socket.id].partyId = partyId;
        activePlayers[socket.id].status = `Party ${partyId}`;
      }
      io.to(partyId).emit('partyUpdated', { partyId, members: activeParties[partyId] });
      io.to('admin_room').emit('adminLiveMapUpdate', activePlayers);
    });

    socket.on('leaveParty', (data: { partyId: string }) => {
      const partyId = String(data?.partyId || '').trim().toUpperCase();
      if (!partyId || !activeParties[partyId]) return;
      socket.leave(partyId);
      activeParties[partyId] = activeParties[partyId].filter((m) => m.socketId !== socket.id);
      if (activePlayers[socket.id]) {
        delete activePlayers[socket.id].partyId;
        activePlayers[socket.id].status = 'Menjelajah';
      }
      if (activeParties[partyId].length === 0) {
        delete activeParties[partyId];
      } else {
        io.to(partyId).emit('partyUpdated', { partyId, members: activeParties[partyId] });
      }
      io.to('admin_room').emit('adminLiveMapUpdate', activePlayers);
    });

    socket.on('partySubmitAnswer', (data: { partyId: string; questId: string; isCorrect: boolean; senderName?: string }) => {
      const partyId = String(data?.partyId || '').trim().toUpperCase();
      if (!partyId) return;
      io.to(partyId).emit('partyQuestProgress', {
        questId: data.questId,
        isCorrect: Boolean(data.isCorrect),
        senderName: data.senderName || activePlayers[socket.id]?.nama || 'Rekan Party',
      });
    });

    socket.on('joinAdmin', (tokenData?: { token?: string }) => {
      const token = tokenData?.token || '';
      const verified = verifyToken(token);
      if (verified && verified.role === 'Guru') {
        socket.join('admin_room');
        socket.emit('adminLiveMapUpdate', activePlayers);
      }
    });

    socket.on('disconnect', () => {
      const player = activePlayers[socket.id];
      if (player?.partyId && activeParties[player.partyId]) {
        activeParties[player.partyId] = activeParties[player.partyId].filter((m) => m.socketId !== socket.id);
        io.to(player.partyId).emit('partyUpdated', {
          partyId: player.partyId,
          members: activeParties[player.partyId],
        });
        if (activeParties[player.partyId].length === 0) {
          delete activeParties[player.partyId];
        }
      }
      delete activePlayers[socket.id];
      io.emit('playerDisconnected', socket.id);
      io.to('admin_room').emit('adminLiveMapUpdate', activePlayers);
    });
  });

  // --- REST API Routes ---
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', activePlayers: Object.keys(activePlayers).length });
  });

  // World data (public curriculum provinces & quests)
  app.get('/api/world', (_req, res) => {
    res.json(store.getWorldData());
  });

  // Student Login / Character Registration
  app.post('/api/auth/student', async (req, res) => {
    const { nisn, nama, password, guild, gender } = req.body as {
      nisn?: string;
      nama?: string;
      password?: string;
      guild?: GuildType;
      gender?: GenderType;
    };

    if (!nisn || !password || nisn.trim().length < 3 || password.length < 4) {
      res.status(400).json({ error: 'NISN minimal 3 karakter dan kata sandi minimal 4 karakter.' });
      return;
    }

    const result = store.loginOrCreateStudent({
      nisn: String(nisn),
      nama: String(nama || `Petualang ${nisn}`),
      password: String(password),
      guild: guild || 'Swordsman',
      gender: gender || 'Male',
    });

    if (!result.ok || !result.user) {
      res.status(401).json({ error: result.error || 'Gagal masuk' });
      return;
    }

    const token = signToken({
      sub: result.user.NISN,
      role: 'Siswa',
      exp: Date.now() + 1000 * 60 * 60 * 12,
    });

    // Optional background sync to GAS if configured
    forwardToGasIfConfigured({
      action: 'loginOrCreate',
      nisn: result.user.NISN,
      nama: result.user.Nama,
      password_hash: store.getUserPasswordHash(result.user.NISN) || '',
      guild: result.user.Guild,
      gender: result.user.Gender,
    }).catch(() => {});

    res.json({
      status: 'success',
      token,
      user: result.user,
      progress: store.getStudentProgress(result.user.NISN),
    });
  });

  // Admin status & first-run claim / login
  app.get('/api/auth/admin-status', (_req, res) => {
    res.json({ configured: store.isAdminConfigured() });
  });

  app.post('/api/auth/admin-claim', (req, res) => {
    const { passcode } = req.body as { passcode?: string };
    if (!passcode || passcode.length < 6) {
      res.status(400).json({ error: 'Kata sandi Guru minimal 6 karakter.' });
      return;
    }
    const ok = store.claimAdminPasscode(passcode);
    if (!ok) {
      res.status(409).json({ error: 'Kata sandi Guru sudah dikonfigurasi sebelumnya.' });
      return;
    }
    const token = signToken({
      sub: 'GURU_ADMIN',
      role: 'Guru',
      exp: Date.now() + 1000 * 60 * 60 * 12,
    });
    res.json({ status: 'claimed', token });
  });

  app.post('/api/auth/admin-login', (req, res) => {
    const { passcode } = req.body as { passcode?: string };
    if (!passcode) {
      res.status(400).json({ error: 'Masukkan kata sandi Guru.' });
      return;
    }
    if (!store.verifyAdminPasscode(passcode)) {
      res.status(401).json({ error: 'Kata sandi Guru tidak valid.' });
      return;
    }
    const token = signToken({
      sub: 'GURU_ADMIN',
      role: 'Guru',
      exp: Date.now() + 1000 * 60 * 60 * 12,
    });
    res.json({ status: 'success', token });
  });

  // Student progress fetch
  app.get('/api/student/progress', requireAuth('Siswa'), (req: AuthedRequest, res) => {
    const nisn = req.auth!.sub;
    res.json({
      user: store.getUserByNisn(nisn),
      progress: store.getStudentProgress(nisn),
    });
  });

  // Proxy / Unified GAS endpoint for score submission & curriculum operations
  app.post('/api/gas', requireAuth(), async (req: AuthedRequest, res) => {
    const body = req.body as Record<string, unknown>;
    const action = String(body?.action || '');

    if (action === 'submitScore') {
      const nisn = req.auth!.role === 'Siswa' ? req.auth!.sub : String(body.nisn || '');
      const result = store.submitScore({
        nisn,
        id_provinsi: String(body.id_provinsi || ''),
        id_quest: String(body.id_quest || ''),
        jenis_nilai: (body.jenis_nilai as NilaiType) || 'Formatif',
        skor: Number(body.skor || 0),
      });

      const gasResp = await forwardToGasIfConfigured({
        ...body,
        nisn,
        id_log: result.log.ID_Log,
        level: result.user?.Level,
        xp: result.user?.XP,
        piala: result.user?.Piala,
      });

      res.json({
        status: 'success',
        finalScore: result.finalScore,
        questStatus: result.questStatus,
        kkm: result.kkm,
        user: result.user,
        progress: store.getStudentProgress(nisn),
        gasSynced: Boolean(gasResp),
      });
      return;
    }

    if (action === 'adminEditScore') {
      if (req.auth!.role !== 'Guru') {
        res.status(403).json({ error: 'Hanya Guru yang dapat mengubah nilai' });
        return;
      }
      const ok = store.adminEditScore({
        id_log: String(body.id_log || ''),
        delete: Boolean(body.delete),
        new_score: typeof body.new_score === 'number' ? body.new_score : undefined,
        new_status: typeof body.new_status === 'string' ? body.new_status : undefined,
      });
      await forwardToGasIfConfigured(body);
      res.json({ status: ok ? 'updated' : 'not_found' });
      return;
    }

    if (action === 'saveKurikulum') {
      if (req.auth!.role !== 'Guru') {
        res.status(403).json({ error: 'Hanya Guru yang dapat menyimpan kurikulum' });
        return;
      }
      const prov = store.saveKurikulum({
        ID_Provinsi: String(body.id_provinsi || `PROV_${Date.now()}`),
        Nama_Provinsi: String(body.nama_provinsi || 'Provinsi Baru'),
        Mata_Pelajaran: String(body.mata_pelajaran || 'Mata Pelajaran'),
        CP_Asli: String(body.cp_asli || ''),
        Prolog_Cerita: String(body.prolog_cerita || ''),
        Elemen_Boss: String(body.elemen_boss || 'Penjaga Segel'),
        Tipe_Boss: (body.tipe_boss as ProvinceData['Tipe_Boss']) || 'Golem',
        KKM: Number(body.kkm || 75),
        MapX: Number(body.map_x || 400),
        MapY: Number(body.map_y || 225),
        Tema_Warna: String(body.tema_warna || '#F59E0B'),
      });
      await forwardToGasIfConfigured(body);
      res.json({ status: 'saved', province: prov });
      return;
    }

    if (action === 'saveQuest') {
      if (req.auth!.role !== 'Guru') {
        res.status(403).json({ error: 'Hanya Guru yang dapat menambah quest' });
        return;
      }
      const quest = store.saveQuest(body.quest as QuestItem);
      await forwardToGasIfConfigured({ action: 'saveQuest', quest });
      res.json({ status: 'saved', quest });
      return;
    }

    res.status(400).json({ error: 'Action GAS tidak dikenal' });
  });

  const isProd = process.env.NODE_ENV === 'production';
  const distPath = path.resolve(process.cwd(), 'dist');

  // Admin Dashboard endpoints
  app.get('/api/admin/dashboard', requireAuth('Guru'), (_req, res) => {
    res.json({
      ...store.getAdminDashboard(),
      activePlayers,
      serverMode: isProd && fs.existsSync(distPath) ? 'production' : 'development',
      adminPasscodeSource:
        process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim().length > 0 ? 'env' : 'claimed',
    });
  });

  app.post('/api/admin/gas-config', requireAuth('Guru'), async (req, res) => {
    const { gasUrl } = req.body as { gasUrl?: string };
    const trimmed = String(gasUrl || '').trim();
    if (trimmed && !isAllowedGasUrl(trimmed)) {
      res.status(400).json({
        error: 'URL harus menggunakan HTTPS dan domain resmi script.google.com.',
      });
      return;
    }
    store.setGasUrl(trimmed);
    let reachable = false;
    let summary = null;
    if (trimmed) {
      const syncResult = await hydrateFromGas();
      reachable = syncResult.ok;
      summary = syncResult.summary || null;
    }
    res.json({ status: 'saved', gasUrl: trimmed, reachable, summary });
  });

  app.post('/api/admin/gas-sync', requireAuth('Guru'), async (_req, res) => {
    const syncResult = await hydrateFromGas();
    if (!syncResult.ok) {
      res.status(400).json({ error: 'GAS URL belum diatur atau tidak merespons.' });
      return;
    }
    res.json({ status: 'synced', summary: syncResult.summary });
  });

  // Serve Vite middleware in dev, or built dist/ in production (zero Vite overhead in production)
  if (!isProd || !fs.existsSync(distPath)) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(
      `Nusantara Akademia Server (${isProd && fs.existsSync(distPath) ? 'PRODUCTION' : 'DEV'}) berjalan pada http://0.0.0.0:${PORT}`
    );
  });
}

startServer();
