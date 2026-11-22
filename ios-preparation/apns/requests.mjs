// Pure request preparation, NOT a transport or authentication/entitlement check.
// Inputs must come from trusted server records. Never expose as a raw relay API.
const bytes=value=>new TextEncoder().encode(value).length;
export function buildAlertRequest({environment,bundleId,deviceToken,providerJwt,title,body,expiresAt,collapseId}){
 if(!['sandbox','production'].includes(environment))throw Error('Invalid APNs environment');
 if(typeof bundleId!=='string'||!/^([A-Za-z0-9-]+\.)+[A-Za-z0-9-]+$/.test(bundleId)||bundleId.startsWith('lv.example.'))throw Error('Final bundle ID required');
 if(typeof deviceToken!=='string'||!/^([a-f0-9]{2})+$/i.test(deviceToken)||deviceToken.length>4096)throw Error('Invalid APNs token');
 if(typeof providerJwt!=='string'||!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(providerJwt))throw Error('Provider JWT required');
 if(typeof title!=='string'||!title.trim()||typeof body!=='string'||!body.trim())throw Error('Alert text required');
 if(!Number.isSafeInteger(expiresAt)||expiresAt<0)throw Error('Invalid expiry');
 if(typeof collapseId!=='string'||!/^[A-Za-z0-9._:-]{1,64}$/.test(collapseId))throw Error('Invalid collapse ID');
 const payload=JSON.stringify({aps:{alert:{title,body},sound:'default'}});
 if(bytes(payload)>4096)throw Error('APNs payload exceeds 4096 bytes');
 return {origin:environment==='sandbox'?'https://api.sandbox.push.apple.com':'https://api.push.apple.com',headers:{
  ':method':'POST',':path':'/3/device/'+deviceToken.toLowerCase(),'authorization':'bearer '+providerJwt,
  'apns-topic':bundleId,'apns-push-type':'alert','apns-priority':'10','apns-expiration':String(expiresAt),'apns-collapse-id':collapseId
 },body:payload};
}
export function interpretResponse({status,body,registeredAt}){
 if(status===200)return {accepted:true,delivered:false,retry:false,invalidateToken:false};
 if(status===429||status===500||status===503)return {accepted:false,retry:true,invalidateToken:false};
 // The caller must condition any invalidation on the SAME token/topic/environment
 // and registration version sent in the request, within a database transaction.
 if(status===410&&body?.reason==='Unregistered'){
  const timestamp=body.timestamp;
  return {accepted:false,retry:false,invalidateToken:Number.isSafeInteger(timestamp)&&timestamp>=0&&Number.isSafeInteger(registeredAt)&&registeredAt>=0&&registeredAt<=timestamp};
 }
 return {accepted:false,retry:false,invalidateToken:false};
}
