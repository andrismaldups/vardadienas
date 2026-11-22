import {randomUUID,randomBytes,createHash} from 'node:crypto';
const sha=value=>createHash('sha256').update(value).digest('hex');
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const nonce=/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;
export function enrollmentContext({challengeId,installationId,bundleId,challenge,keyId,signedAppTransaction}){
 return ['vardadienas.enroll.v1',challengeId,installationId,bundleId,challenge,keyId,sha(signedAppTransaction)].join('\n');
}
export function createEnrollmentService({bundleId,identityEnvironment,appleEnvironment,attestEnvironment,appIdPrefix,repository,purchaseReader,verifyAttestation=null,clock=Date.now}){
 if(typeof bundleId!=='string'||!/^([A-Za-z0-9-]+\.)+[A-Za-z0-9-]+$/.test(bundleId)||bundleId.startsWith('lv.example.')||!['Sandbox','Production'].includes(identityEnvironment)||!['Sandbox','Production'].includes(appleEnvironment)||!['development','production'].includes(attestEnvironment)||!/^[A-Z0-9]{10}$/.test(appIdPrefix))throw Error('INVALID_ENROLLMENT_CONFIG');
 if(identityEnvironment==='Production'&&(appleEnvironment!=='Production'||attestEnvironment!=='production'))throw Error('PRODUCTION_ENROLLMENT_SCOPE_REQUIRED');
 const ready=()=>{if(typeof verifyAttestation!=='function'||typeof repository?.insertChallenge!=='function'||typeof repository?.readChallenge!=='function'||typeof repository?.commitEnrollment!=='function'||typeof purchaseReader?.read!=='function')throw Error('ENROLLMENT_NOT_CONFIGURED');};
 async function issueChallenge(){
  ready();const now=clock();if(!Number.isSafeInteger(now)||now<0)throw Error('INVALID_SERVER_TIME');
  const row={challengeId:randomUUID(),installationId:randomUUID(),bundleId,appId:appIdPrefix+'.'+bundleId,identityEnvironment,appleEnvironment,attestEnvironment,nonceHash:null,expiresAt:now+300000};
  const challenge=randomBytes(32).toString('base64url');row.nonceHash=sha(challenge);await repository.insertChallenge(row);
  return {challengeId:row.challengeId,installationId:row.installationId,bundleId,challenge,expiresAt:row.expiresAt};
 }
 async function enroll(input){
  ready();if(!input||!uuid.test(input.challengeId)||!uuid.test(input.installationId)||!nonce.test(input.challenge)||typeof input.keyId!=='string'||!/^[A-Za-z0-9+/]{43}=$/.test(input.keyId)||typeof input.attestation!=='string'||input.attestation.length>131072||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input.attestation)||!input.attestation||typeof input.signedAppTransaction!=='string'||Buffer.byteLength(input.signedAppTransaction)>65536||!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(input.signedAppTransaction))throw Error('INVALID_ENROLLMENT_PROOF');
  if(Buffer.from(input.keyId,'base64').length!==32||Buffer.from(input.keyId,'base64').toString('base64')!==input.keyId||Buffer.from(input.attestation,'base64').toString('base64')!==input.attestation)throw Error('INVALID_ENROLLMENT_PROOF');
  input=structuredClone(input);
  const challenge=await repository.readChallenge(input.challengeId),now=clock();
  if(!Number.isSafeInteger(now)||now<0)throw Error('INVALID_SERVER_TIME');
  if(!challenge||challenge.installationId!==input.installationId||challenge.bundleId!==bundleId||challenge.appId!==appIdPrefix+'.'+bundleId||challenge.identityEnvironment!==identityEnvironment||challenge.appleEnvironment!==appleEnvironment||challenge.attestEnvironment!==attestEnvironment||challenge.nonceHash!==sha(input.challenge)||challenge.consumed||challenge.expiresAt<=now)throw Error('CHALLENGE_REJECTED');
  const clientData=Buffer.from(enrollmentContext({...input,bundleId}));
  const clientDataHash=createHash('sha256').update(clientData).digest();
  // Only a real server-owned verifier can fulfil this contract. No request flag
  // substitutes for Apple certificate/authData/nonce/app identity verification.
  const attested=await verifyAttestation({attestation:Buffer.from(input.attestation,'base64'),keyId:input.keyId,clientData,clientDataHash,appId:appIdPrefix+'.'+bundleId,environment:attestEnvironment});
  if(attested?.keyId!==input.keyId||attested.appId!==appIdPrefix+'.'+bundleId||attested.environment!==attestEnvironment||attested.counter!==0||typeof attested.publicKeyPem!=='string'||!attested.publicKeyPem.includes('PUBLIC KEY'))throw Error('ATTESTATION_REJECTED');
  const purchase=await purchaseReader.read(input.signedAppTransaction);
  if(purchase?.snapshot?.app?.bundleId!==bundleId||purchase.snapshot.app.environment!==appleEnvironment||purchase.decision?.environment!==appleEnvironment)throw Error('PURCHASE_SCOPE_MISMATCH');
  const sandbox=identityEnvironment==='Sandbox'&&appleEnvironment==='Sandbox'&&purchase.decision.status==='sandbox'&&['active','expired'].includes(purchase.decision.testPeriodStatus);
  if(purchase.decision.baseAccess!==true&&!sandbox)throw Error('PAID_PURCHASE_NOT_CONFIRMED');
  const commitTime=clock();if(!Number.isSafeInteger(commitTime)||commitTime<now||commitTime>=challenge.expiresAt)throw Error('CHALLENGE_EXPIRED');
  const token=randomBytes(32).toString('base64url');
  const committed=await repository.commitEnrollment({challenge,nonceHash:sha(input.challenge),commitTime,credentialHash:sha(token),attested,purchase});
  if(committed?.committed!==true||committed.installationId!==challenge.installationId)throw Error('ENROLLMENT_COMMIT_UNCONFIRMED');
  return {version:1,installationId:challenge.installationId,token,bundleId,environment:identityEnvironment};
 }
 return {issueChallenge,enroll};
}
