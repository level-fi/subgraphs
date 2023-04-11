import { Address, BigInt } from "@graphprotocol/graph-ts";
import { PRICE_FEED_PRECISION } from "../../config/constant";
import { Oracle, PricePosted } from "../generated/Oracle/Oracle";
import { PriceStat } from "../generated/schema";
import {
  getDayId,
  getFourHourId,
  getOneHourId,
  getOneWeekId,
  loadOrCreatePriceStat,
} from "../utils/helper";

export function handlePricePost(ev: PricePosted): void {
  let price = ev.params.price;
  let entity = PriceStat.load(`total-${ev.params.token.toHex()}`);
  if (
    entity &&
    entity.value
      .minus(price)
      .abs()
      .times(PRICE_FEED_PRECISION)
      .div(entity.value)
      .ge(BigInt.fromI32(20000000))
  ) {
    const pool = Oracle.bind(ev.address);
    const callResult = pool.try_getPrice(ev.params.token, true);
    if (callResult.reverted) {
      return;
    }
    price = callResult.value;
  }
  // store total
  storePriceByType(
    `total-${ev.params.token.toHex()}`,
    ev.params.token,
    price,
    getDayId(ev.block.timestamp),
    "total"
  );

  // store daily
  storePriceByType(
    `day-${getDayId(ev.block.timestamp)}-${ev.params.token.toHex()}`,
    ev.params.token,
    price,
    getDayId(ev.block.timestamp),
    "daily"
  );

  // store hour
  storePriceByType(
    `hour-${getOneHourId(ev.block.timestamp)}-${ev.params.token.toHex()}`,
    ev.params.token,
    price,
    getOneHourId(ev.block.timestamp),
    "hourly"
  );

  // store four hour
  storePriceByType(
    `fourhour-${getFourHourId(ev.block.timestamp)}-${ev.params.token.toHex()}`,
    ev.params.token,
    price,
    getFourHourId(ev.block.timestamp),
    "fourhour"
  );

  // store weekly
  storePriceByType(
    `week-${getOneWeekId(ev.block.timestamp)}-${ev.params.token.toHex()}`,
    ev.params.token,
    price,
    getOneWeekId(ev.block.timestamp),
    "weekly"
  );
}

function storePriceByType(
  id: string,
  token: Address,
  value: BigInt,
  timestamp: BigInt,
  period: string
): void {
  const entity = loadOrCreatePriceStat(id, token, period, getDayId(timestamp));
  entity.value = value;
  entity.token = token;
  entity.timestamp = timestamp.toI32();
  entity.period = period;
  entity.save();
}
