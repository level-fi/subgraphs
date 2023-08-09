import { NEGATIVE_ONE, TOKEN_DECIMALS } from "../../../config/constant";
import { Staked, Unstaked } from "../generated/DaoStaking/DaoStaking";
import {
  getDayId,
  isTestnet,
  loadOrCreateDaoStaking,
  toDecimal,
} from "../utils/helper";
import { BigInt, dataSource } from "@graphprotocol/graph-ts";

export function handleStaked(ev: Staked): void {
  const stakeAmount =
    !isTestnet && ev.block.number.ge(BigInt.fromI32(26549295)) // block update staking fee
      ? ev.params.amount
          .times(BigInt.fromI32(1000 - 4))
          .div(BigInt.fromI32(1000))
      : ev.params.amount;
  _store("stake", ev.block.timestamp, stakeAmount);
}

export function handleUnStaked(ev: Unstaked): void {
  _store("unStake", ev.block.timestamp, ev.params.amount.times(NEGATIVE_ONE));
}

function _store(type: string, timestamp: BigInt, amount: BigInt): void {
  // store total
  const totalEntity = loadOrCreateDaoStaking(
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
  let entity = loadOrCreateDaoStaking(dayId, "daily", getDayId(timestamp));
  entity.setBigDecimal(
    type,
    entity.getBigDecimal(type).plus(toDecimal(amount, TOKEN_DECIMALS))
  );
  entity.cumulative = totalEntity.cumulative;

  entity.save();
  totalEntity.save();
}
