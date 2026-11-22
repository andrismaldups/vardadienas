import Foundation
import Security
import Capacitor

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
        CAPPluginMethod(name: "store", returnType: CAPPluginReturnPromise)
    ]
    private static let work = DispatchQueue(label: "lv.vardadienas.installation-identity")
    private let markerKey = "vardadienas_native_identity_install_marker_v1"
    private func query() throws -> [String: Any] {
        guard let bundle = Bundle.main.bundleIdentifier else { throw IdentityFailure.unavailable }
        return [kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: bundle + ".installation-identity",
                kSecAttrAccount as String: "ios-installation-v1",
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
