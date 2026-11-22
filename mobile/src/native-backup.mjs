import {temporaryId} from './native-utils.mjs';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { createBackupExporter } from './backup-export.mjs';
if (Capacitor.isNativePlatform()) {
  window.VardadienasNativeBackup = Object.freeze({
    exportFile: createBackupExporter({ filesystem: Filesystem, share: Share,
      directory: Directory.Cache, encoding: Encoding.UTF8, randomId: temporaryId })
  });
}
