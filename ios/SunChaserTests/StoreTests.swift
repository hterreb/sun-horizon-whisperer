import StoreKitTest
import XCTest
@testable import SunChaser

// Premium through the App Store (Store.swift) against the local StoreKit configuration
// (ios/SunChaser.storekit): the Play SKU maps to the App Store product, a purchase is listed,
// a refund or a failed purchase is not. A successful Store.buy is not tested here: without a
// development team, Xcode's StoreKit test environment answers an app purchase with
// ASDServerErrorDomain 537 (Xcode 27.1, iOS 27.0); check it in the sandbox (ios/README.md).
final class StoreTests: XCTestCase {
    private var session: SKTestSession!

    override func setUpWithError() throws {
        let configuration = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("SunChaser.storekit")
        session = try SKTestSession(contentsOf: configuration)
        session.disableDialogs = true
        session.clearTransactions()
    }

    func testDetailsGiveThePlaySkuAndThePrice() async throws {
        XCTAssertEqual(Store.productID(sku: "premium"), "com.ainabler.sunchaser.premium")
        let details = try await Store.details(skus: ["premium"])
        XCTAssertEqual(details.count, 1)
        XCTAssertEqual(details.first?["itemId"] as? String, "premium")
        let price = details.first?["price"] as? [String: String]
        XCTAssertEqual(price?["value"], "3.99")
        XCTAssertEqual(price?["currency"], "USD")
    }

    func testABoughtPremiumIsListedAndARefundedOneIsNot() async throws {
        let before = await Store.purchases()
        XCTAssertTrue(before.isEmpty)

        try session.buyProduct(productIdentifier: "com.ainabler.sunchaser.premium")
        let purchases = await Store.purchases()
        XCTAssertEqual(purchases.compactMap { $0["itemId"] as? String }, ["premium"])

        let transaction = try XCTUnwrap(session.allTransactions().first)
        XCTAssertEqual(purchases.first?["purchaseToken"] as? String, String(transaction.identifier))
        try session.refundTransaction(identifier: transaction.identifier)
        // StoreKit applies the refund a moment later.
        var afterRefund = await Store.purchases()
        for _ in 0..<30 where !afterRefund.isEmpty {
            try await Task.sleep(nanoseconds: 100_000_000)
            afterRefund = await Store.purchases()
        }
        XCTAssertTrue(afterRefund.isEmpty)
    }

    func testAFailedPurchaseThrowsAndListsNothing() async {
        session.failTransactionsEnabled = true
        do {
            _ = try await Store.buy(sku: "premium")
            XCTFail("The purchase should fail")
        } catch {}
        let purchases = await Store.purchases()
        XCTAssertTrue(purchases.isEmpty)
    }

    func testAnUnknownSkuThrows() async {
        do {
            _ = try await Store.buy(sku: "nothing")
            XCTFail("An unknown SKU should throw")
        } catch {
            XCTAssertEqual(error as? Store.Failure, .unknownProduct)
        }
    }
}
