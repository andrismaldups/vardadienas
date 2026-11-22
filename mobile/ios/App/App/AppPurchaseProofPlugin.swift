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
            let jws = try await VerifiedAppPurchase.read(refresh: refresh)
            call.resolve(["signedAppTransaction": jws])
        } catch let error as PurchaseProofFailure {
            call.reject("App purchase proof could not be verified.", error.rawValue)
        } catch {
            call.reject("App purchase proof is unavailable.", "PURCHASE_UNAVAILABLE")
        }
    }
}
