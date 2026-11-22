import { FilePicker } from '@capawesome/capacitor-file-picker';
import { Clipboard } from '@capacitor/clipboard';
import {createBackupImporter,createGreetingActions} from './native-actions.mjs';
import {temporaryId} from './native-utils.mjs';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { createBackupExporter } from './backup-export.mjs';
if (Capacitor.isNativePlatform()) {
  window.VardadienasNativeGreetings=Object.freeze(createGreetingActions({share:Share,clipboard:Clipboard}));
  window.VardadienasNativeBackup = Object.freeze({
    importFile: createBackupImporter({picker:FilePicker,filesystem:Filesystem,cacheDirectory:Directory.Cache,encoding:Encoding.UTF8}),
    exportFile: createBackupExporter({ filesystem: Filesystem, share: Share,
      directory: Directory.Cache, encoding: Encoding.UTF8, randomId: temporaryId })
  });
}
