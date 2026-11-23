// Konverter Template Capaian Pembelajaran (CP) menjadi Prolog Narasi Fantasi JRPG
export function convertCpToFantasyProlog(
  namaProvinsi: string,
  cpAsli: string,
  elemenBoss: string
): string {
  const cleanCp = cpAsli.trim();
  const cleanBoss = elemenBoss.trim() || 'Penjaga Segel Kuno';
  const cleanProv = namaProvinsi.trim() || 'Provinsi Nusantara';

  if (!cleanCp) {
    return `Kabut misterius menyelimuti ${cleanProv}. Segel kristal pengetahuan melemah di bawah kendali ${cleanBoss}.`;
  }

  return `Kabut misterius menyelimuti langit ${cleanProv}! Gulungan kuno bertuliskan "${cleanCp}" telah terpecah menjadi fragmen cahaya oleh ${cleanBoss}. Para petualang Nusantara Akademia harus menyusuri jalur pengetahuan, menyelaraskan setiap Tujuan Pembelajaran, dan memulihkan kristal utama provinsi ini!`;
}
