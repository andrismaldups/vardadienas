// Node SQLite reference adapter for local isolated verification. NOT a D1 API.
export function createSQLiteEnrollmentRepository(db){
 if(db.prepare('PRAGMA foreign_keys').get().foreign_keys!==1)throw Error('FOREIGN_KEYS_REQUIRED');
 function readChallenge(id){const r=db.prepare('SELECT * FROM ios_enrollment_challenges WHERE id=?').get(id);return r?{challengeId:r.id,installationId:r.installation_id,bundleId:r.bundle_id,appId:r.app_id,identityEnvironment:r.identity_environment,appleEnvironment:r.apple_environment,attestEnvironment:r.attest_environment,nonceHash:r.nonce_hash,expiresAt:r.expires_at_ms,consumed:r.consumed_at_ms!==null}:null;}
 function insertChallenge(c){db.prepare('INSERT INTO ios_enrollment_challenges(id,installation_id,bundle_id,app_id,identity_environment,apple_environment,attest_environment,nonce_hash,expires_at_ms) VALUES(?,?,?,?,?,?,?,?,?)').run(c.challengeId,c.installationId,c.bundleId,c.appId,c.identityEnvironment,c.appleEnvironment,c.attestEnvironment,c.nonceHash,c.expiresAt);}
 function commitEnrollment(p){
  db.exec('BEGIN IMMEDIATE');try{
   const c=readChallenge(p.challenge.challengeId);
   if(!c||c.consumed||(!p.resume&&c.expiresAt<=p.commitTime)||c.nonceHash!==p.nonceHash||JSON.stringify(c)!==JSON.stringify({...p.challenge,consumed:false}))throw Error('CHALLENGE_COMMIT_REJECTED');
   if(p.resume){
    const r=readResumeChallenge(p.resume.challengeId);
    if(!r||r.consumed||r.originalChallengeId!==c.challengeId||r.keyId!==p.attested.keyId||r.nonceHash!==p.resume.nonceHash||r.expiresAt<=p.commitTime||!Number.isSafeInteger(p.attested.counter)||p.attested.counter<1)throw Error('RESUME_COMMIT_REJECTED');
   }else if(p.attested.counter!==0)throw Error('ENROLLMENT_COUNTER_REJECTED');
   const a=p.purchase.snapshot.app,scope=p.purchase.snapshot.scope;
   if(a.bundleId!==c.bundleId||a.environment!==c.appleEnvironment||scope.bundleId!==c.bundleId||scope.environment!==c.appleEnvironment||p.attested.environment!==c.attestEnvironment||p.attested.appId!==c.appId)throw Error('ENROLLMENT_SCOPE_MISMATCH');
   const old=db.prepare('SELECT * FROM apple_app_purchases WHERE environment=? AND bundle_id=? AND app_transaction_id=?').get(a.environment,a.bundleId,a.appTransactionId);
   if(old&&(old.purchase_date_ms!==a.purchaseDate||old.signed_at_ms>a.signedDate||old.access_state==='revoked'))throw Error('PURCHASE_RECONCILIATION_REQUIRED');
   db.prepare('INSERT INTO apple_app_purchases VALUES(?,?,?,?,?,?,?) ON CONFLICT(environment,bundle_id,app_transaction_id) DO UPDATE SET verified_at_ms=excluded.verified_at_ms,signed_at_ms=excluded.signed_at_ms').run(a.environment,a.bundleId,a.appTransactionId,a.purchaseDate,'active',p.purchase.snapshot.verifiedAt,a.signedDate);
   for(const tx of p.purchase.snapshot.renewals){
    const prior=db.prepare('SELECT * FROM apple_renewal_transactions WHERE environment=? AND bundle_id=? AND transaction_id=?').get(tx.environment,tx.bundleId,tx.transactionId);
    if(prior&&(prior.app_transaction_id!==tx.appTransactionId||prior.product_id!==tx.productId||prior.purchase_date_ms!==tx.purchaseDate||prior.signed_at_ms>tx.signedDate||(prior.signed_at_ms===tx.signedDate&&prior.revoked_at_ms!==tx.revokedAt)))throw Error('RENEWAL_RECONCILIATION_REQUIRED');
    db.prepare('INSERT INTO apple_renewal_transactions VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(environment,bundle_id,transaction_id) DO UPDATE SET revoked_at_ms=excluded.revoked_at_ms,verified_at_ms=excluded.verified_at_ms,signed_at_ms=excluded.signed_at_ms').run(tx.environment,tx.bundleId,tx.appTransactionId,tx.transactionId,tx.productId,tx.purchaseDate,tx.revokedAt,p.purchase.snapshot.verifiedAt,tx.signedDate);
   }
   db.prepare('INSERT INTO app_installations(id,token_hash) VALUES(?,?)').run(c.installationId,p.credentialHash);
   db.prepare('INSERT INTO ios_native_credentials VALUES(?,?,?,?,NULL)').run(c.installationId,c.bundleId,c.identityEnvironment,p.credentialHash);
   db.prepare('INSERT INTO ios_appattest_keys VALUES(?,?,?,?,?,?)').run(p.attested.keyId,c.installationId,p.attested.appId,p.attested.environment,p.attested.publicKeyPem,p.attested.counter);
   db.prepare('INSERT INTO apple_installation_links VALUES(?,?,?,?,?)').run(c.installationId,a.environment,a.bundleId,a.appTransactionId,p.commitTime);
   const update=db.prepare('UPDATE ios_enrollment_challenges SET consumed_at_ms=? WHERE id=? AND consumed_at_ms IS NULL').run(p.commitTime,c.challengeId);if(update.changes!==1)throw Error('CHALLENGE_ALREADY_CONSUMED');
   if(p.resume)db.prepare('UPDATE ios_enrollment_resume_challenges SET consumed_at_ms=? WHERE id=? AND consumed_at_ms IS NULL').run(p.commitTime,p.resume.challengeId);
   db.exec('COMMIT');return {committed:true,installationId:c.installationId};
  }catch(error){db.exec('ROLLBACK');throw error;}
 }
 function insertResumeChallenge(c){db.prepare('INSERT INTO ios_enrollment_resume_challenges VALUES(?,?,?,?,?,NULL)').run(c.challengeId,c.originalChallengeId,c.keyId,c.nonceHash,c.expiresAt);}
 function readResumeChallenge(id){const r=db.prepare('SELECT * FROM ios_enrollment_resume_challenges WHERE id=?').get(id);return r?{challengeId:r.id,originalChallengeId:r.original_challenge_id,keyId:r.key_id,nonceHash:r.nonce_hash,expiresAt:r.expires_at_ms,consumed:r.consumed_at_ms!==null}:null;}
 return {insertChallenge,readChallenge,commitEnrollment,insertResumeChallenge,readResumeChallenge};
}
