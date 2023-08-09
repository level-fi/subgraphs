import { BigInt } from "@graphprotocol/graph-ts";
import { Oracle, PricePosted } from "../generated/Oracle/Oracle";
import { PriceStat } from "../generated/schema";
import { PRICE_FEED_PRECISION, ZERO } from "../../../config/constant";

export function handlePricePost(ev: PricePosted): void {
  let price = ev.params.price;
  let entity = PriceStat.load(ev.params.token.toHex());
  if (
    entity &&
    (entity.value.equals(ZERO) ||
      entity.value
        .minus(price)
        .abs()
        .times(PRICE_FEED_PRECISION)
        .div(entity.value)
        .ge(BigInt.fromI32(20000000)))
  ) {
    const pool = Oracle.bind(ev.address);
    const callResult = pool.try_getPrice(ev.params.token, true);
    if (callResult.reverted) {
      return;
    }
    price = callResult.value;
  }
  if (entity === null) {
    entity = new PriceStat(ev.params.token.toHex());
    entity.value = ZERO;
    entity.token = ev.params.token;
  }
  entity.value = price;
  entity.save();
}
