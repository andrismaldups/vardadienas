import Foundation
import StoreKit
import CryptoKit
import Capacitor

@objc(AppPurchaseProofPlugin)
public class AppPurchaseProofPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppPurchaseProofPlugin"
    public let jsName = "AppPurchaseProof"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "read", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "refresh", returnType: CAPPluginReturnPromise)
    ]
    @MainActor private var reading = false

    @objc func read(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else { call.reject("StoreKit app proof requires iOS 16.", "PURCHASE_UNSUPPORTED"); return }
        Task { @MainActor in await self.obtain(call, refresh: false) }
    }
    @objc func refresh(_ call: CAPPluginCall) {
        guard call.getBool("userInitiated") == true else { call.reject("User action required.", "PURCHASE_USER_ACTION_REQUIRED"); return }
        guard #available(iOS 16.0, *) else { call.reject("StoreKit app proof requires iOS 16.", "PURCHASE_UNSUPPORTED"); return }
        Task { @MainActor in await self.obtain(call, refresh: true) }
    }
    @available(iOS 16.0, *)
    @MainActor private func obtain(_ call: CAPPluginCall, refresh: Bool) async {
        guard !reading else { call.reject("Purchase proof operation is in progress.", "PURCHASE_OPERATION_IN_PROGRESS"); return }
        reading = true
        defer { reading = false }
        do {
            let result: VerificationResult<AppTransaction>
            if refresh { result = try await AppTransaction.refresh() }
            else { result = try await AppTransaction.shared }
            switch result {
            case .unverified:
                call.reject("App purchase could not be verified.", "PURCHASE_UNVERIFIED")
            case .verified(let app):
                guard app.bundleID == Bundle.main.bundleIdentifier,
                      let device = AppStore.deviceVerificationID else {
                    call.reject("App purchase device scope is unavailable.", "PURCHASE_DEVICE_MISMATCH"); return
                }
                let input = app.deviceVerificationNonce.uuidString.lowercased() + device.uuidString.lowercased()
                guard Data(SHA384.hash(data: Data(input.utf8))) == app.deviceVerification else {
                    call.reject("App purchase device scope does not match.", "PURCHASE_DEVICE_MISMATCH"); return
                }
                let jws = result.jwsRepresentation
                guard jws.utf8.count <= 65536,
                      jws.range(of: "^[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$", options: .regularExpression) != nil else {
                    call.reject("App purchase proof format is invalid.", "PURCHASE_INVALID"); return
                }
                // Only signed proof crosses the bridge. No client-created purchase date,
                // expiry or active flag. Server independently verifies the Apple signature.
                call.resolve(["signedAppTransaction": jws])
            }
        } catch {
            call.reject("App purchase proof is unavailable.", "PURCHASE_UNAVAILABLE")
        }
    }
}
