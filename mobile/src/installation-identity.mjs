const keys=['bundleId','environment','installationId','token','version'];
export function validateCredential(value,{bundleId,environment}){
 if(typeof bundleId!=='string'||!/^([A-Za-z0-9-]+\.)+[A-Za-z0-9-]+$/.test(bundleId)||bundleId.startsWith('lv.example.')||!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!==keys.join(',')||value.version!==1||
    typeof value.installationId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value.installationId)||
    typeof value.token!=='string'||!/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/.test(value.token)||
    value.bundleId!==bundleId||value.environment!==environment||!['Sandbox','Production'].includes(environment))throw Error('IDENTITY_INVALID');
 return Object.freeze({version:1,installationId:value.installationId,token:value.token,bundleId,environment});
}
export function createIdentityStore({native,bundleId,environment}){
 const scope={bundleId,environment};
 async function read(){const result=await native.read();if(result.record===null)return null;try{return validateCredential(JSON.parse(result.record),scope);}catch{throw Error('IDENTITY_RECOVERY_REQUIRED');}}
 async function store(record){
  const checked=validateCredential(record,scope),before=await read();
  if(before){if(JSON.stringify(before)!==JSON.stringify(checked))throw Error('IDENTITY_CONFLICT');return;}
  const result=await native.store({record:JSON.stringify(checked)});
  if(result.stored!==true||JSON.stringify(await read())!==JSON.stringify(checked))throw Error('IDENTITY_STORAGE_UNCONFIRMED');
 }
 return {read,store};
}
