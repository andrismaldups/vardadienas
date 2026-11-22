import {Capacitor,registerPlugin} from '@capacitor/core';
const native=registerPlugin('InstallationIdentity');
if(Capacitor.isNativePlatform())window.VardadienasNativeIdentity=Object.freeze({
 async assertLocalDeletionAllowed(){
  // Do not orphan an enrolled identity while server revocation is not integrated.
  const value=await native.deletionState();if(value.blocked!==false)throw Error('Vispirms jāapstiprina šīs iOS instalācijas dzēšana serverī.');
 }
});
