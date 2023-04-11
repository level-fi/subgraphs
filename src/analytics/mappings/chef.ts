import {
  Harvest,
  LevelMaster,
  LogPoolAddition,
  LogRewardPerSecond,
  LogSetPool,
} from "../generated/LevelMaster/LevelMaster";
import { ChefConfig } from "../generated/schema";
import { config } from "../../config";
import { TOKEN_DECIMALS, ZERO } from "../../config/constant";
import { loadOrCreateLevelDistribution, toDecimal } from "../utils/helper";

export function handleLogRewardPerSecond(ev: LogRewardPerSecond): void {
  let entity = _loadOrCreateChefConfig();
  if (entity.totalAllocationPoint.gt(ZERO)) {
    const duration = ev.block.timestamp.minus(entity.lastUpdateTimeStamp);
    let lvlDistribution = loadOrCreateLevelDistribution();
    lvlDistribution.pendingRewardAmount =
      lvlDistribution.pendingRewardAmount.plus(
        toDecimal(
          duration
            .times(entity.rewardPerSecond)
            .times(entity.rewardAllocationPoint)
            .div(entity.totalAllocationPoint),
          TOKEN_DECIMALS
        )
      );
    lvlDistribution.save();
  }

  entity.rewardPerSecond = ev.params.rewardPerSecond;
  entity.lastUpdateTimeStamp = ev.block.timestamp;
  entity.save();
}

export function handleLogSetPool(ev: LogSetPool): void {
  let entity = _loadOrCreateChefConfig();
  if (ev.params.pid.equals(config.rewardPoolId)) {
    entity.rewardAllocationPoint = ev.params.allocPoint;
  }
  const chef = LevelMaster.bind(ev.address);
  const totalAllocationPoint = chef.try_totalAllocPoint();
  if (totalAllocationPoint.reverted) {
    return;
  }
  entity.totalAllocationPoint = totalAllocationPoint.value;
  if (entity.totalAllocationPoint.gt(ZERO)) {
    const duration = ev.block.timestamp.minus(entity.lastUpdateTimeStamp);
    let lvlDistribution = loadOrCreateLevelDistribution();
    lvlDistribution.pendingRewardAmount =
      lvlDistribution.pendingRewardAmount.plus(
        toDecimal(
          duration
            .times(entity.rewardPerSecond)
            .times(entity.rewardAllocationPoint)
            .div(entity.totalAllocationPoint),
          TOKEN_DECIMALS
        )
      );
    lvlDistribution.save();
  }
  entity.lastUpdateTimeStamp = ev.block.timestamp;
  entity.save();
}

export function handleLogPoolAddition(ev: LogPoolAddition): void {
  let entity = _loadOrCreateChefConfig();
  if (ev.params.pid.equals(config.rewardPoolId)) {
    entity.rewardAllocationPoint = ev.params.allocPoint;
  }
  const chef = LevelMaster.bind(ev.address);
  const totalAllocationPoint = chef.try_totalAllocPoint();
  if (totalAllocationPoint.reverted) {
    return;
  }
  entity.totalAllocationPoint = totalAllocationPoint.value;
  entity.lastUpdateTimeStamp = ev.block.timestamp;
  if (entity.totalAllocationPoint.gt(ZERO)) {
    const duration = ev.block.timestamp.minus(entity.lastUpdateTimeStamp);
    let lvlDistribution = loadOrCreateLevelDistribution();
    lvlDistribution.pendingRewardAmount =
      lvlDistribution.pendingRewardAmount.plus(
        toDecimal(
          duration
            .times(entity.rewardPerSecond)
            .times(entity.rewardAllocationPoint)
            .div(entity.totalAllocationPoint),
          TOKEN_DECIMALS
        )
      );
    lvlDistribution.save();
  }
  entity.save();
}

export function handleHarvest(ev: Harvest): void {
  if (ev.params.pid.equals(config.rewardPoolId)) {
    let entity = _loadOrCreateChefConfig();
    if (entity.totalAllocationPoint.gt(ZERO)) {
      const duration = ev.block.timestamp.minus(entity.lastUpdateTimeStamp);
      let lvlDistribution = loadOrCreateLevelDistribution();
      lvlDistribution.pendingRewardAmount =
        lvlDistribution.pendingRewardAmount.plus(
          toDecimal(
            duration
              .times(entity.rewardPerSecond)
              .times(entity.rewardAllocationPoint)
              .div(entity.totalAllocationPoint),
            TOKEN_DECIMALS
          )
        );
      lvlDistribution.save();
    }
    entity.lastUpdateTimeStamp = ev.block.timestamp;
    entity.save();
  }
}

function _loadOrCreateChefConfig(): ChefConfig {
  let entity = ChefConfig.load(`chef-config`);
  if (!entity) {
    entity = new ChefConfig(`chef-config`);
    entity.rewardAllocationPoint = ZERO;
    entity.totalAllocationPoint = ZERO;
    entity.rewardPerSecond = ZERO;
    entity.lastUpdateTimeStamp = ZERO;
  }
  return entity;
}
