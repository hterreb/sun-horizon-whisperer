// Digital Goods API v2 (https://wicg.github.io/digital-goods/), only in the Play app
// (TWA with Play Billing, ROADMAP items 14 and 45). Not in lib.dom yet.
interface DigitalGoodsItemDetails {
  itemId: string;
  title: string;
  price: { currency: string; value: string };
}

interface DigitalGoodsPurchaseDetails {
  itemId: string;
  purchaseToken: string;
}

interface DigitalGoodsService {
  getDetails(itemIds: string[]): Promise<DigitalGoodsItemDetails[]>;
  listPurchases(): Promise<DigitalGoodsPurchaseDetails[]>;
  consume(purchaseToken: string): Promise<void>;
  // v1 only (removed in v2); kept optional so the buy flow can use it where it exists.
  acknowledge?(purchaseToken: string, purchaseType: 'onetime' | 'repeatable'): Promise<void>;
}

interface Window {
  getDigitalGoodsService?: (serviceProvider: string) => Promise<DigitalGoodsService>;
}
