import {Capacitor,registerPlugin} from '@capacitor/core';
import {createAppPurchaseProofReader} from './app-purchase-proof.mjs';
// Future enrollment/restore UI explicitly creates this adapter. Module import
// alone never reads StoreKit or opens an App Store authentication prompt.
export function createNativeAppPurchaseProofReader(){
 if(!Capacitor.isNativePlatform())throw Error('PURCHASE_NATIVE_REQUIRED');
 return createAppPurchaseProofReader({native:registerPlugin('AppPurchaseProof')});
}
