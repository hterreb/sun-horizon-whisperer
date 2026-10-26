import StoreKit
import UIKit

// Premium through the App Store (guideline 3.1.1, ROADMAP items 45 and 182). The page's
// usePremium speaks the Digital Goods API and Payment Request of the Play app; the page
// script (Bridge.swift) maps them to these calls. The App Store product ID is the bundle ID
// plus the Play SKU: `premium` → `com.ainabler.sunchaser.premium` (non-consumable).
enum Store {
    enum Failure: LocalizedError {
        case unknownProduct, unverified
        var errorDescription: String? { self == .unknownProduct ? "Unknown product" : "Unverified purchase" }
    }

    static func productID(sku: String) -> String { "\(Bundle.main.bundleIdentifier ?? "com.ainabler.sunchaser").\(sku)" }
    static func sku(productID: String) -> String { productID.components(separatedBy: ".").last ?? productID }

    // Digital Goods getDetails: [{ itemId, title, price: { currency, value } }].
    static func details(skus: [String]) async throws -> [[String: Any]] {
        try await Product.products(for: skus.map { productID(sku: $0) }).map { product in
            [
                "itemId": sku(productID: product.id),
                "title": product.displayName,
                "price": ["currency": product.priceFormatStyle.currencyCode, "value": "\(product.price)"],
            ]
        }
    }

    // Digital Goods listPurchases: the verified, not refunded purchases of this Apple ID.
    static func purchases() async -> [[String: Any]] {
        var owned: [[String: Any]] = []
        for await entitlement in Transaction.currentEntitlements {
            if case .verified(let transaction) = entitlement, transaction.revocationDate == nil {
                owned.append(["itemId": sku(productID: transaction.productID), "purchaseToken": String(transaction.id)])
            }
        }
        return owned
    }

    // Payment Request show(): the purchase token, or nil when the user cancels or the
    // purchase waits for approval (Ask to Buy; it then comes through `finishUpdates`).
    static func buy(sku: String) async throws -> String? {
        guard let product = try await Product.products(for: [productID(sku: sku)]).first else { throw Failure.unknownProduct }
        // StoreKit shows its sheet in the app's window scene.
        let scene = await MainActor.run { UIApplication.shared.connectedScenes.first { $0 is UIWindowScene } }
        let result = if #available(iOS 17.0, *), let scene { try await product.purchase(confirmIn: scene) } else { try await product.purchase() }
        switch result {
        case .success(.verified(let transaction)):
            await transaction.finish()
            return String(transaction.id)
        case .success(.unverified):
            throw Failure.unverified
        default:
            return nil
        }
    }

    // Finishes purchases made outside the buy flow (Ask to Buy, another device), as StoreKit
    // asks. The page sees them at its next listPurchases (start or Restore).
    static func finishUpdates() {
        Task.detached {
            for await update in Transaction.updates {
                if case .verified(let transaction) = update { await transaction.finish() }
            }
        }
    }
}
