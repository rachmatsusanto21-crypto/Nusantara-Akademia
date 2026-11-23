import { Download, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { UserProfile } from '../types/game';
import { getWeaponTierForLevel, GUILD_PERKS } from '../types/game';

interface DiplomaModalProps {
  user: UserProfile;
  totalProvinces: number;
  onClose: () => void;
}

export function DiplomaModal({ user, totalProvinces, onClose }: DiplomaModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width;
    const h = canvas.height;

    // Classic Parchment Background
    ctx.fillStyle = '#FDF6E3';
    ctx.fillRect(0, 0, w, h);

    // Ornate Outer & Inner Double RPG Gold Border
    ctx.strokeStyle = '#7C5827';
    ctx.lineWidth = 8;
    ctx.strokeRect(18, 18, w - 36, h - 36);

    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, w - 60, h - 60);

    // Corner Pixel Seals
    const corners = [
      [30, 30],
      [w - 46, 30],
      [30, h - 46],
      [w - 46, h - 46],
    ];
    ctx.fillStyle = '#B45309';
    corners.forEach(([cx, cy]) => ctx.fillRect(cx, cy, 16, 16));

    // Title
    ctx.fillStyle = '#451A03';
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px Georgia, serif';
    ctx.fillText('DIPLOMA KERAJAAN NUSANTARA AKADEMIA', w / 2, 96);

    ctx.fillStyle = '#78350F';
    ctx.font = '15px sans-serif';
    ctx.fillText('SERTIFIKAT KELULUSAN RESMI LINTAS PROVINSI KURIKULUM', w / 2, 126);

    // Divider line
    ctx.strokeStyle = '#B45309';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(140, 144);
    ctx.lineTo(w - 140, 144);
    ctx.stroke();

    // Recipient
    ctx.fillStyle = '#57534E';
    ctx.font = '16px sans-serif';
    ctx.fillText('Diberikan dengan penuh kehormatan kepada:', w / 2, 186);

    ctx.fillStyle = '#1C1917';
    ctx.font = 'bold 34px Georgia, serif';
    ctx.fillText(user.Nama.toUpperCase(), w / 2, 232);

    ctx.fillStyle = '#78350F';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`NISN: ${user.NISN}  |  GUILD: ${user.Guild.toUpperCase()} (${GUILD_PERKS[user.Guild].title})`, w / 2, 266);

    // Stats Box
    ctx.fillStyle = '#FEF3C7';
    ctx.fillRect(140, 294, w - 280, 68);
    ctx.strokeStyle = '#D97706';
    ctx.strokeRect(140, 294, w - 280, 68);

    ctx.fillStyle = '#451A03';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(
      `Peringkat Level ${user.Level}  ·  Senjata ${getWeaponTierForLevel(user.Level)}  ·  ${user.Piala}/${totalProvinces} Piala Provinsi`,
      w / 2,
      334
    );

    // Footer & Signature
    ctx.fillStyle = '#44403C';
    ctx.font = '14px sans-serif';
    ctx.fillText(
      'Telah menaklukkan seluruh Boss Elemen dan memenuhi Kriteria Ketuntasan Minimal (KKM).',
      w / 2,
      398
    );

    const dateStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    ctx.textAlign = 'left';
    ctx.font = '14px sans-serif';
    ctx.fillText(`Diterbitkan: ${dateStr}`, 80, 465);

    ctx.textAlign = 'right';
    ctx.fillText('Kepala Akademi & Wali Kelas', w - 80, 446);
    ctx.font = 'italic bold 18px Georgia, serif';
    ctx.fillStyle = '#78350F';
    ctx.fillText('Dewan Guru Nusantara Akademia', w - 80, 474);
  }, [user, totalProvinces]);

  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `Diploma_Nusantara_Akademia_${user.NISN}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4">
      <div className="rpg-panel w-full max-w-4xl rounded-xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-5 py-3 border-b border-amber-500/30 bg-slate-900">
          <h2 className="font-display text-lg font-bold text-amber-300">
            Diploma Kerajaan Nusantara Akademia
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            aria-label="Tutup Diploma"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-auto flex flex-col items-center gap-4 bg-slate-950">
          <canvas
            ref={canvasRef}
            width={880}
            height={520}
            className="w-full max-w-3xl h-auto rounded shadow-2xl border border-amber-700/40"
          />
          <button
            onClick={handleDownloadPng}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Unduh Diploma (.PNG)
          </button>
        </div>
      </div>
    </div>
  );
}
