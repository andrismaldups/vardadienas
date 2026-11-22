// Shape checks are not cryptographic verification; server verification is mandatory.
function proof(result){
 const jws=result?.signedAppTransaction;
 if(typeof jws!=='string'||new TextEncoder().encode(jws).length>65536||!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(jws))throw Error('PURCHASE_INVALID');
 return Object.freeze({signedAppTransaction:jws});
}
export function createAppPurchaseProofReader({native}){
 let busy=false;
 async function invoke(refresh,userInitiated){
  if(refresh&&userInitiated!==true)throw Error('PURCHASE_USER_ACTION_REQUIRED');
  if(busy)throw Error('PURCHASE_OPERATION_IN_PROGRESS');busy=true;
  try{return proof(await (refresh?native.refresh({userInitiated:true}):native.read()));}
  catch(error){const code=error?.code;
   if(typeof code==='string'&&['PURCHASE_UNSUPPORTED','PURCHASE_UNVERIFIED','PURCHASE_DEVICE_MISMATCH','PURCHASE_UNAVAILABLE','PURCHASE_INVALID','PURCHASE_OPERATION_IN_PROGRESS'].includes(code))throw Error(code);
   if(error.message==='PURCHASE_INVALID')throw error;throw Error('PURCHASE_UNAVAILABLE');
  }finally{busy=false;}
 }
 return {read:()=>invoke(false,false),restore:({userInitiated=false}={})=>invoke(true,userInitiated)};
}
