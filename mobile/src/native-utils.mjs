import {sha256} from '@noble/hashes/sha2.js';
import {bytesToHex} from '@noble/hashes/utils.js';
// Local integrity checks do not require WebCrypto's secure-context-only subtle API.
export const snapshotHash = text => bytesToHex(sha256(new TextEncoder().encode(text)));
export const temporaryId = (random=globalThis.crypto) => bytesToHex(random.getRandomValues(new Uint8Array(16)));
