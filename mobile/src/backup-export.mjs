import {cancelled,abortError} from './native-actions.mjs';
// Injectable native boundary: no titles/text/URLs accompanying a backup attachment.
export function createBackupExporter({ filesystem, share, directory, encoding, randomId }) {
  let active = false;
  return async function exportFile({ text, filename }) {
    if (active) throw new Error('Eksports jau notiek.');
    if (typeof text !== 'string' || !/^vardadienas-dati-\d{4}(?:-\d{2}){5}\.json$/.test(filename))
      throw new Error('Nederīgs eksporta fails.');
    const bytes = new TextEncoder().encode(text).length;
    if (bytes > 5 * 1024 * 1024) throw new Error('Eksporta fails pārsniedz 5 MB ierobežojumu.');
    // Parsing catches accidental empty/title-only attachments at this boundary too.
    const data = JSON.parse(text);
    if (data.format !== 'lv.vardadienas.backup' || data.version !== 1 ||
        !Array.isArray(data.favorites) || !Array.isArray(data.birthdays))
      throw new Error('Nederīgs datu kopijas formāts.');
    let created = false;
    const id = randomId();
    if (!/^[a-zA-Z0-9-]+$/.test(id)) { active = false; throw new Error('Nederīgs pagaidu faila identifikators.'); }
    active = true;
    const folder = `backup-export-${id}`, path = `${folder}/${filename}`;
    try {
      if (!(await share.canShare()).value) throw new Error('Faila kopīgošana šajā ierīcē nav pieejama.');
      const result = await filesystem.writeFile({ path, data: text, directory, encoding, recursive: true });
      created = true;
      if (!/^file:\/\//.test(result.uri)) throw new Error('Nav iegūta vietējā faila adrese.');
      try{await share.share({ files: [result.uri] });}catch(error){if(cancelled(error,'Share canceled'))throw abortError();throw error;}
      // A completed sheet does not prove that the user saved the file.
      return { bytes, filename };
    } finally {
      if (created) {
        try { await filesystem.deleteFile({ path, directory }); } catch { /* Cache may be reclaimed by the OS. */ }
        try { await filesystem.rmdir({ path: folder, directory }); } catch { /* Never recursively delete unrelated files. */ }
      }
      active = false;
    }
  };
}
