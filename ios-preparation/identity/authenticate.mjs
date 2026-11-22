import {createHash,timingSafeEqual} from 'node:crypto';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const secret=/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;
export const hashInstallationToken=token=>{if(typeof token!=='string'||!secret.test(token))throw Error('INVALID_INSTALLATION_TOKEN');return createHash('sha256').update(token).digest('hex');};
// Trusted lookup MUST use iOS-specific credential records, never generic PWA rows.
// Authentication alone does not grant a paid Push entitlement.
export async function authenticateInstallation({headers,lookup,bundleId,environment}){
 const denied=()=>{throw Error('UNAUTHORIZED');};
 const id=headers.get('x-installation-id'),authorization=headers.get('authorization');
 const match=typeof authorization==='string'?/^Bearer (.+)$/i.exec(authorization):null;
 if(typeof id!=='string'||!uuid.test(id)||!match||!secret.test(match[1]))return denied();
 if(typeof bundleId!=='string'||!/^([A-Za-z0-9-]+\.)+[A-Za-z0-9-]+$/.test(bundleId)||bundleId.startsWith('lv.example.')||!['Sandbox','Production'].includes(environment))return denied();
 let row;try{row=await lookup(id);}catch{throw Error('AUTHENTICATION_UNAVAILABLE');}
 if(!row||row.id!==id||row.platform!=='ios'||row.bundleId!==bundleId||row.environment!==environment||row.revoked!==false||typeof row.tokenHash!=='string'||!/^[a-f0-9]{64}$/.test(row.tokenHash))return denied();
 const actual=Buffer.from(hashInstallationToken(match[1]),'hex'),expected=Buffer.from(row.tokenHash,'hex');
 if(!timingSafeEqual(actual,expected))return denied();
 return Object.freeze({id,platform:'ios',bundleId,environment});
}
