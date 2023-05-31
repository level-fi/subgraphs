import { Sync } from "../generated/LVLPair/Pair";
import { PriceStat } from "../generated/schema";
import { config } from "../../config";
import { BigInt } from "@graphprotocol/graph-ts";
import { TOKEN_DECIMALS, VALUE_DECIMALS } from "../../config/constant";
import {
  getDayId,
  loadOrCreateProtocol,
  loadOrCreateProtocolStat,
  toDecimal,
} from "../utils/helper";

export function handleSync(ev: Sync): void {
  const wbnb = PriceStat.load(`total-${config.tokens.wbnb.toHex()}`);
  if (!wbnb) {
    return;
  }
  // store total
  const protocol = loadOrCreateProtocol();
  protocol.totalValue = protocol.totalValue.minus(protocol.pairLiquidity);
  const reserveBNB = ev.params.reserve1;
  const totalLiquidity = reserveBNB.times(wbnb.value).times(BigInt.fromI32(2));
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
