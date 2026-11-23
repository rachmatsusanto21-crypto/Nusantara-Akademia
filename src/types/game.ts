export type GuildType = 'Swordsman' | 'Archer' | 'Mage' | 'Axeman';
export type GenderType = 'Male' | 'Female';
export type UserRole = 'Siswa' | 'Guru';
export type WeaponTier = 'Bronze' | 'Silver' | 'Gold' | 'Mythic';
export type QuestType = 'Main' | 'Side' | 'Boss' | 'Remedial';
export type NilaiType = 'Formatif' | 'Sumatif' | 'Remedial';

export interface UserProfile {
  NISN: string;
  Nama: string;
  Role: UserRole;
  Guild: GuildType;
  Gender: GenderType;
  Level: number;
  XP: number;
  Piala: number;
  Diploma_URL?: string;
}

export interface ProvinceData {
  ID_Provinsi: string;
  Nama_Provinsi: string;
  Mata_Pelajaran: string;
  CP_Asli: string;
  Prolog_Cerita: string;
  Elemen_Boss: string;
  Tipe_Boss: 'Golem' | 'Leviathan' | 'Dragon' | 'Titan';
  KKM: number;
  MapX: number;
  MapY: number;
  Tema_Warna: string;
}

export interface QuestQuestion {
  Pertanyaan: string;
  Opsi_A: string;
  Opsi_B: string;
  Opsi_C: string;
  Opsi_D: string;
  Kunci: 'A' | 'B' | 'C' | 'D';
  Pembahasan?: string;
}

export interface QuestItem {
  ID_Quest: string;
  ID_Provinsi: string;
  Urutan_Linear: number;
  Judul_Quest: string;
  TP_Deskripsi: string;
  Tipe_Quest: QuestType;
  Poin: number;
  MapX: number;
  MapY: number;
  Pertanyaan: string;
  Opsi_A: string;
  Opsi_B: string;
  Opsi_C: string;
  Opsi_D: string;
  Kunci: 'A' | 'B' | 'C' | 'D';
  Soal_Tambahan?: QuestQuestion[];
}

export interface NilaiProgres {
  ID_Log: string;
  NISN: string;
  Nama?: string;
  ID_Provinsi: string;
  ID_Quest: string;
  Jenis_Nilai: NilaiType;
  Skor_Diperoleh: number;
  Status: string;
  Timestamp: string;
}

export interface ActivePlayerState {
  socketId: string;
  nisn: string;
  nama: string;
  guild: GuildType;
  gender: GenderType;
  level: number;
  weaponTier: WeaponTier;
  scene: string;
  x: number;
  y: number;
  status: string;
  partyId?: string;
}

export interface PartyMember {
  socketId: string;
  nisn: string;
  nama: string;
  guild: GuildType;
  level: number;
}

export const GUILD_PERKS: Record<
  GuildType,
  {
    title: string;
    skillName: string;
    description: string;
    accentHex: string;
    weaponLabel: string;
  }
> = {
  Swordsman: {
    title: 'Ksatria Pedang',
    skillName: 'Balanced Tempo',
    description: 'Bonus waktu pengerjaan soal +10% pada setiap tantangan.',
    accentHex: '#38BDF8',
    weaponLabel: 'Pedang Ksatria',
  },
  Archer: {
    title: 'Pemanah Fokus',
    skillName: 'Critical Focus',
    description: 'Bonus skor +15% saat menjawab benar 3x berturut-turut.',
    accentHex: '#34D399',
    weaponLabel: 'Busur Kristal',
  },
  Mage: {
    title: 'Penyihir Arkanik',
    skillName: 'Arcane Hint',
    description: 'Skill pasif menghilangkan 1 opsi jawaban salah secara otomatis.',
    accentHex: '#A78BFA',
    weaponLabel: 'Tongkat Arkanik',
  },
  Axeman: {
    title: 'Penjaga Kapak',
    skillName: 'Heavy Shield',
    description: 'Menahan 1x kesalahan fatal saat Boss Fight tanpa mengurangi HP.',
    accentHex: '#FB923C',
    weaponLabel: 'Kapak Pelindung',
  },
};

export function getWeaponTierForLevel(level: number): WeaponTier {
  if (level >= 10) return 'Mythic';
  if (level >= 6) return 'Gold';
  if (level >= 3) return 'Silver';
  return 'Bronze';
}
