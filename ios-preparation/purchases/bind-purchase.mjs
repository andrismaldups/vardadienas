import {isAuthenticatedInstallation} from '../identity/authenticate.mjs';
import {createHash} from 'node:crypto';
const digest=text=>createHash('sha256').update(text).digest('hex');
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const unavailable=async()=>{throw Error('DEVICE_BINDING_NOT_CONFIGURED');};
// Internal service: authentication, device binding verification and repository
// transaction are server-owned dependencies, never request-supplied booleans.
export function createPurchaseBindingService({bundleId,identityEnvironment,appleEnvironment,purchaseReader,
 verifyDeviceBinding=unavailable,repository=null,clock=Date.now}){
 if(typeof bundleId!=='string'||!/^([A-Za-z0-9-]+\.)+[A-Za-z0-9-]+$/.test(bundleId)||bundleId.startsWith('lv.example.')||!['Sandbox','Production'].includes(identityEnvironment)||!['Sandbox','Production'].includes(appleEnvironment)||typeof purchaseReader?.read!=='function')throw Error('INVALID_BINDING_CONFIG');
 async function bind({installation,signedAppTransaction,evidence}){
  if(!isAuthenticatedInstallation(installation)||installation.platform!=='ios'||!uuid.test(installation.id)||installation.bundleId!==bundleId||installation.environment!==identityEnvironment)throw Error('AUTHENTICATED_IOS_IDENTITY_REQUIRED');
  if(typeof signedAppTransaction!=='string'||Buffer.byteLength(signedAppTransaction)>65536||!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(signedAppTransaction))throw Error('INVALID_PURCHASE_PROOF');
  installation=structuredClone(installation);
  const hash=digest(signedAppTransaction),now=clock();
  if(!Number.isSafeInteger(now)||now<0)throw Error('INVALID_SERVER_TIME');
  const binding=structuredClone(await verifyDeviceBinding({installation:structuredClone(installation),appJwsHash:hash,evidence}));
  if(binding?.verified!==true||binding.installationId!==installation.id||binding.appJwsHash!==hash||binding.bundleId!==bundleId||binding.identityEnvironment!==identityEnvironment||typeof binding.nonceId!=='string'||!binding.nonceId||!Number.isSafeInteger(binding.expiresAt)||binding.expiresAt<=now)throw Error('DEVICE_BINDING_REJECTED');
  const {snapshot,decision}=await purchaseReader.read(signedAppTransaction);
  if(snapshot?.app?.bundleId!==bundleId||snapshot.app.environment!==appleEnvironment||snapshot.scope?.bundleId!==bundleId||snapshot.scope.environment!==appleEnvironment||decision?.environment!==appleEnvironment)throw Error('VERIFIED_PURCHASE_SCOPE_MISMATCH');
  if(decision.status==='pending-verification')return {linked:false,status:'pending-verification',baseAccess:false,pushActive:false};
  if(!repository||typeof repository.commitVerifiedBinding!=='function')throw Error('PURCHASE_REPOSITORY_NOT_CONFIGURED');
  const commitTime=clock();
  if(!Number.isSafeInteger(commitTime)||commitTime<now||commitTime>=binding.expiresAt)throw Error('DEVICE_BINDING_EXPIRED');
  // Repository must re-check identity/revocation + nonce expiry, consume the nonce,
  // preserve original signed purchase date and update history/link atomically.
  // No new app record/date is invented from installation or linking time.
  const result=await repository.commitVerifiedBinding(structuredClone({installation,binding,snapshot,decision,commitTime}));
  if(typeof result?.linked!=='boolean')throw Error('PURCHASE_BINDING_UNCONFIRMED');
  return {linked:result.linked,status:decision.status,baseAccess:result.linked&&appleEnvironment==='Production'&&decision.baseAccess===true,
   pushActive:result.linked&&appleEnvironment==='Production'&&decision.pushActive===true,
   ...(Number.isSafeInteger(decision.pushExpiresAt)?{pushExpiresAt:decision.pushExpiresAt}:{})};
 }
 return {bind};
}
