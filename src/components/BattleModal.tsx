import { Shield, Sparkles, Swords, Timer, Users, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type {
  NilaiType,
  PartyMember,
  ProvinceData,
  QuestItem,
  QuestQuestion,
  UserProfile,
} from '../types/game';
import { GUILD_PERKS, getWeaponTierForLevel } from '../types/game';
import { soundFx } from '../utils/soundFx';
import { HeroAvatarPreview } from './GuildCrestSvg';

interface BattleModalProps {
  quest: QuestItem;
  province: ProvinceData;
  user: UserProfile;
  partyId: string | null;
  partyMembers: PartyMember[];
  socket: Socket | null;
  onClose: () => void;
  onSubmitBattleResult: (payload: {
    id_provinsi: string;
    id_quest: string;
    jenis_nilai: NilaiType;
    skor: number;
  }) => Promise<{ finalScore: number; questStatus: string; kkm: number }>;
}

const OPTION_KEYS: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];

export function BattleModal({
  quest,
  province,
  user,
  partyId,
  partyMembers,
  socket,
  onClose,
  onSubmitBattleResult,
}: BattleModalProps) {
  const questions: QuestQuestion[] = useMemo(() => {
    const base: QuestQuestion = {
      Pertanyaan: quest.Pertanyaan,
      Opsi_A: quest.Opsi_A,
      Opsi_B: quest.Opsi_B,
      Opsi_C: quest.Opsi_C,
      Opsi_D: quest.Opsi_D,
      Kunci: quest.Kunci,
    };
    return [base, ...(quest.Soal_Tambahan || [])];
  }, [quest]);

  const baseSeconds = user.Guild === 'Swordsman' ? 22 : 20; // Swordsman +10% time
  const [qIndex, setQIndex] = useState(0);
  const [heroHp, setHeroHp] = useState(100);
  const [bossHp, setBossHp] = useState(100);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bonusScore, setBonusScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(baseSeconds);
  const [mageHintUsed, setMageHintUsed] = useState(false);
  const [eliminatedOpt, setEliminatedOpt] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [axemanShieldAvailable, setAxemanShieldAvailable] = useState(
    user.Guild === 'Axeman' && quest.Tipe_Quest === 'Boss'
  );
  const [battleFeedback, setBattleFeedback] = useState<string>(
    quest.Tipe_Quest === 'Boss'
      ? `${province.Elemen_Boss} menghadang! Kalahkan untuk nilai Sumatif (KKM ${province.KKM}).`
      : `Tantangan ${quest.Judul_Quest} dimulai!`
  );
  const [hitFlash, setHitFlash] = useState<'hero' | 'boss' | null>(null);
  const [lockedOption, setLockedOption] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resultSummary, setResultSummary] = useState<{
    finalScore: number;
    questStatus: string;
    kkm: number;
  } | null>(null);

  const timerRef = useRef<number | null>(null);
  const currentQ = questions[qIndex];

  // Broadcast combat status to Live Radar
  useEffect(() => {
    socket?.emit('playerMove', {
      x: quest.MapX,
      y: quest.MapY,
      scene: province.ID_Provinsi,
      status: quest.Tipe_Quest === 'Boss' ? `Melawan ${province.Elemen_Boss}` : `Bertarung: ${quest.Judul_Quest}`,
      level: user.Level,
    });
  }, [socket, quest, province, user.Level]);

  // Listen to Co-op Party assistance
  useEffect(() => {
    if (!socket || !partyId) return;
    const handler = (data: { questId: string; isCorrect: boolean; senderName: string }) => {
      if (data.questId !== quest.ID_Quest || resultSummary) return;
      if (data.isCorrect) {
        setBattleFeedback(`${data.senderName} membantu dari Party! Kekuatan serangan tim meningkat +15 HP Boss.`);
        setBossHp((hp) => Math.max(5, hp - 15));
      }
    };
    socket.on('partyQuestProgress', handler);
    return () => {
      socket.off('partyQuestProgress', handler);
    };
  }, [socket, partyId, quest.ID_Quest, resultSummary]);

  // Countdown timer per question
  useEffect(() => {
    if (resultSummary || lockedOption) return;
    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleAnswerTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIndex, resultSummary, lockedOption]);

  const finishBattle = async (finalCorrect: number, finalBonus: number) => {
    setSubmitting(true);
    const rawPct = Math.round((finalCorrect / questions.length) * 100) + finalBonus;
    const clampedScore = Math.max(0, Math.min(100, rawPct));
    const jenisNilai: NilaiType =
      quest.Tipe_Quest === 'Boss'
        ? 'Sumatif'
        : quest.Tipe_Quest === 'Remedial'
          ? 'Remedial'
          : 'Formatif';

    const outcome = await onSubmitBattleResult({
      id_provinsi: province.ID_Provinsi,
      id_quest: quest.ID_Quest,
      jenis_nilai: jenisNilai,
      skor: clampedScore,
    });

    if (outcome.questStatus.startsWith('Lulus')) {
      soundFx.playVictory();
    } else {
      soundFx.playDamage();
    }

    setResultSummary(outcome);
    setSubmitting(false);
  };

  const advanceOrFinish = (nextCorrect: number, nextBonus: number) => {
    setTimeout(() => {
      setHitFlash(null);
      setEliminatedOpt(null);
      if (qIndex + 1 < questions.length) {
        setQIndex((i) => i + 1);
        setTimeLeft(baseSeconds);
        setLockedOption(false);
      } else {
        finishBattle(nextCorrect, nextBonus);
      }
    }, 650);
  };

  const handleAnswerTimeout = () => {
    if (lockedOption || resultSummary) return;
    setLockedOption(true);
    soundFx.playDamage();
    setHitFlash('hero');
    setStreak(0);
    setHeroHp((hp) => Math.max(10, hp - Math.round(70 / questions.length)));
    setBattleFeedback(`Waktu habis! Kunci yang benar adalah Opsi ${currentQ.Kunci}.`);
    advanceOrFinish(correctCount, bonusScore);
  };

  const handleSelectOption = (choice: 'A' | 'B' | 'C' | 'D') => {
    if (lockedOption || resultSummary || choice === eliminatedOpt) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setLockedOption(true);

    const isCorrect = choice === currentQ.Kunci;
    if (partyId && socket) {
      socket.emit('partySubmitAnswer', {
        partyId,
        questId: quest.ID_Quest,
        isCorrect,
        senderName: user.Nama,
      });
    }

    if (isCorrect) {
      soundFx.playHit();
      setHitFlash('boss');
      const nextCorrect = correctCount + 1;
      const nextStreak = streak + 1;
      let nextBonus = bonusScore;

      if (user.Guild === 'Archer' && nextStreak > 0 && nextStreak % 3 === 0) {
        nextBonus += 15;
        setBattleFeedback('Critical Focus! 3 jawaban benar beruntun memicu bonus skor +15%!');
      } else {
        setBattleFeedback('Serangan tepat sasaran! Pertahanan lawan retak.');
      }

      setCorrectCount(nextCorrect);
      setStreak(nextStreak);
      setBonusScore(nextBonus);
      setBossHp((hp) => Math.max(0, hp - Math.ceil(100 / questions.length)));
      advanceOrFinish(nextCorrect, nextBonus);
    } else {
      setStreak(0);
      if (axemanShieldAvailable) {
        soundFx.playShieldBlock();
        setAxemanShieldAvailable(false);
        setBattleFeedback(
          `Heavy Shield aktif! Kesalahan ditahan tanpa mengurangi HP (Kunci: ${currentQ.Kunci}).`
        );
      } else {
        soundFx.playDamage();
        setHitFlash('hero');
        setHeroHp((hp) => Math.max(10, hp - Math.round(75 / questions.length)));
        setBattleFeedback(`Kurang tepat! Serangan balik mengenai Hero (Kunci: ${currentQ.Kunci}).`);
      }
      advanceOrFinish(correctCount, bonusScore);
    }
  };

  const triggerMageArcaneHint = () => {
    if (user.Guild !== 'Mage' || mageHintUsed || lockedOption) return;
    const wrongOptions = OPTION_KEYS.filter((k) => k !== currentQ.Kunci);
    const pick = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
    soundFx.playSelect();
    setEliminatedOpt(pick);
    setMageHintUsed(true);
    setBattleFeedback(`Arcane Hint menghilangkan Opsi ${pick} yang keliru.`);
  };

  const bossHueClass =
    province.Tipe_Boss === 'Leviathan'
      ? 'hue-rotate-180'
      : province.Tipe_Boss === 'Dragon'
        ? 'hue-rotate-30 saturate-150'
        : province.Tipe_Boss === 'Titan'
          ? '-hue-rotate-30 brightness-110'
          : '';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-3 sm:p-6">
      <div className="rpg-panel w-full max-w-3xl rounded-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Battle Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-amber-500/30 bg-slate-900/90">
          <div className="min-w-0">
            <p className="text-xs text-amber-300/90 font-medium truncate">
              {province.Nama_Provinsi} · {quest.Tipe_Quest === 'Boss' ? 'Sumatif Boss' : quest.Tipe_Quest}
            </p>
            <h2 className="font-display text-lg sm:text-xl font-bold text-slate-100 truncate">
              {quest.Judul_Quest}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Tutup Pertempuran"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* JRPG Visual Battle Stage */}
        <div className="relative px-5 py-4 bg-gradient-to-b from-[#0f172a] to-[#1e293b] border-b border-slate-700/80">
          <div className="grid grid-cols-2 gap-4 items-center">
            {/* Hero Side */}
            <div
              className={`flex items-center gap-3 p-3 rounded-lg bg-slate-900/75 border border-slate-700/80 transition-transform duration-150 ${
                hitFlash === 'hero' ? 'translate-x-1 bg-rose-950/60 border-rose-500' : ''
              }`}
            >
              <HeroAvatarPreview
                guild={user.Guild}
                gender={user.Gender}
                weaponTier={getWeaponTierForLevel(user.Level)}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                  <span className="text-slate-100 truncate">{user.Nama}</span>
                  <span className="font-mono-tabular text-emerald-400 shrink-0">HP {heroHp}/100</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${heroHp}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400 truncate">
                  {user.Guild} · {GUILD_PERKS[user.Guild].skillName}
                </p>
              </div>
            </div>

            {/* Enemy / Boss Side */}
            <div
              className={`flex items-center justify-end gap-3 p-3 rounded-lg bg-slate-900/75 border border-slate-700/80 transition-transform duration-150 ${
                hitFlash === 'boss' ? '-translate-x-1 bg-amber-950/60 border-amber-400' : ''
              }`}
            >
              <div className="min-w-0 flex-1 text-right">
                <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                  <span className="font-mono-tabular text-rose-400 shrink-0">HP {bossHp}/100</span>
                  <span className="text-amber-200 truncate">
                    {quest.Tipe_Quest === 'Boss' ? province.Elemen_Boss : 'Penjaga Segel'}
                  </span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-rose-500 transition-all duration-300"
                    style={{ width: `${bossHp}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400 truncate">
                  Soal {qIndex + 1} dari {questions.length} · KKM {province.KKM}
                </p>
              </div>
              <img
                src="/src/assets/images/boss_golem_sprite_1795414477873.jpg"
                alt={province.Elemen_Boss}
                referrerPolicy="no-referrer"
                className={`w-12 h-12 rounded-md object-cover border border-amber-500/40 pixelated shrink-0 ${bossHueClass}`}
              />
            </div>
          </div>

          {/* Battle Telemetry / Party Bar */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
            <span className="text-amber-200/95">{battleFeedback}</span>
            <div className="flex items-center gap-3 shrink-0">
              {partyId && (
                <span className="inline-flex items-center gap-1 text-sky-300">
                  <Users className="w-3.5 h-3.5" />
                  Party {partyId} ({partyMembers.length})
                </span>
              )}
              {!resultSummary && (
                <span className="inline-flex items-center gap-1 font-mono-tabular text-amber-300">
                  <Timer className="w-3.5 h-3.5" />
                  {timeLeft}s
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Question or Result Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {submitting ? (
            <div className="py-10 text-center text-slate-300 text-sm">
              Menyimpan skor ke database dan menghitung XP...
            </div>
          ) : resultSummary ? (
            <div className="space-y-4 text-center py-4">
              <p className="text-xs uppercase tracking-wider text-slate-400">Hasil Tantangan</p>
              <h3 className="font-display text-2xl font-bold text-amber-300">
                {resultSummary.questStatus}
              </h3>
              <div className="inline-flex items-baseline gap-2 px-6 py-3 rounded-lg bg-slate-900 border border-slate-700">
                <span className="text-sm text-slate-400">Skor Akhir:</span>
                <span className="font-mono-tabular text-3xl font-bold text-white">
                  {resultSummary.finalScore}
                </span>
                <span className="text-xs text-slate-400 font-mono-tabular">/ KKM {resultSummary.kkm}</span>
              </div>
              {quest.Tipe_Quest === 'Remedial' && (
                <p className="text-sm text-emerald-300 max-w-md mx-auto">
                  Side Quest Remedial selesai! Sesuai aturan KKM, nilai akhir Anda dipulihkan tepat di batas KKM ({resultSummary.kkm}).
                </p>
              )}
              {quest.Tipe_Quest === 'Boss' && !resultSummary.questStatus.startsWith('Lulus') && (
                <p className="text-sm text-amber-200 max-w-md mx-auto">
                  Skor belum mencapai KKM ({resultSummary.kkm}). NPC Pertapa Remedial kini muncul di peta provinsi ini untuk memulihkan nilai Anda!
                </p>
              )}
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-colors cursor-pointer"
                >
                  Kembali ke Provinsi
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <p className="text-xs text-slate-400">{quest.TP_Deskripsi}</p>
                <p className="text-base sm:text-lg font-medium text-white leading-relaxed">
                  {currentQ.Pertanyaan}
                </p>
              </div>

              {/* Guild Active/Passive Skill Ribbon */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 bg-slate-900/70 px-3 py-2 rounded-lg border border-slate-800">
                <span className="inline-flex items-center gap-1.5">
                  <Swords className="w-3.5 h-3.5 text-amber-400" />
                  {GUILD_PERKS[user.Guild].description}
                </span>
                {user.Guild === 'Mage' && (
                  <button
                    onClick={triggerMageArcaneHint}
                    disabled={mageHintUsed || lockedOption}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                      mageHintUsed
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-violet-600 hover:bg-violet-500 text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {mageHintUsed ? 'Arcane Hint Terpakai' : 'Gunakan Arcane Hint'}
                  </button>
                )}
                {user.Guild === 'Axeman' && quest.Tipe_Quest === 'Boss' && (
                  <span className="inline-flex items-center gap-1 text-orange-300">
                    <Shield className="w-3.5 h-3.5" />
                    {axemanShieldAvailable ? 'Heavy Shield Siap' : 'Shield Terpakai'}
                  </span>
                )}
              </div>

              {/* Multiple Choice Answers (>= 44px touch targets) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {OPTION_KEYS.map((optKey) => {
                  const optText = currentQ[`Opsi_${optKey}`];
                  const isEliminated = eliminatedOpt === optKey;
                  return (
                    <button
                      key={optKey}
                      onClick={() => handleSelectOption(optKey)}
                      disabled={lockedOption || isEliminated}
                      className={`min-h-[48px] text-left px-4 py-3 rounded-lg border text-sm transition-all flex items-start gap-3 cursor-pointer ${
                        isEliminated
                          ? 'bg-slate-900/30 border-slate-800 text-slate-600 line-through cursor-not-allowed'
                          : 'bg-slate-900/90 border-slate-700 hover:border-amber-400 hover:bg-slate-800 text-slate-100 active:scale-[0.99]'
                      }`}
                    >
                      <span className="font-mono-tabular font-bold text-amber-400 shrink-0">{optKey}.</span>
                      <span>{optText}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
