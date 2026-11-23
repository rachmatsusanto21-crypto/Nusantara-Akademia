import { Printer, X } from 'lucide-react';
import { useState } from 'react';
import type { NilaiProgres, ProvinceData, UserProfile } from '../types/game';
import { GUILD_PERKS } from '../types/game';

interface RaporModalProps {
  user: UserProfile;
  provinces: ProvinceData[];
  nilai: NilaiProgres[];
  defaultTheme?: 'siswa' | 'guru';
  onClose: () => void;
}

export function RaporModal({
  user,
  provinces,
  nilai,
  defaultTheme = 'siswa',
  onClose,
}: RaporModalProps) {
  const [theme, setTheme] = useState<'siswa' | 'guru'>(defaultTheme);

  const studentLogs = nilai.filter((n) => n.NISN === user.NISN);
  const averageScore =
    studentLogs.length > 0
      ? Math.round(studentLogs.reduce((acc, n) => acc + Number(n.Skor_Diperoleh), 0) / studentLogs.length)
      : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-xl overflow-hidden flex flex-col max-h-[92vh] print-only-container">
        {/* Non-print toolbar */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-1 p-1 bg-slate-800 rounded-lg">
            <button
              onClick={() => setTheme('siswa')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                theme === 'siswa' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              Versi Siswa (RPG Scroll)
            </button>
            <button
              onClick={() => setTheme('guru')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                theme === 'guru' ? 'bg-white text-slate-900' : 'text-slate-300 hover:text-white'
              }`}
            >
              Versi Guru (Tabel Akademik)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Cetak Rapor A4
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              aria-label="Tutup Rapor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable A4 Content */}
        <div className="p-6 overflow-y-auto bg-slate-950 print:bg-white print:p-0">
          {theme === 'siswa' ? (
            <div className="rpg-parchment p-6 sm:p-8 rounded-lg max-w-3xl mx-auto space-y-6">
              <div className="text-center border-b-2 border-[#7c5827] pb-4">
                <p className="text-xs tracking-widest uppercase text-[#7c5827]">
                  Catatan Petualangan Akademik
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#292014] mt-1">
                  Gulungan Rapor Nusantara Akademia
                </h2>
                <p className="text-sm text-[#574224] mt-1">
                  {user.Nama} · NISN {user.NISN} · Guild {user.Guild} ({GUILD_PERKS[user.Guild].title})
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 rounded border border-[#b48a3e] bg-[#fef9eb]">
                  <p className="text-xs text-[#7c5827]">Peringkat Level</p>
                  <p className="font-mono-tabular text-2xl font-bold">{user.Level}</p>
                </div>
                <div className="p-3 rounded border border-[#b48a3e] bg-[#fef9eb]">
                  <p className="text-xs text-[#7c5827]">Piala Provinsi</p>
                  <p className="font-mono-tabular text-2xl font-bold">
                    {user.Piala}/{provinces.length}
                  </p>
                </div>
                <div className="p-3 rounded border border-[#b48a3e] bg-[#fef9eb]">
                  <p className="text-xs text-[#7c5827]">Rata-rata Skor</p>
                  <p className="font-mono-tabular text-2xl font-bold">{averageScore}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-display text-base font-bold text-[#451a03]">
                  Riwayat Formatif & Sumatif
                </h3>
                {studentLogs.length === 0 ? (
                  <p className="text-sm text-[#78350f]">Belum ada catatan tantangan yang diselesaikan.</p>
                ) : (
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b-2 border-[#7c5827] text-left">
                        <th className="py-2 pr-3">Provinsi</th>
                        <th className="py-2 pr-3">Quest</th>
                        <th className="py-2 pr-3">Jenis</th>
                        <th className="py-2 pr-3 text-right">Skor</th>
                        <th className="py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentLogs.map((log) => (
                        <tr key={log.ID_Log} className="border-b border-[#d6c299]">
                          <td className="py-2 pr-3">{log.ID_Provinsi}</td>
                          <td className="py-2 pr-3 font-mono-tabular">{log.ID_Quest}</td>
                          <td className="py-2 pr-3">{log.Jenis_Nilai}</td>
                          <td className="py-2 pr-3 text-right font-mono-tabular font-bold">
                            {log.Skor_Diperoleh}
                          </td>
                          <td className="py-2">{log.Status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white text-black p-6 sm:p-8 max-w-3xl mx-auto border border-slate-300 space-y-5">
              {/* Formal Academic Kop Sekolah */}
              <div className="text-center border-b-2 border-black pb-3">
                <p className="text-xs uppercase tracking-wider">
                  Laporan Hasil Belajar Digital · Nusantara Akademia
                </p>
                <h2 className="text-xl font-bold mt-1">REKAPITULASI NILAI FORMATIF & SUMATIF</h2>
                <p className="text-xs text-slate-700 mt-1">
                  Nama Peserta Didik: <strong>{user.Nama}</strong> · NISN: <strong>{user.NISN}</strong> ·
                  Rata-rata: <strong>{averageScore}</strong>
                </p>
              </div>

              <table className="w-full text-xs border-collapse border border-black">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-black px-2 py-1.5 text-left">No</th>
                    <th className="border border-black px-2 py-1.5 text-left">Provinsi / Mapel</th>
                    <th className="border border-black px-2 py-1.5 text-left">Kode TP / Quest</th>
                    <th className="border border-black px-2 py-1.5 text-left">Jenis Nilai</th>
                    <th className="border border-black px-2 py-1.5 text-right">Skor</th>
                    <th className="border border-black px-2 py-1.5 text-left">Keterangan KKM</th>
                  </tr>
                </thead>
                <tbody>
                  {studentLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="border border-black px-2 py-4 text-center">
                        Belum ada data nilai terekam.
                      </td>
                    </tr>
                  ) : (
                    studentLogs.map((log, idx) => (
                      <tr key={log.ID_Log}>
                        <td className="border border-black px-2 py-1.5 font-mono-tabular">{idx + 1}</td>
                        <td className="border border-black px-2 py-1.5">{log.ID_Provinsi}</td>
                        <td className="border border-black px-2 py-1.5 font-mono-tabular">{log.ID_Quest}</td>
                        <td className="border border-black px-2 py-1.5">{log.Jenis_Nilai}</td>
                        <td className="border border-black px-2 py-1.5 text-right font-mono-tabular font-semibold">
                          {log.Skor_Diperoleh}
                        </td>
                        <td className="border border-black px-2 py-1.5">{log.Status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div className="pt-6 flex justify-between text-xs">
                <div>
                  <p>Dicetak dari Server Sekolah Lokal</p>
                  <p className="text-slate-600">{new Date().toLocaleDateString('id-ID')}</p>
                </div>
                <div className="text-right">
                  <p>Mengetahui, Guru Mata Pelajaran</p>
                  <p className="mt-10 font-semibold underline">__________________________</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
