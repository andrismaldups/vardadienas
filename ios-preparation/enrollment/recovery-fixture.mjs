import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';import {generateKeyPairSync,createHash,createSign,randomUUID} from 'node:crypto';import {encode} from 'cbor2';
import {createSQLiteRecoveryService,recoveryContext} from './recovery.mjs';
const hash=b=>createHash('sha256').update(b).digest();
export function fixture(){
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');for(const name of ['../server/existing-schema.fixture.sql','../server/apple-purchases.schema.draft.sql','schema.draft.sql'])db.exec(readFileSync(new URL(name,import.meta.url),'utf8'));
 const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),id=randomUUID(),keyId=Buffer.alloc(32,1).toString('base64');let now=1000;
 db.prepare('INSERT INTO app_installations(id,token_hash) VALUES(?,?)').run(id,'a'.repeat(64));db.prepare('INSERT INTO ios_native_credentials VALUES(?,?,?,?,NULL)').run(id,'lv.demo.vardadienas','Production','a'.repeat(64));db.prepare('INSERT INTO ios_appattest_keys VALUES(?,?,?,?,?,0)').run(keyId,id,'ABCDEFGHIJ.lv.demo.vardadienas','production',publicKey.export({type:'spki',format:'pem'}));
 const service=createSQLiteRecoveryService({db,bundleId:'lv.demo.vardadienas',appIdPrefix:'ABCDEFGHIJ',identityEnvironment:'Production',attestEnvironment:'production',clock:()=>now});
 function sign(c,counter=1,changes={}){const input={...c,recoveryId:randomUUID(),candidateHash:'b'.repeat(64),...changes};const auth=Buffer.alloc(37);hash('ABCDEFGHIJ.lv.demo.vardadienas').copy(auth);auth.writeUInt32BE(counter,33);const nonce=hash(Buffer.concat([auth,hash(recoveryContext(input))]));const signer=createSign('SHA256');signer.update(nonce);input.assertion=Buffer.from(encode({signature:new Uint8Array(signer.sign(privateKey)),authenticatorData:new Uint8Array(auth)})).toString('base64');return input;}
 return {db,id,keyId,service,sign,setNow:v=>now=v,credential:()=>db.prepare('SELECT token_hash FROM ios_native_credentials').get().token_hash};
}
