export const GAS_CODE_GS = `const SS = SpreadsheetApp.getActiveSpreadsheet();

function doGet(e) {
  const action = e && e.parameter ? e.parameter.action : '';

  if (action === 'getWorldData') {
    return jsonResponse({
      provinsi: getSheetData('Kurikulum_Provinsi'),
      quests: getSheetData('Quest_TP')
    });
  }

  if (action === 'getAdminDashboard') {
    return jsonResponse({
      users: getSheetData('Users'),
      nilai: getSheetData('Nilai_Progres'),
      tracking: getSheetData('Live_Tracking')
    });
  }

  return jsonResponse({ status: 'ok', message: 'Nusantara Akademia GAS API Ready' });
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;

  // 1. Login & Registrasi Karakter
  if (action === 'loginOrCreate') {
    const sheet = SS.getSheetByName('Users');
    const users = getSheetData('Users');
    let user = users.find(u => String(u.NISN) === String(data.nisn));

    if (!user) {
      sheet.appendRow([
        data.nisn,
        data.nama,
        data.password_hash || '',
        'Siswa',
        data.guild || 'Swordsman',
        data.gender || 'Male',
        1,
        0,
        0,
        ''
      ]);
      user = {
        NISN: data.nisn,
        Nama: data.nama,
        Role: 'Siswa',
        Guild: data.guild || 'Swordsman',
        Gender: data.gender || 'Male',
        Level: 1,
        XP: 0,
        Piala: 0
      };
    }
    return jsonResponse({ status: 'success', user: user });
  }

  // 2. Submit Skor Quest (Formatif, Sumatif Boss, & Logika KKM Remedial)
  if (action === 'submitScore') {
    const nilaiSheet = SS.getSheetByName('Nilai_Progres');
    const provSheet = getSheetData('Kurikulum_Provinsi');
    const provinsi = provSheet.find(p => String(p.ID_Provinsi) === String(data.id_provinsi));
    const kkm = provinsi ? Number(provinsi.KKM) : 75;

    let finalScore = Number(data.skor);
    let status = 'Lulus';

    if (data.jenis_nilai === 'Remedial') {
      finalScore = kkm;
      status = 'Lulus (Remedial)';
    } else if (data.jenis_nilai === 'Sumatif' && finalScore < kkm) {
      status = 'Gagal (Perlu Side Quest Remedial)';
    } else if (finalScore < kkm) {
      status = 'Perlu Mengulang';
    }

    const logId = data.id_log || ('LOG-' + new Date().getTime());
    nilaiSheet.appendRow([
      logId,
      data.nisn,
      data.id_provinsi,
      data.id_quest,
      data.jenis_nilai,
      finalScore,
      status,
      new Date().toISOString()
    ]);

    // Sinkronkan Level, XP, Piala siswa ke tab Users jika dikirim oleh server
    if (data.level !== undefined) {
      const userSheet = SS.getSheetByName('Users');
      const uRows = userSheet.getDataRange().getValues();
      for (let i = 1; i < uRows.length; i++) {
        if (String(uRows[i][0]) === String(data.nisn)) {
          userSheet.getRange(i + 1, 7).setValue(Number(data.level));
          userSheet.getRange(i + 1, 8).setValue(Number(data.xp || 0));
          userSheet.getRange(i + 1, 9).setValue(Number(data.piala || 0));
          break;
        }
      }
    }

    return jsonResponse({ status: 'success', finalScore: finalScore, questStatus: status, kkm: kkm });
  }

  // 3. Admin Edit / Hapus Nilai Siswa
  if (action === 'adminEditScore') {
    const sheet = SS.getSheetByName('Nilai_Progres');
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(data.id_log)) {
        if (data.delete) {
          sheet.deleteRow(i + 1);
        } else {
          sheet.getRange(i + 1, 6).setValue(data.new_score);
          sheet.getRange(i + 1, 7).setValue(data.new_status);
        }
        break;
      }
    }
    return jsonResponse({ status: 'updated' });
  }

  // 4. Input Kurikulum oleh Guru (Upsert berdasarkan ID_Provinsi)
  if (action === 'saveKurikulum') {
    const sheet = SS.getSheetByName('Kurikulum_Provinsi');
    const rows = sheet.getDataRange().getValues();
    let updated = false;
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(data.id_provinsi)) {
        sheet.getRange(i + 1, 2, 1, 5).setValues([[
          data.nama_provinsi,
          data.cp_asli,
          data.prolog_cerita,
          data.elemen_boss,
          data.kkm
        ]]);
        updated = true;
        break;
      }
    }
    if (!updated) {
      sheet.appendRow([
        data.id_provinsi,
        data.nama_provinsi,
        data.cp_asli,
        data.prolog_cerita,
        data.elemen_boss,
        data.kkm
      ]);
    }
    return jsonResponse({ status: 'saved' });
  }

  // 5. Input Quest TP oleh Guru (Upsert berdasarkan ID_Quest)
  if (action === 'saveQuest' && data.quest) {
    const q = data.quest;
    const sheet = SS.getSheetByName('Quest_TP');
    const rows = sheet.getDataRange().getValues();
    let updated = false;
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(q.ID_Quest)) {
        sheet.getRange(i + 1, 2, 1, 11).setValues([[
          q.ID_Provinsi, q.Urutan_Linear, q.TP_Deskripsi, q.Tipe_Quest,
          q.Pertanyaan, q.Opsi_A, q.Opsi_B, q.Opsi_C, q.Opsi_D, q.Kunci, q.Poin || 100
        ]]);
        updated = true;
        break;
      }
    }
    if (!updated) {
      sheet.appendRow([
        q.ID_Quest, q.ID_Provinsi, q.Urutan_Linear, q.TP_Deskripsi, q.Tipe_Quest,
        q.Pertanyaan, q.Opsi_A, q.Opsi_B, q.Opsi_C, q.Opsi_D, q.Kunci, q.Poin || 100
      ]);
    }
    return jsonResponse({ status: 'saved' });
  }

  return jsonResponse({ status: 'error', message: 'Unknown action' });
}

function getSheetData(sheetName) {
  const sheet = SS.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

export const SHEET_SCHEMA_TABS = [
  {
    tabName: 'Users',
    columns: ['NISN', 'Nama', 'Password', 'Role', 'Guild', 'Gender', 'Level', 'XP', 'Piala', 'Diploma_URL'],
  },
  {
    tabName: 'Kurikulum_Provinsi',
    columns: ['ID_Provinsi', 'Nama_Provinsi', 'CP_Asli', 'Prolog_Cerita', 'Elemen_Boss', 'KKM'],
  },
  {
    tabName: 'Quest_TP',
    columns: ['ID_Quest', 'ID_Provinsi', 'Urutan_Linear', 'TP_Deskripsi', 'Tipe_Quest', 'Pertanyaan', 'Opsi_A', 'Opsi_B', 'Opsi_C', 'Opsi_D', 'Kunci', 'Poin'],
  },
  {
    tabName: 'Nilai_Progres',
    columns: ['ID_Log', 'NISN', 'ID_Provinsi', 'ID_Quest', 'Jenis_Nilai', 'Skor_Diperoleh', 'Status', 'Timestamp'],
  },
  {
    tabName: 'Live_Tracking',
    columns: ['NISN', 'Nama', 'Provinsi_Saat_Ini', 'X', 'Y', 'Status_Aktivitas'],
  },
];
