import Foundation
import StoreKit
import CryptoKit

enum PurchaseProofFailure: String, Error {
    case unverified = "PURCHASE_UNVERIFIED"
    case deviceMismatch = "PURCHASE_DEVICE_MISMATCH"
    case invalid = "PURCHASE_INVALID"
}
@available(iOS 16.0, *)
enum VerifiedAppPurchase {
    @MainActor static func read(refresh: Bool = false) async throws -> String {
        let result: VerificationResult<AppTransaction>
        if refresh { result = try await AppTransaction.refresh() }
        else { result = try await AppTransaction.shared }
        switch result {
        case .unverified: throw PurchaseProofFailure.unverified
        case .verified(let app):
            guard app.bundleID == Bundle.main.bundleIdentifier,
                  let device = AppStore.deviceVerificationID else { throw PurchaseProofFailure.deviceMismatch }
            let input = app.deviceVerificationNonce.uuidString.lowercased() + device.uuidString.lowercased()
            guard Data(SHA384.hash(data: Data(input.utf8))) == app.deviceVerification else { throw PurchaseProofFailure.deviceMismatch }
            let jws = result.jwsRepresentation
            guard jws.utf8.count <= 65536,
                  jws.range(of: "^[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$", options: .regularExpression) != nil else { throw PurchaseProofFailure.invalid }
            return jws
        }
    }
}
