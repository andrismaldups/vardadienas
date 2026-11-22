import Foundation
import DeviceCheck
import CryptoKit
import Capacitor

@objc(AppAttestEnrollmentPlugin)
public class AppAttestEnrollmentPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppAttestEnrollmentPlugin"
    public let jsName = "AppAttestEnrollment"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "attest", returnType: CAPPluginReturnPromise)
    ]
    private let keyName = "vardadienas_appattest_enrollment_key_v1"
    private let attestedName = "vardadienas_appattest_enrollment_attested_v1"
    @MainActor private var busy = false
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
            guard !UserDefaults.standard.bool(forKey: self.attestedName) else {
                call.reject("Existing attested key needs server recovery.", "ATTEST_RECOVERY_REQUIRED"); return
            }
            var attemptedAttestation = false
            do {
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
                call.resolve(["keyId": key, "attestation": attestation.base64EncodedString(), "signedAppTransaction": jws])
            } catch {
                if let deviceError = error as? DCError, deviceError.code == .serverUnavailable {
                    // Apple instructs retry with this SAME key after serverUnavailable.
                    call.reject("Apple attestation service unavailable.", "ATTEST_RETRY_LATER")
                } else {
                    if attemptedAttestation { UserDefaults.standard.removeObject(forKey: self.keyName) }
                    call.reject("Enrollment proof unavailable.", "ATTEST_FAILED")
                }
            }
        }
    }
}
