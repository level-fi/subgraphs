import { OracleReferral } from "../generated/ReferralControllerV2/OracleReferral";
import {
  EpochDurationSet,
  EpochStarted,
  ReferralPointUpdated,
  ReferrerSet,
  TierUpdated,
  TradingPointUpdated,
} from "../generated/ReferralControllerV2/ReferralControllerV2";
import { TrackingEpoch } from "../generated/schema";
import { config } from "../utils/config";
import { PRECISION, TOKEN_DECIMALS, VALUE_DECIMALS } from "../utils/constant";
import {
  decreaseTierReferrerEpoch,
  decreaseTierTraderEpoch,
  decreasePoint,
  increasePoint,
  increaseTierReferrerEpoch,
  increaseTierTraderEpoch,
  loadOrCreateEpoch,
  loadOrCreateUser,
  loadOrCreateUserEpoch,
  toDecimal,
} from "../utils/helpers";
import {
  getOrCreateRebateReferral,
  getOrCreateTrackingEpoch,
  _handleEpochStarted,
} from "./referral";
import { BigInt } from "@graphprotocol/graph-ts";

export function handleTradingPointUpdated(ev: TradingPointUpdated): void {
  let epochTracking = TrackingEpoch.load("1");
  if (!epochTracking) {
    return;
  }
  // epoch
  let timeStart = epochTracking.lastEpochTimestamp;
  let timeEnd = timeStart.plus(epochTracking.epochDuration);
  let epoch = loadOrCreateEpoch(ev.params.epoch, timeStart, timeEnd);
  // update user
  let trader = loadOrCreateUser(ev.params.trader);
  let traderEpoch = loadOrCreateUserEpoch(epoch, trader);
  traderEpoch.tradingPoint = traderEpoch.tradingPoint.plus(ev.params.point);
  trader.save();
  epoch.save();
  traderEpoch.save();
}

export function handleReferralPointUpdated(ev: ReferralPointUpdated): void {
  let epochTracking = TrackingEpoch.load("1");
  if (!epochTracking) {
    return;
  }
  // epoch
  let timeStart = epochTracking.lastEpochTimestamp;
  let timeEnd = timeStart.plus(epochTracking.epochDuration);
  let epoch = loadOrCreateEpoch(ev.params.epoch, timeStart, timeEnd);
  let referrer = loadOrCreateUser(ev.params.referrer);
  let trader = loadOrCreateUser(ev.params.trader);
  let referrerEpoch = loadOrCreateUserEpoch(epoch, referrer);
  let traderEpoch = loadOrCreateUserEpoch(epoch, trader);
  let preTier = referrerEpoch.preTier;
  let referrerCountRef = referrer.referralCount;
  let currentAllocatePoint = config.discount_trader[preTier]
    .times(traderEpoch.tradingPoint)
    .div(PRECISION)
    .plus(
      config.rebate_referrer[preTier]
        .times(referrerEpoch.referralPoint)
        .div(PRECISION)
    )
    .plus(
      config.discount_trader[preTier]
        .times(referrerEpoch.referralPoint.minus(traderEpoch.tradingPoint))
        .div(PRECISION)
    );

  // user
  let currentTier = referrerEpoch.tier;
  if (preTier !== currentTier) {
    decreaseTierReferrerEpoch(epoch, preTier);
    increaseTierReferrerEpoch(epoch, currentTier);

    // update number trader count
    decreaseTierTraderEpoch(epoch, preTier, referrerCountRef);
    increaseTierTraderEpoch(epoch, currentTier, referrerCountRef);
  }
  let nextPoint = referrerEpoch.referralPoint.plus(ev.params.point);
  trader.save();
  referrer.save();
  if (preTier !== currentTier) {
    decreasePoint(epoch, preTier, referrerEpoch.referralPoint);
    increasePoint(epoch, currentTier, nextPoint);
  } else if (currentTier > 0) {
    increasePoint(epoch, currentTier, ev.params.point);
  }
  referrerEpoch.referralPoint = nextPoint;
  referrerEpoch.preTier = currentTier;
  referrerEpoch.save();
  traderEpoch.save();

  let nextAllocatePoint = config.discount_trader[currentTier]
    .times(traderEpoch.tradingPoint)
    .div(PRECISION)
    .plus(
      config.rebate_referrer[currentTier]
        .times(referrerEpoch.referralPoint)
        .div(PRECISION)
    )
    .plus(
      config.discount_trader[currentTier]
        .times(referrerEpoch.referralPoint.minus(traderEpoch.tradingPoint))
        .div(PRECISION)
    );

  epoch.allocationValue = epoch.allocationValue.plus(
    nextAllocatePoint.minus(currentAllocatePoint)
  );
  epoch.save();

  // update rebate
  let rebateEntity = getOrCreateRebateReferral(
    ev.params.epoch,
    timeStart,
    timeEnd
  );
  rebateEntity.rewardToUsd = toDecimal(epoch.allocationValue, VALUE_DECIMALS);
  rebateEntity.save();
}

export function handleReferrerSet(ev: ReferrerSet): void {
  let epochTracking = TrackingEpoch.load("1");
  if (!epochTracking) {
    return;
  }
  // epoch
  let timeStart = epochTracking.lastEpochTimestamp;
  let timeEnd = timeStart.plus(epochTracking.epochDuration);
  const currentEpoch = epochTracking.currentEpoch;
  let epoch = loadOrCreateEpoch(currentEpoch, timeStart, timeEnd);
  let referrer = loadOrCreateUser(ev.params.referrer);
  let trader = loadOrCreateUser(ev.params.trader);
  let referrerEpoch = loadOrCreateUserEpoch(epoch, referrer);
  let traderEpoch = loadOrCreateUserEpoch(epoch, trader);
  let referrerCountRef = referrer.referralCount;
  referrer.referralCount = referrer.referralCount + 1;
  let preTier = referrerEpoch.preTier;
  let currentAllocatePoint = config.discount_trader[preTier]
    .times(traderEpoch.tradingPoint)
    .div(PRECISION)
    .plus(
      config.rebate_referrer[preTier]
        .times(referrerEpoch.referralPoint)
        .div(PRECISION)
    )
    .plus(
      config.discount_trader[preTier]
        .times(referrerEpoch.referralPoint.minus(traderEpoch.tradingPoint))
        .div(PRECISION)
    );

  // user
  let currentTier = referrerEpoch.tier;
  referrer.save();
  let nextReferrerCountRef = referrer.referralCount;
  if (preTier !== currentTier) {
    decreaseTierReferrerEpoch(epoch, preTier);
    increaseTierReferrerEpoch(epoch, currentTier);

    // update number trader count;
    decreaseTierTraderEpoch(epoch, preTier, referrerCountRef);
    increaseTierTraderEpoch(epoch, currentTier, nextReferrerCountRef);

    // update point RP/TP
    decreasePoint(epoch, preTier, referrerEpoch.referralPoint);
    increasePoint(epoch, currentTier, referrerEpoch.referralPoint);
  } else if (currentTier > 0) {
    increaseTierTraderEpoch(epoch, currentTier, 1);
  }
  referrerEpoch.preTier = currentTier;
  referrerEpoch.save();

  let nextAllocatePoint = config.discount_trader[currentTier]
    .times(traderEpoch.tradingPoint)
    .div(PRECISION)
    .plus(
      config.rebate_referrer[currentTier]
        .times(referrerEpoch.referralPoint)
        .div(PRECISION)
    )
    .plus(
      config.discount_trader[currentTier]
        .times(referrerEpoch.referralPoint.minus(traderEpoch.tradingPoint))
        .div(PRECISION)
    );
  epoch.allocationValue = epoch.allocationValue.plus(
    nextAllocatePoint.minus(currentAllocatePoint)
  );
  epoch.save();

  // update rebate
  let rebateEntity = getOrCreateRebateReferral(
    currentEpoch,
    timeStart,
    timeEnd
  );
  rebateEntity.rewardToUsd = toDecimal(epoch.allocationValue, VALUE_DECIMALS);
  rebateEntity.save();
}

export function handleEpochStarted(ev: EpochStarted): void {
  let epochTracking = TrackingEpoch.load("1");
  if (!epochTracking) {
    return;
  }
  // epoch
  let timeStart = epochTracking.lastEpochTimestamp;
  let timeEnd = timeStart.plus(epochTracking.epochDuration);
  const currentEpoch = epochTracking.currentEpoch;
  let rebateEntity = getOrCreateRebateReferral(
    currentEpoch,
    timeStart,
    timeEnd
  );
  let oracleContract: OracleReferral;
  if (ev.params.epoch.le(config.referral_epoch_update)) {
    oracleContract = OracleReferral.bind(config.lvlOracle);
  } else {
    oracleContract = OracleReferral.bind(config.lvlOracleV2);
  }
  let twapCall = oracleContract.try_lastTWAP();
  if (twapCall.reverted) {
    return;
  }
  let twap = twapCall.value;
  rebateEntity.rewardToLVL = rebateEntity.rewardToUsd
    .times(
      BigInt.fromI32(10)
        .pow(VALUE_DECIMALS - TOKEN_DECIMALS)
        .toBigDecimal()
    )
    .div(twap.toBigDecimal());
  rebateEntity.save();

  //update tracking block
  let entity = getOrCreateTrackingEpoch();
  entity.lastEpochTimestamp = ev.block.timestamp;
  entity.currentEpoch = ev.params.epoch;
  entity.save();
}

export function handleEpochDurationSet(ev: EpochDurationSet): void {
  let entity = getOrCreateTrackingEpoch();
  entity.epochDuration = ev.params.epochDuration;
  entity.save();
}

export function handleTierUpdated(ev: TierUpdated): void {
  let epochTracking = TrackingEpoch.load("1");
  if (!epochTracking) {
    return;
  }
  // epoch
  let timeStart = epochTracking.lastEpochTimestamp;
  let timeEnd = timeStart.plus(epochTracking.epochDuration);
  let epoch = loadOrCreateEpoch(ev.params.epoch, timeStart, timeEnd);
  let user = loadOrCreateUser(ev.params.referrer);
  let referrer = loadOrCreateUserEpoch(epoch, user);
  referrer.preTier = referrer.tier;
  referrer.tier = ev.params.tier.toI32();
  referrer.save();
}
