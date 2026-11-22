// Isolated SQLite reference protocol. No HTTP route or production deployment.
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {verifyAssertion} from 'node-app-attest';
import {decodeSequence} from 'cbor2';
const hash=x=>createHash('sha256').update(x).digest('hex');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function recoveryContext(c){return Buffer.from(['vardadienas.recover.v1',c.challengeId,c.installationId,c.bundleId,c.identityEnvironment,c.challenge,c.keyId,c.recoveryId,c.candidateHash].join('\n'));}
export function createSQLiteRecoveryService({db,bundleId,appIdPrefix,identityEnvironment,attestEnvironment,clock=Date.now}){
 if(db.prepare('PRAGMA foreign_keys').get().foreign_keys!==1||!/^[A-Z0-9]{10}$/.test(appIdPrefix)||!/^([a-zA-Z0-9-]+\.)+[a-zA-Z0-9-]+$/.test(bundleId)||bundleId.startsWith('lv.example.')||!['Sandbox','Production'].includes(identityEnvironment)||!['development','production'].includes(attestEnvironment)||(identityEnvironment==='Production'&&attestEnvironment!=='production'))throw Error('RECOVERY_CONFIGURATION');
 const appId=appIdPrefix+'.'+bundleId;
 const key=id=>db.prepare('SELECT k.*, c.bundle_id, c.environment identity_environment, c.token_hash, c.revoked_at_ms FROM ios_appattest_keys k JOIN ios_native_credentials c USING(installation_id) WHERE key_id=?').get(id);
 const valid=k=>k&&k.revoked_at_ms===null&&k.app_id===appId&&k.bundle_id===bundleId&&k.identity_environment===identityEnvironment&&k.environment===attestEnvironment;
 function issueChallenge(keyId){
  if(typeof keyId!=='string'||keyId.length>128)throw Error('RECOVERY_REJECTED');const k=key(keyId);if(!valid(k))throw Error('RECOVERY_REJECTED');
  const c={challengeId:randomUUID(),installationId:k.installation_id,bundleId,identityEnvironment,keyId,challenge:randomBytes(32).toString('base64url'),expiresAt:clock()+300000};
  db.prepare('INSERT INTO ios_recovery_challenges VALUES(?,?,?,?,?,?,?,NULL)').run(c.challengeId,keyId,c.installationId,hash(c.challenge),k.counter,k.token_hash,c.expiresAt);return c;
 }
 function recover(input){
  if(!input||!uuid.test(input.challengeId)||!uuid.test(input.recoveryId)||typeof input.challenge!=='string'||!/^[-A-Za-z0-9_]{43}$/.test(input.challenge)||(typeof input.candidateHash!=='string'||! /^[a-f0-9]{64}$/.test(input.candidateHash))||typeof input.assertion!=='string'||input.assertion.length>16384||! /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input.assertion))throw Error('RECOVERY_REJECTED');
  const c=db.prepare('SELECT * FROM ios_recovery_challenges WHERE id=?').get(input.challengeId),k=c&&key(c.key_id);
  if(!c||!valid(k)||c.consumed_at_ms!==null||c.expires_at_ms<=clock()||c.nonce_hash!==hash(input.challenge)||k.counter!==c.base_counter||k.token_hash!==c.base_token_hash)throw Error('RECOVERY_REJECTED');
  const context={challengeId:c.id,installationId:k.installation_id,bundleId,identityEnvironment,keyId:k.key_id,challenge:input.challenge,recoveryId:input.recoveryId,candidateHash:input.candidateHash};
  const assertion=Buffer.from(input.assertion,'base64');
  try{const decoded=[...decodeSequence(assertion,{maxDepth:8})];if(decoded.length!==1||!(decoded[0]?.authenticatorData instanceof Uint8Array)||decoded[0].authenticatorData.length!==37||!(decoded[0]?.signature instanceof Uint8Array)||decoded[0].signature.length===0||decoded[0].signature.length>144)throw Error();}catch{throw Error('RECOVERY_ASSERTION_REJECTED');}
  let counter;try{counter=verifyAssertion({assertion,payload:recoveryContext(context),publicKey:k.public_key_pem,bundleIdentifier:bundleId,teamIdentifier:appIdPrefix,signCount:k.counter}).signCount;}catch{throw Error('RECOVERY_ASSERTION_REJECTED');}
  if(!Number.isSafeInteger(counter)||counter<=k.counter)throw Error('RECOVERY_ASSERTION_REJECTED');
  db.exec('BEGIN IMMEDIATE');try{
   const current=key(c.key_id),fresh=db.prepare('SELECT * FROM ios_recovery_challenges WHERE id=?').get(c.id);
   if(!valid(current)||current.counter!==c.base_counter||current.token_hash!==c.base_token_hash||fresh?.consumed_at_ms!==null||fresh.expires_at_ms<=clock())throw Error('RECOVERY_COMMIT_REJECTED');
   if(db.prepare('UPDATE ios_appattest_keys SET counter=? WHERE key_id=? AND counter=?').run(counter,k.key_id,k.counter).changes!==1)throw Error('RECOVERY_COMMIT_REJECTED');
   if(db.prepare('UPDATE ios_native_credentials SET token_hash=? WHERE installation_id=? AND revoked_at_ms IS NULL').run(input.candidateHash,k.installation_id).changes!==1)throw Error('RECOVERY_COMMIT_REJECTED');
   if(db.prepare('UPDATE app_installations SET token_hash=? WHERE id=?').run(input.candidateHash,k.installation_id).changes!==1)throw Error('RECOVERY_COMMIT_REJECTED');
   db.prepare('UPDATE ios_recovery_challenges SET consumed_at_ms=? WHERE id=?').run(clock(),c.id);db.exec('COMMIT');
   return {installationId:k.installation_id,recoveryId:input.recoveryId,candidateHash:input.candidateHash};
  }catch(error){db.exec('ROLLBACK');throw error;}
 }
 return {issueChallenge,recover};
}
