import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { OracleReferral } from "../generated/ReferralController/OracleReferral";
import {
  EpochDurationSet,
  EpochStarted,
  Initialized,
  ReferralController,
  ReferralPointUpdated,
  ReferrerSet,
  TradingPointUpdated,
} from "../generated/ReferralController/ReferralController";
import { RebateReferral, TrackingEpoch } from "../generated/schema";
import { config } from "../utils/config";
import { PRECISION, TOKEN_DECIMALS, VALUE_DECIMALS } from "../utils/constant";
import {
  decreasePoint,
  decreaseTierReferrerEpoch,
  decreaseTierTraderEpoch,
  increasePoint,
  increaseTierReferrerEpoch,
  increaseTierTraderEpoch,
  loadOrCreateEpoch,
  loadOrCreateUser,
  loadOrCreateUserEpoch,
  toDecimal,
} from "../utils/helpers";

export function handleTradingPointUpdated(ev: TradingPointUpdated): void {
  const referralContract = ReferralController.bind(ev.address);
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
  let tier = referralContract
    .getUserTier(ev.params.epoch, ev.params.trader)
    .toI32();
  traderEpoch.tier = tier;
  traderEpoch.tradingPoint = traderEpoch.tradingPoint.plus(ev.params.point);
  trader.save();
  epoch.save();
  traderEpoch.save();
}

export function handleReferralPointUpdated(ev: ReferralPointUpdated): void {
  const referralContract = ReferralController.bind(ev.address);
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
  let currentTier = referrerEpoch.tier;
  let referrerCountRef = referrer.referralCount;
  let currentAllocatePoint = config.discount_trader[currentTier]
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

  // user
  let nextTierCall = referralContract.try_getUserTier(
    ev.params.epoch,
    ev.params.referrer
  );
  if (nextTierCall.reverted) {
    return;
  }
  let nextTier = nextTierCall.value.toI32();
  if (currentTier !== nextTier) {
    decreaseTierReferrerEpoch(epoch, currentTier);
    increaseTierReferrerEpoch(epoch, nextTier);

    // update number trader count
    decreaseTierTraderEpoch(epoch, currentTier, referrerCountRef);
    increaseTierTraderEpoch(epoch, nextTier, referrerCountRef);
  }
  let nextPoint = referrerEpoch.referralPoint.plus(ev.params.point);
  trader.save();
  referrer.save();
  if (currentTier !== nextTier) {
    decreasePoint(epoch, currentTier, referrerEpoch.referralPoint);
    increasePoint(epoch, nextTier, nextPoint);
  } else if (nextTier > 0) {
    increasePoint(epoch, nextTier, ev.params.point);
  }
  referrerEpoch.referralPoint = nextPoint;
  referrerEpoch.tier = nextTier;
  referrerEpoch.save();
  traderEpoch.save();
  let nextAllocatePoint = config.discount_trader[nextTier]
    .times(traderEpoch.tradingPoint)
    .div(PRECISION)
    .plus(
      config.rebate_referrer[nextTier]
        .times(referrerEpoch.referralPoint)
        .div(PRECISION)
    )
    .plus(
      config.discount_trader[nextTier]
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
  const referralContract = ReferralController.bind(ev.address);
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
  let currentTier = referrerEpoch.tier;
  let currentAllocatePoint = config.discount_trader[currentTier]
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

  // user
  let nextTierCall = referralContract.try_getUserTier(
    currentEpoch,
    ev.params.referrer
  );
  if (nextTierCall.reverted) {
    return;
  }
  referrer.save();
  let nextReferrerCountRef = referrer.referralCount;
  let nextTier = nextTierCall.value.toI32();

  if (currentTier !== nextTier) {
    decreaseTierReferrerEpoch(epoch, currentTier);
    increaseTierReferrerEpoch(epoch, nextTier);

    // update number trader count;
    decreaseTierTraderEpoch(epoch, currentTier, referrerCountRef);
    increaseTierTraderEpoch(epoch, nextTier, nextReferrerCountRef);

    // update point RP/TP
    decreasePoint(epoch, currentTier, referrerEpoch.referralPoint);
    increasePoint(epoch, nextTier, referrerEpoch.referralPoint);
  } else if (nextTier > 0) {
    increaseTierTraderEpoch(epoch, nextTier, 1);
  }
  referrerEpoch.tier = nextTier;
  referrerEpoch.save();

  let nextAllocatePoint = config.discount_trader[nextTier]
    .times(traderEpoch.tradingPoint)
    .div(PRECISION)
    .plus(
      config.rebate_referrer[nextTier]
        .times(referrerEpoch.referralPoint)
        .div(PRECISION)
    )
    .plus(
      config.discount_trader[nextTier]
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

export function handleInitialized(ev: Initialized): void {
  let entity = getOrCreateTrackingEpoch();
  entity.lastEpochTimestamp = ev.block.timestamp;
  entity.save();
}

export function handleEpochStarted(ev: EpochStarted): void {
  _handleEpochStarted(ev);
}

export function handleEpochDurationSet(ev: EpochDurationSet): void {
  let entity = getOrCreateTrackingEpoch();
  entity.epochDuration = ev.params.epochDuration;
  entity.save();
}

export function getOrCreateRebateReferral(
  day: BigInt,
  start: BigInt,
  end: BigInt
): RebateReferral {
  let entity = RebateReferral.load(day.toHex().toString());
  if (!entity) {
    entity = new RebateReferral(day.toHex().toString());
    entity.epoch = day;
    entity.timestampStart = start;
    entity.timestampEnd = end;
    entity.rewardToLVL = BigDecimal.zero();
    entity.rewardToUsd = BigDecimal.zero();
  }
  return entity;
}

export function getOrCreateTrackingEpoch(): TrackingEpoch {
  let entity = TrackingEpoch.load("1");
  if (!entity) {
    entity = new TrackingEpoch("1");
    entity.currentEpoch = BigInt.zero();
    entity.epochDuration = BigInt.fromI32(86400 * 7);
    entity.lastEpochTimestamp = BigInt.zero();
  }
  return entity;
}

export function _handleEpochStarted(ev: EpochStarted): void {
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
