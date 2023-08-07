import { NEGATIVE_ONE, TOKEN_DECIMALS } from "../../../config/constant";
import { Staked, Unstaked } from "../generated/LvlStaking/LvlStaking";
import {
  getDayId,
  isTestnet,
  loadOrCreateLvlStaking,
  toDecimal,
} from "../utils/helper";
import { BigInt } from "@graphprotocol/graph-ts";

export function handleStaked(ev: Staked): void {
  const stakeAmount =
    !isTestnet && ev.block.number.ge(BigInt.fromI32(27719565)) // block update staking fee
      ? ev.params._amount
          .times(BigInt.fromI32(1000 - 4))
          .div(BigInt.fromI32(1000))
      : ev.params._amount;
  _store("stake", ev.block.timestamp, stakeAmount);
}

export function handleUnStaked(ev: Unstaked): void {
  _store("unStake", ev.block.timestamp, ev.params._amount.times(NEGATIVE_ONE));
}

function _store(type: string, timestamp: BigInt, amount: BigInt): void {
  // store total
  const totalEntity = loadOrCreateLvlStaking(
    "total",
    "total",
    getDayId(timestamp)
  );
  totalEntity.setBigDecimal(
    type,
    totalEntity.getBigDecimal(type).plus(toDecimal(amount, TOKEN_DECIMALS))
  );
  totalEntity.cumulative = totalEntity.cumulative.plus(
    toDecimal(amount, TOKEN_DECIMALS)
  );

  // store daily
  const dayId = `day-${getDayId(timestamp)}`;
  let entity = loadOrCreateLvlStaking(dayId, "daily", getDayId(timestamp));
  entity.setBigDecimal(
    type,
    entity.getBigDecimal(type).plus(toDecimal(amount, TOKEN_DECIMALS))
  );
  entity.cumulative = totalEntity.cumulative;

  entity.save();
  totalEntity.save();
}
