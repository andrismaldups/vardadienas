import Foundation
import Security
import DeviceCheck
import CryptoKit
import Capacitor

@objc(AppAttestEnrollmentPlugin)
public class AppAttestEnrollmentPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppAttestEnrollmentPlugin"
    public let jsName = "AppAttestEnrollment"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "attest", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pending", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "resume", returnType: CAPPluginReturnPromise)
    ]
    private let keyName = "vardadienas_appattest_enrollment_key_v1"
    private let attestedName = "vardadienas_appattest_enrollment_attested_v1"
    @MainActor private var busy = false
    private static let storage = DispatchQueue(label: "lv.vardadienas.enrollment-proof")
    private let markerName = "vardadienas_native_identity_install_marker_v1"
    private struct EnrollmentProof: Codable, Equatable {
        let challengeId: String
        let installationId: String
        let bundleId: String
        let challenge: String
        let keyId: String
        let attestation: String
        let signedAppTransaction: String
        var result: [String: Any] { ["challengeId": challengeId, "installationId": installationId, "bundleId": bundleId, "challenge": challenge, "keyId": keyId, "attestation": attestation, "signedAppTransaction": signedAppTransaction] }
    }
    private struct CachedProof: Codable, Equatable {
        let version: Int
        let marker: String
        let proof: EnrollmentProof
    }
    private enum CacheFailure: Error { case unavailable, invalid }
    private func cacheQuery() throws -> [String: Any] {
        guard let bundle = Bundle.main.bundleIdentifier, !bundle.hasPrefix("lv.example.") else { throw CacheFailure.invalid }
        return [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: bundle + ".appattest-enrollment",
                kSecAttrAccount as String: "proof-v1", kSecAttrSynchronizable as String: false]
    }
    private func loadProof() throws -> CachedProof? {
        var query = try cacheQuery()
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = result as? Data, data.count <= 262144 else { throw CacheFailure.unavailable }
        guard let value = try? JSONDecoder().decode(CachedProof.self, from: data), value.version == 1,
              value.marker == UserDefaults.standard.string(forKey: markerName), value.proof.bundleId == Bundle.main.bundleIdentifier,
              value.proof.keyId == UserDefaults.standard.string(forKey: keyName), UUID(uuidString: value.proof.challengeId) != nil,
              UUID(uuidString: value.proof.installationId) != nil,
              value.proof.challenge.range(of: "^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$", options: .regularExpression) != nil,
              !value.proof.attestation.isEmpty, value.proof.attestation.utf8.count <= 131072,
              !value.proof.signedAppTransaction.isEmpty, value.proof.signedAppTransaction.utf8.count <= 65536 else { throw CacheFailure.invalid }
        return value
    }
    private func saveProof(_ proof: EnrollmentProof) throws {
        if let old = try loadProof() { guard old.proof == proof else { throw CacheFailure.invalid }; return }
        let marker = UserDefaults.standard.string(forKey: markerName) ?? UUID().uuidString
        UserDefaults.standard.set(marker, forKey: markerName)
        let value = CachedProof(version: 1, marker: marker, proof: proof)
        let data = try JSONEncoder().encode(value)
        guard data.count <= 262144 else { throw CacheFailure.invalid }
        var query = try cacheQuery()
        query[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        query[kSecValueData as String] = data
        guard SecItemAdd(query as CFDictionary, nil) == errSecSuccess, try loadProof() == value else { throw CacheFailure.unavailable }
    }
    private func onStorage<T>(_ operation: @escaping () throws -> T) async throws -> T {
        try await withCheckedThrowingContinuation { continuation in
            Self.storage.async {
                do { continuation.resume(returning: try operation()) }
                catch { continuation.resume(throwing: error) }
            }
        }
    }
    @objc func pending(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard !self.busy else { call.reject("Enrollment busy.", "ATTEST_BUSY"); return }
            self.busy = true
            defer { self.busy = false }
            do {
                if let cached = try await self.onStorage({ try self.loadProof() }) {
                    UserDefaults.standard.set(true, forKey: self.attestedName)
                    call.resolve(["proof": cached.proof.result])
                } else {
                    guard !UserDefaults.standard.bool(forKey: self.attestedName) else { throw CacheFailure.invalid }
                    call.resolve(["proof": NSNull()])
                }
            } catch { call.reject("Enrollment proof needs recovery.", "ATTEST_RECOVERY_REQUIRED") }
        }
    }
    @objc func resume(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *), let id = call.getString("resumeChallengeId"), UUID(uuidString: id) != nil,
              let originalId = call.getString("originalChallengeId"), let installation = call.getString("installationId"),
              let bundle = call.getString("bundleId"), bundle == Bundle.main.bundleIdentifier,
              let environment = call.getString("identityEnvironment"), ["Sandbox", "Production"].contains(environment),
              let key = call.getString("keyId"), let nonce = call.getString("resumeChallenge"),
              nonce.range(of: "^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$", options: .regularExpression) != nil else {
            call.reject("Invalid resume challenge.", "ATTEST_INVALID"); return
        }
        Task { @MainActor in
            guard !self.busy else { call.reject("Enrollment busy.", "ATTEST_BUSY"); return }
            self.busy = true
            defer { self.busy = false }
            do {
                guard DCAppAttestService.shared.isSupported, let cached = try await self.onStorage({ try self.loadProof() }),
                      cached.proof.challengeId == originalId, cached.proof.installationId == installation,
                      cached.proof.keyId == key, cached.proof.bundleId == bundle else { throw CacheFailure.invalid }
                let p = cached.proof
                let digest: (String) -> String = { SHA256.hash(data: Data($0.utf8)).map { String(format: "%02x", $0) }.joined() }
                let context = ["vardadienas.enroll.resume.v1", id, originalId, installation, bundle, environment, nonce, key, digest(p.attestation), digest(p.signedAppTransaction)].joined(separator: "\n")
                let assertion: Data = try await withCheckedThrowingContinuation { continuation in
                    DCAppAttestService.shared.generateAssertion(key, clientDataHash: Data(SHA256.hash(data: Data(context.utf8)))) { result, error in
                        if let error = error { continuation.resume(throwing: error) }
                        else if let result = result { continuation.resume(returning: result) }
                        else { continuation.resume(throwing: CacheFailure.unavailable) }
                    }
                }
                var result = p.result
                result["resumeChallengeId"] = id
                result["resumeChallenge"] = nonce
                result["assertion"] = assertion.base64EncodedString()
                call.resolve(result)
            } catch { call.reject("Enrollment resume unavailable.", "ATTEST_RECOVERY_REQUIRED") }
        }
    }
    @objc func status(_ call: CAPPluginCall) {
        call.resolve(["supported": DCAppAttestService.shared.isSupported])
    }
    @objc func attest(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else { call.reject("iOS 16 required.", "ATTEST_UNSUPPORTED"); return }
        guard let id = call.getString("challengeId"), let installation = call.getString("installationId"),
              let challenge = call.getString("challenge"), let bundle = call.getString("bundleId"),
              bundle == Bundle.main.bundleIdentifier, !bundle.hasPrefix("lv.example."),
              id.range(of: "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$", options: .regularExpression) != nil,
              installation.range(of: "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$", options: .regularExpression) != nil,
              challenge.range(of: "^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$", options: .regularExpression) != nil else {
            call.reject("Invalid enrollment challenge.", "ATTEST_INVALID"); return
        }
        Task { @MainActor in
            guard !self.busy else { call.reject("Enrollment busy.", "ATTEST_BUSY"); return }
            self.busy = true
            defer { self.busy = false }
            let service = DCAppAttestService.shared
            guard service.isSupported else { call.reject("App Attest unavailable.", "ATTEST_UNSUPPORTED"); return }
            var attemptedAttestation = false
            do {
                if let cached = try await self.onStorage({ try self.loadProof() }) {
                    guard cached.proof.challengeId == id, cached.proof.installationId == installation,
                          cached.proof.bundleId == bundle, cached.proof.challenge == challenge else { throw CacheFailure.invalid }
                    UserDefaults.standard.set(true, forKey: self.attestedName)
                    call.resolve(cached.proof.result); return
                }
                guard !UserDefaults.standard.bool(forKey: self.attestedName) else { throw CacheFailure.invalid }
                // The proof is read inside native code, never accepted from JS.
                let jws = try await VerifiedAppPurchase.read()
                let key: String
                if let existing = UserDefaults.standard.string(forKey: self.keyName) { key = existing }
                else {
                    key = try await withCheckedThrowingContinuation { continuation in
                        service.generateKey { value, error in
                            if let error = error { continuation.resume(throwing: error) }
                            else if let value = value { continuation.resume(returning: value) }
                            else { continuation.resume(throwing: PurchaseProofFailure.invalid) }
                        }
                    }
                    UserDefaults.standard.set(key, forKey: self.keyName)
                }
                let jwsHash = SHA256.hash(data: Data(jws.utf8)).map { String(format: "%02x", $0) }.joined()
                let context = ["vardadienas.enroll.v1", id, installation, bundle, challenge, key, jwsHash].joined(separator: "\n")
                let hash = Data(SHA256.hash(data: Data(context.utf8)))
                attemptedAttestation = true
                let attestation: Data = try await withCheckedThrowingContinuation { continuation in
                    service.attestKey(key, clientDataHash: hash) { value, error in
                        if let error = error { continuation.resume(throwing: error) }
                        else if let value = value { continuation.resume(returning: value) }
                        else { continuation.resume(throwing: PurchaseProofFailure.invalid) }
                    }
                }
                UserDefaults.standard.set(true, forKey: self.attestedName)
                let proof = EnrollmentProof(challengeId: id, installationId: installation, bundleId: bundle, challenge: challenge, keyId: key, attestation: attestation.base64EncodedString(), signedAppTransaction: jws)
                try await self.onStorage { try self.saveProof(proof) }
                call.resolve(proof.result)
            } catch {
                if let deviceError = error as? DCError, deviceError.code == .serverUnavailable {
                    // Apple instructs retry with this SAME key after serverUnavailable.
                    call.reject("Apple attestation service unavailable.", "ATTEST_RETRY_LATER")
                } else {
                    // An ambiguous Apple result must never trigger a blind key reset.
                    if attemptedAttestation { UserDefaults.standard.set(true, forKey: self.attestedName) }
                    call.reject("Enrollment proof unavailable.", "ATTEST_FAILED")
                }
            }
        }
    }
}
