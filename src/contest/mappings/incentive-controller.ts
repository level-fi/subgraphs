import { BigInt } from "@graphprotocol/graph-ts";
import { IncentiveControllerEpochInfo } from "../generated/schema";
import {
  Allocated,
  Allocated1,
  EpochStarted,
  EpochStarted1,
  EpochStartedV2
} from "../generated/TradingIncentiveController/TradingIncentiveController";
import { ZERO } from "../../config/constant";

function loadOrCreateEpoch(key: string): IncentiveControllerEpochInfo {
  let epochInfo = IncentiveControllerEpochInfo.load(key);
  if (epochInfo == null) {
    epochInfo = new IncentiveControllerEpochInfo(key);
    epochInfo.epoch = BigInt.fromString(key);
  }

  return epochInfo;
}

export function handleEpochStarted(event: EpochStarted): void {
  const epochKey = `${event.params._epoch}`;
  const epochInfo = loadOrCreateEpoch(epochKey);
  epochInfo.blockNumber = event.block.number;
  epochInfo.createdAt = event.block.timestamp;
  epochInfo.epoch = event.params._epoch;
  epochInfo.epochFee = ZERO;
  epochInfo.contestReward = ZERO;
  epochInfo.loyaltyReward = ZERO;
  epochInfo.save();
}

export function handleEpochStarted1(event: EpochStarted1): void {
  const epochKey = `${event.params._epoch}`;
  const epochInfo = loadOrCreateEpoch(epochKey);
  epochInfo.blockNumber = event.block.number;
  epochInfo.createdAt = event.params._timeStart;
  epochInfo.epoch = event.params._epoch;
  epochInfo.epochFee = ZERO;
  epochInfo.contestReward = ZERO;
  epochInfo.loyaltyReward = ZERO;
  epochInfo.save();
}

export function handleEpochStartedV2(event: EpochStartedV2): void {
  const epochKey = `${event.params._epoch}`;
  const epochInfo = loadOrCreateEpoch(epochKey);
  epochInfo.blockNumber = event.block.number;
  epochInfo.createdAt = event.params._timeStart;
  epochInfo.epoch = event.params._epoch;
  epochInfo.epochFee = ZERO;
  epochInfo.contestReward = ZERO;
  epochInfo.loyaltyReward = ZERO;
  epochInfo.save();
}

export function handleEpochAllocated(event: Allocated): void {
  const epochKey = `${event.params._epoch}`;

  let epochInfo = IncentiveControllerEpochInfo.load(epochKey);
  if (epochInfo != null) {
    epochInfo.allocateTime = event.block.timestamp;
    epochInfo.epochFee = event.params._totalFee;
    epochInfo.contestReward = event.params._contestReward;
    epochInfo.loyaltyReward = ZERO;
    epochInfo.save();
  }
}

export function handleEpochAllocatedV2(event: Allocated1): void {
  const epochKey = `${event.params._epoch}`;

  let epochInfo = IncentiveControllerEpochInfo.load(epochKey);
  if (epochInfo != null) {
    epochInfo.allocateTime = event.block.timestamp;
    epochInfo.epochFee = event.params._totalFee;
    epochInfo.contestReward = event.params._contestReward;
    epochInfo.loyaltyReward = event.params._loyaltyRewards;
    epochInfo.save();
  }
}
