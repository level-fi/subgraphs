import { Sync } from "../generated/LVLPair/Pair";
import { PriceStat } from "../generated/schema";
import { BigInt } from "@graphprotocol/graph-ts";
import {
  getDayId,
  loadOrCreateProtocol,
  loadOrCreateProtocolStat,
  toDecimal,
} from "../utils/helper";
import { config } from "../../../config";
import { VALUE_DECIMALS } from "../../../config/constant";

export function handleSync(ev: Sync): void {
  const wrapNative = PriceStat.load(`total-${config.wrapNative.toHex()}`);
  if (!wrapNative) {
    return;
  }
  // store total
  const protocol = loadOrCreateProtocol();
  protocol.totalValue = protocol.totalValue.minus(protocol.pairLiquidity);
  const reserveBNB = ev.params.reserve1;
  const totalLiquidity = reserveBNB.times(wrapNative.value).times(BigInt.fromI32(2));
  protocol.pairLiquidity = totalLiquidity;
  protocol.totalValue = protocol.totalValue.plus(protocol.pairLiquidity);

  // store daily
  const dayId = `day-${getDayId(ev.block.timestamp)}`;
  let entity = loadOrCreateProtocolStat(
    dayId,
    "daily",
    getDayId(ev.block.timestamp)
  );
  entity.totalValueLocked = toDecimal(protocol.totalValue, VALUE_DECIMALS);
  entity.llpValue = toDecimal(protocol.poolValue, VALUE_DECIMALS);

  entity.save();
  protocol.save();
}
