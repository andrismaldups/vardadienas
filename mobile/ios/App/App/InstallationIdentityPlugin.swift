import Foundation
import Security
import Capacitor
import CryptoKit
import DeviceCheck

private struct InstallationCredential: Codable, Equatable {
    let version: Int
    let installationId: String
    let token: String
    let bundleId: String
    let environment: String
}
private struct IdentityEnvelope: Codable {
    let version: Int
    let installMarker: String
    let credential: InstallationCredential
}
private enum IdentityFailure: Error { case unavailable, invalid, recovery, conflict }

@objc(InstallationIdentityPlugin)
public class InstallationIdentityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "InstallationIdentityPlugin"
    public let jsName = "InstallationIdentity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "read", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "store", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "recoveryKey", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "recoveryAssertion", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finishRecovery", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deletionState", returnType: CAPPluginReturnPromise)
    ]
    private static let work = DispatchQueue(label: "lv.vardadienas.installation-identity")
    private let markerKey = "vardadienas_native_identity_install_marker_v1"
    private func query(account: String = "ios-installation-v1") throws -> [String: Any] {
        guard let bundle = Bundle.main.bundleIdentifier else { throw IdentityFailure.unavailable }
        return [kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: bundle + ".installation-identity",
                kSecAttrAccount as String: account,
                kSecAttrSynchronizable as String: false]
    }
    private func valid(_ value: InstallationCredential) -> Bool {
        value.version == 1 && value.bundleId == Bundle.main.bundleIdentifier && !value.bundleId.hasPrefix("lv.example.") &&
        ["Sandbox", "Production"].contains(value.environment) &&
        value.installationId.range(of: "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$", options: .regularExpression) != nil &&
        value.token.range(of: "^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$", options: .regularExpression) != nil
    }
    private func load() throws -> IdentityEnvelope? {
        var attributes = try query()
        attributes[kSecReturnData as String] = true
        attributes[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        let status = SecItemCopyMatching(attributes as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = result as? Data else { throw IdentityFailure.unavailable }
        guard let envelope = try? JSONDecoder().decode(IdentityEnvelope.self, from: data),
              envelope.version == 1, valid(envelope.credential),
              let marker = UserDefaults.standard.string(forKey: markerKey), marker == envelope.installMarker else {
            throw IdentityFailure.recovery
        }
        return envelope
    }
    private struct PendingRecovery: Codable, Equatable {
        let version: Int
        let installMarker: String
        let recoveryId: String
        let credential: InstallationCredential
        var candidateHash: String { SHA256.hash(data: Data(credential.token.utf8)).map { String(format: "%02x", $0) }.joined() }
    }
    @MainActor private var recoveryBusy = false
    private func pending() throws -> PendingRecovery? {
        var q = try query(account: "ios-recovery-v1")
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        let status = SecItemCopyMatching(q as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = result as? Data else { throw IdentityFailure.unavailable }
        guard let value = try? JSONDecoder().decode(PendingRecovery.self, from: data), value.version == 1,
              valid(value.credential), UUID(uuidString: value.recoveryId) != nil,
              value.installMarker == UserDefaults.standard.string(forKey: markerKey) else { throw IdentityFailure.recovery }
        return value
    }
    private func stage(installation: String, bundle: String, environment: String) throws -> PendingRecovery {
        let old = try load()
        if let old = old {
            guard old.credential.installationId == installation, old.credential.bundleId == bundle,
                  old.credential.environment == environment else { throw IdentityFailure.conflict }
        }
        if let value = try pending() {
            guard value.credential.installationId == installation, value.credential.bundleId == bundle,
                  value.credential.environment == environment else { throw IdentityFailure.conflict }
            return value
        }
        var bytes = [UInt8](repeating: 0, count: 32)
        guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else { throw IdentityFailure.unavailable }
        let token = Data(bytes).base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
        let credential = InstallationCredential(version: 1, installationId: installation, token: token, bundleId: bundle, environment: environment)
        guard valid(credential) else { throw IdentityFailure.invalid }
        let marker = UserDefaults.standard.string(forKey: markerKey) ?? UUID().uuidString
        UserDefaults.standard.set(marker, forKey: markerKey)
        let value = PendingRecovery(version: 1, installMarker: marker, recoveryId: UUID().uuidString.lowercased(), credential: credential)
        var q = try query(account: "ios-recovery-v1")
        q[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        q[kSecValueData as String] = try JSONEncoder().encode(value)
        guard SecItemAdd(q as CFDictionary, nil) == errSecSuccess, try pending() == value else { throw IdentityFailure.recovery }
        return value
    }
    // Never returns the pending token to JavaScript.
    @objc func recoveryKey(_ call: CAPPluginCall) {
        guard UserDefaults.standard.bool(forKey: "vardadienas_appattest_enrollment_attested_v1"),
              let key = UserDefaults.standard.string(forKey: "vardadienas_appattest_enrollment_key_v1") else {
            reject(call, IdentityFailure.recovery); return
        }
        call.resolve(["keyId": key])
    }
    @objc func deletionState(_ call: CAPPluginCall) {
        Self.work.async {
            do {
                let credential = try self.load()
                let pending = try self.pending()
                call.resolve(["blocked": credential != nil || pending != nil])
            } catch { self.reject(call, error) }
        }
    }
    @objc func recoveryAssertion(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *), let id = call.getString("challengeId"), UUID(uuidString: id) != nil,
              let installation = call.getString("installationId"), UUID(uuidString: installation) != nil,
              let bundle = call.getString("bundleId"), bundle == Bundle.main.bundleIdentifier,
              let environment = call.getString("identityEnvironment"), ["Sandbox", "Production"].contains(environment),
              let nonce = call.getString("challenge"), nonce.range(of: "^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$", options: .regularExpression) != nil,
              let key = call.getString("keyId"), key == UserDefaults.standard.string(forKey: "vardadienas_appattest_enrollment_key_v1"),
              UserDefaults.standard.bool(forKey: "vardadienas_appattest_enrollment_attested_v1") else { reject(call, IdentityFailure.invalid); return }
        Task { @MainActor in
            guard !self.recoveryBusy else { call.reject("Recovery busy.", "IDENTITY_BUSY"); return }
            self.recoveryBusy = true
            defer { self.recoveryBusy = false }
            do {
                guard DCAppAttestService.shared.isSupported else { throw IdentityFailure.unavailable }
                let value: PendingRecovery = try await withCheckedThrowingContinuation { continuation in
                    Self.work.async {
                        do { continuation.resume(returning: try self.stage(installation: installation, bundle: bundle, environment: environment)) }
                        catch { continuation.resume(throwing: error) }
                    }
                }
                let context = ["vardadienas.recover.v1", id, installation, bundle, environment, nonce, key, value.recoveryId, value.candidateHash].joined(separator: "\n")
                let assertion: Data = try await withCheckedThrowingContinuation { continuation in
                    DCAppAttestService.shared.generateAssertion(key, clientDataHash: Data(SHA256.hash(data: Data(context.utf8)))) { result, error in
                        if let error = error { continuation.resume(throwing: error) }
                        else if let result = result { continuation.resume(returning: result) }
                        else { continuation.resume(throwing: IdentityFailure.unavailable) }
                    }
                }
                call.resolve(["recoveryId": value.recoveryId, "candidateHash": value.candidateHash, "assertion": assertion.base64EncodedString()])
            } catch { self.reject(call, error) }
        }
    }
    @objc func finishRecovery(_ call: CAPPluginCall) {
        guard let installation = call.getString("installationId"), let recoveryId = call.getString("recoveryId"),
              let candidateHash = call.getString("candidateHash") else { reject(call, IdentityFailure.invalid); return }
        Self.work.async {
            do {
                // Retain the pending record as a durable receipt: repeated acknowledgements
                // and a lost native callback can complete idempotently after app restart.
                guard let value = try self.pending(), value.credential.installationId == installation,
                      value.recoveryId == recoveryId, value.candidateHash == candidateHash else { throw IdentityFailure.recovery }
                let old = try self.load()
                if let old = old {
                    guard old.credential.installationId == installation, old.credential.bundleId == value.credential.bundleId,
                          old.credential.environment == value.credential.environment else { throw IdentityFailure.conflict }
                }
                let envelope = IdentityEnvelope(version: 1, installMarker: value.installMarker, credential: value.credential)
                let data = try JSONEncoder().encode(envelope)
                if old != nil {
                    guard SecItemUpdate(try self.query() as CFDictionary, [kSecValueData as String: data] as CFDictionary) == errSecSuccess else { throw IdentityFailure.unavailable }
                } else {
                    var q = try self.query()
                    q[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
                    q[kSecValueData as String] = data
                    guard SecItemAdd(q as CFDictionary, nil) == errSecSuccess else { throw IdentityFailure.unavailable }
                }
                guard try self.load()?.credential == value.credential else { throw IdentityFailure.recovery }
                call.resolve(["stored": true])
            } catch { self.reject(call, error) }
        }
    }
    private func reject(_ call: CAPPluginCall, _ error: Error) {
        let code: String
        switch error {
        case IdentityFailure.recovery: code = "IDENTITY_RECOVERY_REQUIRED"
        case IdentityFailure.conflict: code = "IDENTITY_CONFLICT"
        case IdentityFailure.invalid: code = "IDENTITY_INVALID"
        default: code = "IDENTITY_UNAVAILABLE"
        }
        call.reject("Installation identity operation could not be completed.", code)
    }
    @objc func read(_ call: CAPPluginCall) {
        Self.work.async {
            do {
                guard let value = try self.load() else { call.resolve(["record": NSNull()]); return }
                let data = try JSONEncoder().encode(value.credential)
                guard let text = String(data: data, encoding: .utf8) else { throw IdentityFailure.invalid }
                call.resolve(["record": text])
            } catch { self.reject(call, error) }
        }
    }
    @objc func store(_ call: CAPPluginCall) {
        guard let text = call.getString("record"), let data = text.data(using: .utf8), data.count <= 4096 else {
            reject(call, IdentityFailure.invalid); return
        }
        Self.work.async {
            do {
                let expectedKeys: Set<String> = ["version", "installationId", "token", "bundleId", "environment"]
                guard let fields = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                      Set(fields.keys) == expectedKeys,
                      let credential = try? JSONDecoder().decode(InstallationCredential.self, from: data),
                      self.valid(credential) else { throw IdentityFailure.invalid }
                guard try self.pending() == nil else { throw IdentityFailure.recovery }
                if let old = try self.load() {
                    guard old.credential == credential else { throw IdentityFailure.conflict }
                    call.resolve(["stored": true]); return
                }
                let marker = UserDefaults.standard.string(forKey: self.markerKey) ?? UUID().uuidString
                UserDefaults.standard.set(marker, forKey: self.markerKey)
                let envelope = IdentityEnvelope(version: 1, installMarker: marker, credential: credential)
                var attributes = try self.query()
                attributes[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
                attributes[kSecValueData as String] = try JSONEncoder().encode(envelope)
                let status = SecItemAdd(attributes as CFDictionary, nil)
                guard status == errSecSuccess else { throw IdentityFailure.unavailable }
                guard try self.load()?.credential == credential else { throw IdentityFailure.recovery }
                call.resolve(["stored": true])
            } catch { self.reject(call, error) }
        }
    }
}
