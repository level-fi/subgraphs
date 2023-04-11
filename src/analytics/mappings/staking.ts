import { Staked, Unstaked } from "../generated/LevelStake/Staking";
import { config } from "../../config";
import { TOKEN_DECIMALS, VALUE_DECIMALS } from "../../config/constant";
import {
  getDayId,
  loadOrCreateLevelDistribution,
  loadOrCreateProtocol,
  loadOrCreateProtocolStat,
  toDecimal,
} from "../utils/helper";

export function handleStaked(ev: Staked): void {
  let levelDistribution = loadOrCreateLevelDistribution();
  if (!config.rewardTokenFunds.includes(ev.params.to)) {
    levelDistribution.stakeAmount = levelDistribution.stakeAmount.plus(
      toDecimal(ev.params.amount, TOKEN_DECIMALS)
    );
    levelDistribution.save();
  }

  //save protocol
  const protocol = loadOrCreateProtocol();
  if (config.excludeFunds.includes(ev.params.from)) {
    protocol.lvlCirculatingSupply = protocol.lvlCirculatingSupply.minus(
      ev.params.amount
    );
  }
  // store daily
  const dayId = `day-${getDayId(ev.block.timestamp)}`;
  let entity = loadOrCreateProtocolStat(
    dayId,
    "daily",
    getDayId(ev.block.timestamp)
  );
  entity.lvlCirculatingSupply = toDecimal(
    protocol.lvlCirculatingSupply,
    VALUE_DECIMALS
  );

  entity.save();
  protocol.save();
}

export function handleUnstaked(ev: Unstaked): void {
  let levelDistribution = loadOrCreateLevelDistribution();
  if (!config.rewardTokenFunds.includes(ev.params.to)) {
    levelDistribution.stakeAmount = levelDistribution.stakeAmount.minus(
      toDecimal(ev.params.amount, TOKEN_DECIMALS)
    );
    levelDistribution.save();
  }

  //save protocol
  // store total
  const protocol = loadOrCreateProtocol();
  if (config.excludeFunds.includes(ev.params.from)) {
    protocol.lvlCirculatingSupply = protocol.lvlCirculatingSupply.plus(
      ev.params.amount
    );
  }
  // store daily
  const dayId = `day-${getDayId(ev.block.timestamp)}`;
  let entity = loadOrCreateProtocolStat(
    dayId,
    "daily",
    getDayId(ev.block.timestamp)
  );
  entity.lvlCirculatingSupply = toDecimal(
    protocol.lvlCirculatingSupply,
    TOKEN_DECIMALS
  );

  entity.save();
  protocol.save();
}
