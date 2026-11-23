import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type {
  GenderType,
  GuildType,
  NilaiProgres,
  NilaiType,
  ProvinceData,
  QuestItem,
  UserProfile,
} from '../src/types/game.js';

interface StoredUser extends UserProfile {
  passwordHash: string;
}

interface DatabaseSchema {
  adminCredentialHash: string | null;
  gasWebAppUrl: string;
  users: StoredUser[];
  provinces: ProvinceData[];
  quests: QuestItem[];
  nilai: NilaiProgres[];
}

const DATA_FILE = path.resolve(process.cwd(), 'server', 'data-store.json');

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derived = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derived.length) return false;
  return crypto.timingSafeEqual(keyBuf, derived);
}

const INITIAL_PROVINCES: ProvinceData[] = [
  {
    ID_Provinsi: 'PROV_MTK',
    Nama_Provinsi: 'Provinsi Aljabar',
    Mata_Pelajaran: 'Matematika · Bilangan & Aljabar',
    CP_Asli: 'Memahami dan menyelesaikan sistem persamaan linear dua variabel serta operasi aljabar.',
    Prolog_Cerita:
      'Kabut angka misterius menyelimuti Lembah Aljabar! Segel kristal dua variabel dipecah oleh Golem Aritmatika. Satukan persamaan untuk membuka gerbang kastil!',
    Elemen_Boss: 'Golem Aritmatika',
    Tipe_Boss: 'Golem',
    KKM: 75,
    MapX: 195,
    MapY: 135,
    Tema_Warna: '#10B981',
  },
  {
    ID_Provinsi: 'PROV_IPA',
    Nama_Provinsi: 'Provinsi Biolumina',
    Mata_Pelajaran: 'IPA Biologi · Ekosistem & Sel',
    CP_Asli: 'Menganalisis interaksi makhluk hidup dalam ekosistem, fotosintesis, serta struktur organel sel.',
    Prolog_Cerita:
      'Hutan cahaya Biolumina meredup! Leviathan Klorofil mengganggu rantai makanan dan aliran energi sel tumbuhan. Pulihkan keseimbangan alam!',
    Elemen_Boss: 'Leviathan Klorofil',
    Tipe_Boss: 'Leviathan',
    KKM: 75,
    MapX: 590,
    MapY: 135,
    Tema_Warna: '#38BDF8',
  },
  {
    ID_Provinsi: 'PROV_GEO',
    Nama_Provinsi: 'Provinsi Piramida Dimensi',
    Mata_Pelajaran: 'Matematika · Geometri & Pengukuran',
    CP_Asli: 'Menghitung luas permukaan, volume bangun ruang, serta menerapkan teorema Pythagoras.',
    Prolog_Cerita:
      'Piramida emas di gurun selatan mulai bergeser dari porosnya karena amarah Naga Dimensi! Hitung sudut dan volumenya untuk menstabilkan pilar waktu.',
    Elemen_Boss: 'Naga Dimensi',
    Tipe_Boss: 'Dragon',
    KKM: 75,
    MapX: 600,
    MapY: 325,
    Tema_Warna: '#F59E0B',
  },
  {
    ID_Provinsi: 'PROV_FIS',
    Nama_Provinsi: 'Provinsi Kawah Termo',
    Mata_Pelajaran: 'IPA Fisika · Energi & Kalor',
    CP_Asli: 'Menjelaskan konsep kalor, perpindahan energi panas, serta hukum kekekalan energi mekanik.',
    Prolog_Cerita:
      'Gunung api Kawah Termo bergejolak oleh Titan Termodinamika! Kendalikan konduksi, konveksi, dan radiasi sebelum magma membanjiri kepulauan.',
    Elemen_Boss: 'Titan Termodinamika',
    Tipe_Boss: 'Titan',
    KKM: 75,
    MapX: 205,
    MapY: 320,
    Tema_Warna: '#FB7185',
  },
];

const INITIAL_QUESTS: QuestItem[] = [
  // PROV_MTK
  {
    ID_Quest: 'MTK_Q1',
    ID_Provinsi: 'PROV_MTK',
    Urutan_Linear: 1,
    Judul_Quest: 'Gerbang Persamaan Tunggal',
    TP_Deskripsi: 'TP 1: Menentukan nilai variabel pada persamaan linear satu variabel.',
    Tipe_Quest: 'Main',
    Poin: 100,
    MapX: 165,
    MapY: 335,
    Pertanyaan: 'Jika 3x + 7 = 22, berapakah nilai kristal x untuk membuka gerbang pertama?',
    Opsi_A: '3',
    Opsi_B: '5',
    Opsi_C: '7',
    Opsi_D: '15',
    Kunci: 'B',
    Soal_Tambahan: [
      {
        Pertanyaan: 'Diketahui 2y - 4 = 10. Berapakah nilai y?',
        Opsi_A: '5',
        Opsi_B: '6',
        Opsi_C: '7',
        Opsi_D: '8',
        Kunci: 'C',
      },
    ],
  },
  {
    ID_Quest: 'MTK_Q2',
    ID_Provinsi: 'PROV_MTK',
    Urutan_Linear: 2,
    Judul_Quest: 'Jembatan Dua Variabel',
    TP_Deskripsi: 'TP 2: Menyelesaikan sistem persamaan linear dua variabel sederhana.',
    Tipe_Quest: 'Main',
    Poin: 100,
    MapX: 350,
    MapY: 270,
    Pertanyaan: 'Jika x + y = 12 dan x - y = 4, berapakah nilai x dan y berturut-turut?',
    Opsi_A: 'x = 8, y = 4',
    Opsi_B: 'x = 7, y = 5',
    Opsi_C: 'x = 9, y = 3',
    Opsi_D: 'x = 6, y = 6',
    Kunci: 'A',
    Soal_Tambahan: [
      {
        Pertanyaan: 'Harga 2 buku dan 1 pensil adalah Rp11.000. Jika harga 1 pensil Rp3.000, berapakah harga 1 buku?',
        Opsi_A: 'Rp3.500',
        Opsi_B: 'Rp4.000',
        Opsi_C: 'Rp4.500',
        Opsi_D: 'Rp5.000',
        Kunci: 'B',
      },
    ],
  },
  {
    ID_Quest: 'MTK_SIDE',
    ID_Provinsi: 'PROV_MTK',
    Urutan_Linear: 0,
    Judul_Quest: 'Peti Sandi Aritmatika',
    TP_Deskripsi: 'Side Quest: Latihan pola bilangan untuk bonus XP & upgrade senjata.',
    Tipe_Quest: 'Side',
    Poin: 100,
    MapX: 215,
    MapY: 165,
    Pertanyaan: 'Lanjutkan barisan pola kristal berikut: 2, 6, 12, 20, 30, ...',
    Opsi_A: '38',
    Opsi_B: '40',
    Opsi_C: '42',
    Opsi_D: '44',
    Kunci: 'C',
  },
  {
    ID_Quest: 'MTK_BOSS',
    ID_Provinsi: 'PROV_MTK',
    Urutan_Linear: 3,
    Judul_Quest: 'Boss: Golem Aritmatika',
    TP_Deskripsi: 'Sumatif Elemen Aljabar & Bilangan: Mengalahkan Golem Aritmatika (KKM 75).',
    Tipe_Quest: 'Boss',
    Poin: 100,
    MapX: 675,
    MapY: 120,
    Pertanyaan: 'Serangan Inti! Nilai dari 2(3x - 4) + 5 untuk x = 4 adalah...',
    Opsi_A: '19',
    Opsi_B: '21',
    Opsi_C: '23',
    Opsi_D: '25',
    Kunci: 'B',
    Soal_Tambahan: [
      {
        Pertanyaan: 'Jika 4a + 2b = 20 dan a = 3, berapakah nilai b?',
        Opsi_A: '2',
        Opsi_B: '4',
        Opsi_C: '6',
        Opsi_D: '8',
        Kunci: 'B',
      },
      {
        Pertanyaan: 'Hasil penyederhanaan dari (5x + 3y) - (2x - y) adalah...',
        Opsi_A: '3x + 2y',
        Opsi_B: '3x + 4y',
        Opsi_C: '7x + 2y',
        Opsi_D: '3x - 4y',
        Kunci: 'B',
      },
      {
        Pertanyaan: 'Sebuah taman persegi panjang memiliki keliling 36 m. Jika panjangnya 10 m, berapakah lebarnya?',
        Opsi_A: '6 m',
        Opsi_B: '8 m',
        Opsi_C: '10 m',
        Opsi_D: '12 m',
        Kunci: 'B',
      },
    ],
  },
  {
    ID_Quest: 'MTK_REM',
    ID_Provinsi: 'PROV_MTK',
    Urutan_Linear: 99,
    Judul_Quest: 'Misi Pemulihan Pertapa Aljabar',
    TP_Deskripsi: 'Side Quest Remedial: Memulihkan nilai Sumatif tepat ke batas KKM (75).',
    Tipe_Quest: 'Remedial',
    Poin: 75,
    MapX: 540,
    MapY: 325,
    Pertanyaan: 'Jika x + 8 = 15, maka nilai x yang tepat adalah...',
    Opsi_A: '5',
    Opsi_B: '6',
    Opsi_C: '7',
    Opsi_D: '8',
    Kunci: 'C',
  },

  // PROV_IPA
  {
    ID_Quest: 'IPA_Q1',
    ID_Provinsi: 'PROV_IPA',
    Urutan_Linear: 1,
    Judul_Quest: 'Misteri Organel Sel',
    TP_Deskripsi: 'TP 1: Mengidentifikasi fungsi organel utama pada sel tumbuhan dan hewan.',
    Tipe_Quest: 'Main',
    Poin: 100,
    MapX: 165,
    MapY: 335,
    Pertanyaan: 'Organel sel yang berfungsi sebagai tempat berlangsungnya fotosintesis pada tumbuhan adalah...',
    Opsi_A: 'Mitokondria',
    Opsi_B: 'Kloroplas',
    Opsi_C: 'Ribosom',
    Opsi_D: 'Lisosom',
    Kunci: 'B',
    Soal_Tambahan: [
      {
        Pertanyaan: 'Pusat pengendali seluruh aktivitas sel yang menyimpan materi genetik disebut...',
        Opsi_A: 'Nukleus',
        Opsi_B: 'Vakuola',
        Opsi_C: 'Sitoplasma',
        Opsi_D: 'Dinding sel',
        Kunci: 'A',
      },
    ],
  },
  {
    ID_Quest: 'IPA_Q2',
    ID_Provinsi: 'PROV_IPA',
    Urutan_Linear: 2,
    Judul_Quest: 'Jaring Kehidupan Hutan',
    TP_Deskripsi: 'TP 2: Menganalisis peran produsen, konsumen, dan dekomposer dalam ekosistem.',
    Tipe_Quest: 'Main',
    Poin: 100,
    MapX: 350,
    MapY: 270,
    Pertanyaan: 'Dalam rantai makanan sawah: Padi -> Belalang -> Katak -> Ular. Yang berperan sebagai konsumen tingkat II adalah...',
    Opsi_A: 'Padi',
    Opsi_B: 'Belalang',
    Opsi_C: 'Katak',
    Opsi_D: 'Ular',
    Kunci: 'C',
  },
  {
    ID_Quest: 'IPA_SIDE',
    ID_Provinsi: 'PROV_IPA',
    Urutan_Linear: 0,
    Judul_Quest: 'Ramuan Simbiosis Hutan',
    TP_Deskripsi: 'Side Quest: Menentukan bentuk simbiosis untuk bonus XP Guild.',
    Tipe_Quest: 'Side',
    Poin: 100,
    MapX: 215,
    MapY: 165,
    Pertanyaan: 'Hubungan antara lebah madu dan bunga yang saling menguntungkan disebut simbiosis...',
    Opsi_A: 'Parasitisme',
    Opsi_B: 'Komensalisme',
    Opsi_C: 'Mutualisme',
    Opsi_D: 'Amensalisme',
    Kunci: 'C',
  },
  {
    ID_Quest: 'IPA_BOSS',
    ID_Provinsi: 'PROV_IPA',
    Urutan_Linear: 3,
    Judul_Quest: 'Boss: Leviathan Klorofil',
    TP_Deskripsi: 'Sumatif Elemen Ekosistem & Sel: Menjinakkan Leviathan Klorofil (KKM 75).',
    Tipe_Quest: 'Boss',
    Poin: 100,
    MapX: 675,
    MapY: 120,
    Pertanyaan: 'Gas yang dilepaskan tumbuhan sebagai hasil samping fotosintesis yang sangat dibutuhkan makhluk hidup adalah...',
    Opsi_A: 'Karbon dioksida',
    Opsi_B: 'Nitrogen',
    Opsi_C: 'Oksigen',
    Opsi_D: 'Metana',
    Kunci: 'C',
    Soal_Tambahan: [
      {
        Pertanyaan: 'Organisme pengurai yang menguraikan sisa makhluk hidup menjadi zat hara adalah...',
        Opsi_A: 'Herbivora',
        Opsi_B: 'Dekomposer (Bakteri & Jamur)',
        Opsi_C: 'Produsen',
        Opsi_D: 'Karnivora',
        Kunci: 'B',
      },
      {
        Pertanyaan: 'Bagian sel yang hanya dimiliki oleh sel tumbuhan untuk menjaga kekakuan bentuk sel adalah...',
        Opsi_A: 'Membran plasma',
        Opsi_B: 'Dinding sel',
        Opsi_C: 'Badan Golgi',
        Opsi_D: 'Mitokondria',
        Kunci: 'B',
      },
      {
        Pertanyaan: 'Komponen abiotik dalam ekosistem kolam air tawar meliputi...',
        Opsi_A: 'Ikan, lumut, dan teratai',
        Opsi_B: 'Air, cahaya matahari, dan suhu',
        Opsi_C: 'Katak, capung, dan siput',
        Opsi_D: 'Bakteri, alga, dan udang',
        Kunci: 'B',
      },
    ],
  },
  {
    ID_Quest: 'IPA_REM',
    ID_Provinsi: 'PROV_IPA',
    Urutan_Linear: 99,
    Judul_Quest: 'Pemulihan Benih Biolumina',
    TP_Deskripsi: 'Side Quest Remedial: Memulihkan nilai Sumatif tepat ke batas KKM (75).',
    Tipe_Quest: 'Remedial',
    Poin: 75,
    MapX: 540,
    MapY: 325,
    Pertanyaan: 'Proses tumbuhan hijau membuat makanannya sendiri dengan bantuan cahaya matahari disebut...',
    Opsi_A: 'Respirasi',
    Opsi_B: 'Fotosintesis',
    Opsi_C: 'Transpirasi',
    Opsi_D: 'Fermentasi',
    Kunci: 'B',
  },

  // PROV_GEO
  {
    ID_Quest: 'GEO_Q1',
    ID_Provinsi: 'PROV_GEO',
    Urutan_Linear: 1,
    Judul_Quest: 'Segitiga Penjaga Piramida',
    TP_Deskripsi: 'TP 1: Menerapkan teorema Pythagoras pada segitiga siku-siku.',
    Tipe_Quest: 'Main',
    Poin: 100,
    MapX: 165,
    MapY: 335,
    Pertanyaan: 'Segitiga siku-siku memiliki sisi alas 6 cm dan tinggi 8 cm. Berapakah panjang sisi miringnya?',
    Opsi_A: '10 cm',
    Opsi_B: '12 cm',
    Opsi_C: '14 cm',
    Opsi_D: '16 cm',
    Kunci: 'A',
  },
  {
    ID_Quest: 'GEO_Q2',
    ID_Provinsi: 'PROV_GEO',
    Urutan_Linear: 2,
    Judul_Quest: 'Ruang Kubus Suci',
    TP_Deskripsi: 'TP 2: Menghitung volume dan luas permukaan kubus serta balok.',
    Tipe_Quest: 'Main',
    Poin: 100,
    MapX: 350,
    MapY: 270,
    Pertanyaan: 'Sebuah peti relik berbentuk kubus memiliki panjang rusuk 5 cm. Berapakah volumenya?',
    Opsi_A: '25 cm³',
    Opsi_B: '100 cm³',
    Opsi_C: '125 cm³',
    Opsi_D: '150 cm³',
    Kunci: 'C',
  },
  {
    ID_Quest: 'GEO_SIDE',
    ID_Provinsi: 'PROV_GEO',
    Urutan_Linear: 0,
    Judul_Quest: 'Kompas Sudut Gurun',
    TP_Deskripsi: 'Side Quest: Menentukan besar sudut dalam bangun datar.',
    Tipe_Quest: 'Side',
    Poin: 100,
    MapX: 215,
    MapY: 165,
    Pertanyaan: 'Berapakah jumlah total ketiga sudut dalam sebuah segitiga?',
    Opsi_A: '90°',
    Opsi_B: '180°',
    Opsi_C: '270°',
    Opsi_D: '360°',
    Kunci: 'B',
  },
  {
    ID_Quest: 'GEO_BOSS',
    ID_Provinsi: 'PROV_GEO',
    Urutan_Linear: 3,
    Judul_Quest: 'Boss: Naga Dimensi',
    TP_Deskripsi: 'Sumatif Elemen Geometri: Menaklukkan Naga Dimensi (KKM 75).',
    Tipe_Quest: 'Boss',
    Poin: 100,
    MapX: 675,
    MapY: 120,
    Pertanyaan: 'Berapakah luas permukaan sebuah kubus yang memiliki panjang rusuk 4 cm?',
    Opsi_A: '64 cm²',
    Opsi_B: '84 cm²',
    Opsi_C: '96 cm²',
    Opsi_D: '112 cm²',
    Kunci: 'C',
    Soal_Tambahan: [
      {
        Pertanyaan: 'Sebuah balok berukuran panjang 10 cm, lebar 4 cm, dan tinggi 3 cm. Berapakah volumenya?',
        Opsi_A: '60 cm³',
        Opsi_B: '90 cm³',
        Opsi_C: '120 cm³',
        Opsi_D: '140 cm³',
        Kunci: 'C',
      },
      {
        Pertanyaan: 'Manakah pasangan bilangan berikut yang merupakan tripel Pythagoras?',
        Opsi_A: '3, 4, 6',
        Opsi_B: '5, 12, 13',
        Opsi_C: '6, 8, 12',
        Opsi_D: '7, 8, 10',
        Kunci: 'B',
      },
      {
        Pertanyaan: 'Keliling persegi dengan luas 81 cm² adalah...',
        Opsi_A: '18 cm',
        Opsi_B: '27 cm',
        Opsi_C: '36 cm',
        Opsi_D: '45 cm',
        Kunci: 'C',
      },
    ],
  },
  {
    ID_Quest: 'GEO_REM',
    ID_Provinsi: 'PROV_GEO',
    Urutan_Linear: 99,
    Judul_Quest: 'Penyelarasan Pilar Dimensi',
    TP_Deskripsi: 'Side Quest Remedial: Memulihkan nilai Sumatif tepat ke batas KKM (75).',
    Tipe_Quest: 'Remedial',
    Poin: 75,
    MapX: 540,
    MapY: 325,
    Pertanyaan: 'Sebuah persegi panjang memiliki panjang 12 cm dan lebar 5 cm. Berapakah luasnya?',
    Opsi_A: '34 cm²',
    Opsi_B: '48 cm²',
    Opsi_C: '60 cm²',
    Opsi_D: '72 cm²',
    Kunci: 'C',
  },

  // PROV_FIS
  {
    ID_Quest: 'FIS_Q1',
    ID_Provinsi: 'PROV_FIS',
    Urutan_Linear: 1,
    Judul_Quest: 'Jembatan Konduksi Panas',
    TP_Deskripsi: 'TP 1: Membedakan perpindahan kalor secara konduksi, konveksi, dan radiasi.',
    Tipe_Quest: 'Main',
    Poin: 100,
    MapX: 165,
    MapY: 335,
    Pertanyaan: 'Perpindahan panas matahari hingga sampai ke permukaan bumi melalui ruang hampa terjadi secara...',
    Opsi_A: 'Konduksi',
    Opsi_B: 'Konveksi',
    Opsi_C: 'Radiasi',
    Opsi_D: 'Isolasi',
    Kunci: 'C',
  },
  {
    ID_Quest: 'FIS_Q2',
    ID_Provinsi: 'PROV_FIS',
    Urutan_Linear: 2,
    Judul_Quest: 'Kalibrasi Energi Kinetik',
    TP_Deskripsi: 'TP 2: Menganalisis perubahan energi kinetik dan potensial.',
    Tipe_Quest: 'Main',
    Poin: 100,
    MapX: 350,
    MapY: 270,
    Pertanyaan: 'Saat batu dijatuhkan dari puncak tebing kawah, perubahan energi yang terjadi adalah...',
    Opsi_A: 'Energi kinetik menjadi energi potensial',
    Opsi_B: 'Energi potensial menjadi energi kinetik',
    Opsi_C: 'Energi kimia menjadi energi nuklir',
    Opsi_D: 'Energi listrik menjadi energi bunyi',
    Kunci: 'B',
  },
  {
    ID_Quest: 'FIS_SIDE',
    ID_Provinsi: 'PROV_FIS',
    Urutan_Linear: 0,
    Judul_Quest: 'Tempaan Logam Konduktor',
    TP_Deskripsi: 'Side Quest: Mengenal bahan konduktor dan isolator panas.',
    Tipe_Quest: 'Side',
    Poin: 100,
    MapX: 215,
    MapY: 165,
    Pertanyaan: 'Manakah benda berikut yang termasuk isolator panas yang baik untuk gagang panci?',
    Opsi_A: 'Tembaga',
    Opsi_B: 'Aluminium',
    Opsi_C: 'Kayu atau plastik ebonit',
    Opsi_D: 'Besi baja',
    Kunci: 'C',
  },
  {
    ID_Quest: 'FIS_BOSS',
    ID_Provinsi: 'PROV_FIS',
    Urutan_Linear: 3,
    Judul_Quest: 'Boss: Titan Termodinamika',
    TP_Deskripsi: 'Sumatif Elemen Energi & Kalor: Menahan amukan Titan Termodinamika (KKM 75).',
    Tipe_Quest: 'Boss',
    Poin: 100,
    MapX: 675,
    MapY: 120,
    Pertanyaan: 'Jika 2 kg air dipanaskan dari 20°C menjadi 30°C (kalor jenis air = 4.200 J/kg°C), kalor yang dibutuhkan adalah...',
    Opsi_A: '42.000 J',
    Opsi_B: '84.000 J',
    Opsi_C: '126.000 J',
    Opsi_D: '168.000 J',
    Kunci: 'B',
    Soal_Tambahan: [
      {
        Pertanyaan: 'Air yang mendidih dalam panci berputar naik dan turun. Peristiwa ini merupakan perpindahan kalor secara...',
        Opsi_A: 'Konduksi',
        Opsi_B: 'Konveksi',
        Opsi_C: 'Radiasi',
        Opsi_D: 'Sublimasi',
        Kunci: 'B',
      },
      {
        Pertanyaan: 'Satuan Internasional (SI) untuk besaran energi dan kalor adalah...',
        Opsi_A: 'Watt',
        Opsi_B: 'Newton',
        Opsi_C: 'Joule',
        Opsi_D: 'Kelvin',
        Kunci: 'C',
      },
      {
        Pertanyaan: 'Suhu air 25°C jika dinyatakan dalam skala Kelvin adalah...',
        Opsi_A: '248 K',
        Opsi_B: '273 K',
        Opsi_C: '298 K',
        Opsi_D: '318 K',
        Kunci: 'C',
      },
    ],
  },
  {
    ID_Quest: 'FIS_REM',
    ID_Provinsi: 'PROV_FIS',
    Urutan_Linear: 99,
    Judul_Quest: 'Pendinginan Inti Termo',
    TP_Deskripsi: 'Side Quest Remedial: Memulihkan nilai Sumatif tepat ke batas KKM (75).',
    Tipe_Quest: 'Remedial',
    Poin: 75,
    MapX: 540,
    MapY: 325,
    Pertanyaan: 'Sendok logam terasa panas ketika ujungnya dicelupkan ke teh panas. Peristiwa ini disebut...',
    Opsi_A: 'Konduksi',
    Opsi_B: 'Konveksi',
    Opsi_C: 'Radiasi',
    Opsi_D: 'Evaporasi',
    Kunci: 'A',
  },
];

// Demo student sample rows (only progress metadata for initial teacher view, no hardcoded credentials)
const INITIAL_NILAI: NilaiProgres[] = [];

class GameStore {
  private db: DatabaseSchema;

  constructor() {
    this.db = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;
        return {
          adminCredentialHash: parsed.adminCredentialHash ?? null,
          gasWebAppUrl: parsed.gasWebAppUrl ?? process.env.GAS_WEB_APP_URL ?? '',
          users: parsed.users ?? [],
          provinces: parsed.provinces?.length ? parsed.provinces : INITIAL_PROVINCES,
          quests: parsed.quests?.length ? parsed.quests : INITIAL_QUESTS,
          nilai: parsed.nilai ?? INITIAL_NILAI,
        };
      }
    } catch {
      // Fall back to default seeded state if file is unreadable
    }

    return {
      adminCredentialHash: null,
      gasWebAppUrl: process.env.GAS_WEB_APP_URL ?? '',
      users: [],
      provinces: INITIAL_PROVINCES,
      quests: INITIAL_QUESTS,
      nilai: INITIAL_NILAI,
    };
  }

  private persist(): void {
    try {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmp = `${DATA_FILE}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.db, null, 2), 'utf-8');
      fs.renameSync(tmp, DATA_FILE);
    } catch {
      // Keep running in-memory if filesystem is read-only
    }
  }

  isAdminConfigured(): boolean {
    if (process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim().length > 0) {
      return true;
    }
    return Boolean(this.db.adminCredentialHash);
  }

  claimAdminPasscode(passcode: string): boolean {
    if (this.isAdminConfigured()) return false;
    this.db.adminCredentialHash = hashPassword(passcode);
    this.persist();
    return true;
  }

  verifyAdminPasscode(passcode: string): boolean {
    const envPass = process.env.ADMIN_PASSCODE;
    if (envPass && envPass.trim().length > 0) {
      const a = Buffer.from(passcode);
      const b = Buffer.from(envPass);
      if (a.length !== b.length) return false;
      return crypto.timingSafeEqual(a, b);
    }
    if (!this.db.adminCredentialHash) return false;
    return verifyPassword(passcode, this.db.adminCredentialHash);
  }

  getGasUrl(): string {
    return process.env.GAS_WEB_APP_URL || this.db.gasWebAppUrl || '';
  }

  setGasUrl(url: string): void {
    this.db.gasWebAppUrl = url;
    this.persist();
  }

  loginOrCreateStudent(input: {
    nisn: string;
    nama: string;
    password: string;
    guild: GuildType;
    gender: GenderType;
  }): { ok: boolean; user?: UserProfile; error?: string } {
    const cleanNisn = input.nisn.trim();
    const existing = this.db.users.find((u) => u.NISN === cleanNisn);
    if (existing) {
      if (!verifyPassword(input.password, existing.passwordHash)) {
        return { ok: false, error: 'Kata sandi salah untuk NISN tersebut.' };
      }
      const { passwordHash: _ph, ...publicUser } = existing;
      return { ok: true, user: publicUser };
    }

    const created: StoredUser = {
      NISN: cleanNisn,
      Nama: input.nama.trim(),
      Role: 'Siswa',
      Guild: input.guild,
      Gender: input.gender,
      Level: 1,
      XP: 0,
      Piala: 0,
      Diploma_URL: '',
      passwordHash: hashPassword(input.password),
    };
    this.db.users.push(created);
    this.persist();
    const { passwordHash: _ph, ...publicUser } = created;
    return { ok: true, user: publicUser };
  }

  getUserByNisn(nisn: string): UserProfile | undefined {
    const found = this.db.users.find((u) => u.NISN === nisn);
    if (!found) return undefined;
    const { passwordHash: _ph, ...publicUser } = found;
    return publicUser;
  }

  getWorldData(): { provinsi: ProvinceData[]; quests: QuestItem[] } {
    return {
      provinsi: this.db.provinces,
      quests: this.db.quests,
    };
  }

  getStudentProgress(nisn: string): NilaiProgres[] {
    return this.db.nilai.filter((n) => n.NISN === nisn);
  }

  submitScore(input: {
    nisn: string;
    id_provinsi: string;
    id_quest: string;
    jenis_nilai: NilaiType;
    skor: number;
  }): {
    finalScore: number;
    questStatus: string;
    kkm: number;
    log: NilaiProgres;
    user?: UserProfile;
  } {
    const prov = this.db.provinces.find((p) => p.ID_Provinsi === input.id_provinsi);
    const kkm = prov ? Number(prov.KKM) : 75;

    let finalScore = Math.max(0, Math.min(100, Math.round(Number(input.skor))));
    let status = 'Lulus';

    if (input.jenis_nilai === 'Remedial') {
      // Aturan KKM Remedial: Nilai terkunci tepat pada KKM, tidak melebihi KKM
      finalScore = kkm;
      status = 'Lulus (Remedial)';
    } else if (input.jenis_nilai === 'Sumatif' && finalScore < kkm) {
      status = 'Gagal (Perlu Side Quest Remedial)';
    } else if (finalScore < kkm) {
      status = 'Perlu Mengulang';
    }

    const user = this.db.users.find((u) => u.NISN === input.nisn);
    const log: NilaiProgres = {
      ID_Log: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      NISN: input.nisn,
      Nama: user?.Nama || input.nisn,
      ID_Provinsi: input.id_provinsi,
      ID_Quest: input.id_quest,
      Jenis_Nilai: input.jenis_nilai,
      Skor_Diperoleh: finalScore,
      Status: status,
      Timestamp: new Date().toISOString(),
    };

    this.db.nilai.unshift(log);

    // Update student XP, Level, & Piala count
    if (user) {
      const gainedXp = status.startsWith('Lulus') ? (input.jenis_nilai === 'Sumatif' ? 120 : 65) : 20;
      user.XP += gainedXp;
      user.Level = Math.max(1, Math.floor(user.XP / 100) + 1);

      // Recompute passed provinces (Sumatif Lulus or Remedial Lulus)
      const passedProvs = new Set(
        this.db.nilai
          .filter(
            (n) =>
              n.NISN === user.NISN &&
              (n.Jenis_Nilai === 'Sumatif' || n.Jenis_Nilai === 'Remedial') &&
              n.Status.startsWith('Lulus')
          )
          .map((n) => n.ID_Provinsi)
      );
      user.Piala = passedProvs.size;
    }

    this.persist();

    return {
      finalScore,
      questStatus: status,
      kkm,
      log,
      user: user ? this.getUserByNisn(user.NISN) : undefined,
    };
  }

  adminEditScore(input: {
    id_log: string;
    delete?: boolean;
    new_score?: number;
    new_status?: string;
  }): boolean {
    const idx = this.db.nilai.findIndex((n) => n.ID_Log === input.id_log);
    if (idx === -1) return false;
    if (input.delete) {
      this.db.nilai.splice(idx, 1);
    } else {
      if (typeof input.new_score === 'number') {
        this.db.nilai[idx].Skor_Diperoleh = Math.max(0, Math.min(100, Math.round(input.new_score)));
      }
      if (typeof input.new_status === 'string' && input.new_status.trim()) {
        this.db.nilai[idx].Status = input.new_status.trim();
      }
    }
    this.persist();
    return true;
  }

  saveKurikulum(prov: ProvinceData): ProvinceData {
    const idx = this.db.provinces.findIndex((p) => p.ID_Provinsi === prov.ID_Provinsi);
    if (idx >= 0) {
      this.db.provinces[idx] = prov;
    } else {
      this.db.provinces.push(prov);
    }
    this.persist();
    return prov;
  }

  saveQuest(quest: QuestItem): QuestItem {
    const idx = this.db.quests.findIndex((q) => q.ID_Quest === quest.ID_Quest);
    if (idx >= 0) {
      this.db.quests[idx] = quest;
    } else {
      this.db.quests.push(quest);
    }
    this.persist();
    return quest;
  }

  getUserPasswordHash(nisn: string): string | undefined {
    return this.db.users.find((u) => u.NISN === nisn)?.passwordHash;
  }

  hydrateFromGasData(payload: {
    provinsi?: Array<Record<string, unknown>>;
    quests?: Array<Record<string, unknown>>;
    users?: Array<Record<string, unknown>>;
    nilai?: Array<Record<string, unknown>>;
  }): { usersSynced: number; provincesSynced: number; questsSynced: number; nilaiSynced: number } {
    let usersSynced = 0;
    let provincesSynced = 0;
    let questsSynced = 0;
    let nilaiSynced = 0;

    if (Array.isArray(payload.provinsi)) {
      payload.provinsi.forEach((raw, idx) => {
        const id = String(raw.ID_Provinsi || '').trim();
        if (!id) return;
        const existing = this.db.provinces.find((p) => p.ID_Provinsi === id);
        const mapped: ProvinceData = {
          ID_Provinsi: id,
          Nama_Provinsi: String(raw.Nama_Provinsi || existing?.Nama_Provinsi || id),
          Mata_Pelajaran: String(raw.Mata_Pelajaran || existing?.Mata_Pelajaran || 'Mata Pelajaran'),
          CP_Asli: String(raw.CP_Asli || existing?.CP_Asli || ''),
          Prolog_Cerita: String(raw.Prolog_Cerita || existing?.Prolog_Cerita || ''),
          Elemen_Boss: String(raw.Elemen_Boss || existing?.Elemen_Boss || 'Penjaga Segel'),
          Tipe_Boss: (raw.Tipe_Boss as ProvinceData['Tipe_Boss']) || existing?.Tipe_Boss || 'Golem',
          KKM: Number(raw.KKM || existing?.KKM || 75),
          MapX: Number(raw.MapX || existing?.MapX || 200 + (idx % 3) * 180),
          MapY: Number(raw.MapY || existing?.MapY || 140 + Math.floor(idx / 3) * 160),
          Tema_Warna: String(raw.Tema_Warna || existing?.Tema_Warna || '#F59E0B'),
        };
        if (existing) {
          Object.assign(existing, mapped);
        } else {
          this.db.provinces.push(mapped);
        }
        provincesSynced++;
      });
    }

    if (Array.isArray(payload.quests)) {
      payload.quests.forEach((raw, idx) => {
        const id = String(raw.ID_Quest || '').trim();
        const provId = String(raw.ID_Provinsi || '').trim();
        if (!id || !provId) return;
        const existing = this.db.quests.find((q) => q.ID_Quest === id);
        const urutan = Number(raw.Urutan_Linear ?? existing?.Urutan_Linear ?? idx + 1);
        const tipe = (raw.Tipe_Quest as QuestItem['Tipe_Quest']) || existing?.Tipe_Quest || 'Main';
        const mapped: QuestItem = {
          ID_Quest: id,
          ID_Provinsi: provId,
          Urutan_Linear: urutan,
          Judul_Quest: String(raw.Judul_Quest || existing?.Judul_Quest || id),
          TP_Deskripsi: String(raw.TP_Deskripsi || existing?.TP_Deskripsi || ''),
          Tipe_Quest: tipe,
          Poin: Number(raw.Poin || existing?.Poin || 100),
          MapX: Number(raw.MapX || existing?.MapX || (tipe === 'Boss' ? 675 : 180 + (urutan % 4) * 120)),
          MapY: Number(raw.MapY || existing?.MapY || (tipe === 'Boss' ? 120 : 300 - (urutan % 3) * 50)),
          Pertanyaan: String(raw.Pertanyaan || existing?.Pertanyaan || ''),
          Opsi_A: String(raw.Opsi_A || existing?.Opsi_A || 'A'),
          Opsi_B: String(raw.Opsi_B || existing?.Opsi_B || 'B'),
          Opsi_C: String(raw.Opsi_C || existing?.Opsi_C || 'C'),
          Opsi_D: String(raw.Opsi_D || existing?.Opsi_D || 'D'),
          Kunci: (String(raw.Kunci || existing?.Kunci || 'A').toUpperCase() as QuestItem['Kunci']),
          Soal_Tambahan: existing?.Soal_Tambahan,
        };
        if (existing) {
          Object.assign(existing, mapped);
        } else {
          this.db.quests.push(mapped);
        }
        questsSynced++;
      });
    }

    if (Array.isArray(payload.users)) {
      payload.users.forEach((raw) => {
        const nisn = String(raw.NISN || '').trim();
        if (!nisn) return;
        const existing = this.db.users.find((u) => u.NISN === nisn);
        const rawPass = String(raw.Password || '').trim();
        const validHash = rawPass.includes(':') ? rawPass : rawPass ? hashPassword(rawPass) : '';
        if (existing) {
          existing.Nama = String(raw.Nama || existing.Nama);
          existing.Guild = (raw.Guild as GuildType) || existing.Guild;
          existing.Gender = (raw.Gender as GenderType) || existing.Gender;
          existing.Level = Math.max(existing.Level, Number(raw.Level || 1));
          existing.XP = Math.max(existing.XP, Number(raw.XP || 0));
          existing.Piala = Math.max(existing.Piala, Number(raw.Piala || 0));
        } else if (validHash) {
          this.db.users.push({
            NISN: nisn,
            Nama: String(raw.Nama || `Petualang ${nisn}`),
            Role: raw.Role === 'Guru' ? 'Guru' : 'Siswa',
            Guild: (raw.Guild as GuildType) || 'Swordsman',
            Gender: (raw.Gender as GenderType) || 'Male',
            Level: Math.max(1, Number(raw.Level || 1)),
            XP: Number(raw.XP || 0),
            Piala: Number(raw.Piala || 0),
            Diploma_URL: String(raw.Diploma_URL || ''),
            passwordHash: validHash,
          });
        }
        usersSynced++;
      });
    }

    if (Array.isArray(payload.nilai)) {
      payload.nilai.forEach((raw) => {
        const idLog = String(raw.ID_Log || '').trim();
        const nisn = String(raw.NISN || '').trim();
        if (!idLog || !nisn) return;
        const exists = this.db.nilai.some((n) => n.ID_Log === idLog);
        if (!exists) {
          const user = this.db.users.find((u) => u.NISN === nisn);
          this.db.nilai.push({
            ID_Log: idLog,
            NISN: nisn,
            Nama: user?.Nama || nisn,
            ID_Provinsi: String(raw.ID_Provinsi || ''),
            ID_Quest: String(raw.ID_Quest || ''),
            Jenis_Nilai: (raw.Jenis_Nilai as NilaiType) || 'Formatif',
            Skor_Diperoleh: Number(raw.Skor_Diperoleh || 0),
            Status: String(raw.Status || 'Lulus'),
            Timestamp: String(raw.Timestamp || new Date().toISOString()),
          });
          nilaiSynced++;
        }
      });
    }

    if (usersSynced + provincesSynced + questsSynced + nilaiSynced > 0) {
      this.persist();
    }

    return { usersSynced, provincesSynced, questsSynced, nilaiSynced };
  }

  getAdminDashboard(): {
    users: UserProfile[];
    nilai: NilaiProgres[];
    provinces: ProvinceData[];
    quests: QuestItem[];
    gasUrl: string;
  } {
    return {
      users: this.db.users.map(({ passwordHash: _ph, ...u }) => u),
      nilai: this.db.nilai,
      provinces: this.db.provinces,
      quests: this.db.quests,
      gasUrl: this.getGasUrl(),
    };
  }
}

export const store = new GameStore();
