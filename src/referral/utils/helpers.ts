import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { Epoch, UserEpoch, User } from "../generated/schema";
import { VALUE_DECIMALS, ZERO } from "./constant";

export function toDecimal(value: BigInt, decimal: number): BigDecimal {
  return value.divDecimal(
    BigInt.fromI32(10)
      .pow(decimal as i8)
      .toBigDecimal()
  );
}

export function loadOrCreateEpoch(
  id: BigInt,
  start: BigInt,
  end: BigInt
): Epoch {
  let epoch = Epoch.load(id.toString());
  if (epoch) {
    return epoch;
  }
  epoch = new Epoch(id.toString());
  epoch.allocationValue = ZERO;
  epoch.pointTierFirst = BigDecimal.zero();
  epoch.pointTierSecond = BigDecimal.zero();
  epoch.pointTierThird = BigDecimal.zero();
  epoch.epoch = id;
  epoch.timestampEnd = end;
  epoch.timestampStart = start;
  epoch.tierFirstReferrerCount = 0;
  epoch.tierSecondReferrerCount = 0;
  epoch.tierThirdReferrerCount = 0;
  epoch.tierFirstTraderCount = 0;
  epoch.tierSecondTraderCount = 0;
  epoch.tierThirdTraderCount = 0;
  return epoch;
}

export function loadOrCreateUserEpoch(epoch: Epoch, user: User): UserEpoch {
  let userEpoch = UserEpoch.load(`${epoch.id}-${user.id}`);
  if (userEpoch) {
    return userEpoch;
  }
  userEpoch = new UserEpoch(`${epoch.id}-${user.id}`);
  userEpoch.epoch = epoch.id;
  userEpoch.user = user.id;
  userEpoch.tier = 0;
  userEpoch.preTier = 0;
  userEpoch.tradingPoint = ZERO;
  userEpoch.referralPoint = ZERO;
  return userEpoch;
}

export function loadOrCreateUser(address: Address): User {
  let entity = User.load(address.toHex());

  if (entity != null) {
    return entity;
  }
  entity = new User(address.toHex());
  entity.referralCount = 0;
  entity.referralVolume = ZERO;
  entity.traderReferralCount = 0;
  entity.traderReferralVolume = ZERO;
  return entity;
}

export function increaseTierReferrerEpoch(epoch: Epoch, tier: i32): void {
  switch (tier) {
    case 1:
      epoch.tierFirstReferrerCount++;
      break;
    case 2:
      epoch.tierSecondReferrerCount++;
      break;
    case 3:
      epoch.tierThirdReferrerCount++;
      break;
    default:
      break;
  }
}

export function increaseTierTraderEpoch(
  epoch: Epoch,
  tier: i32,
  number: i32
): void {
  switch (tier) {
    case 1:
      epoch.tierFirstTraderCount = epoch.tierFirstTraderCount + number;
      break;
    case 2:
      epoch.tierSecondTraderCount = epoch.tierSecondTraderCount + number;
      break;
    case 3:
      epoch.tierThirdTraderCount = epoch.tierThirdTraderCount + number;
      break;
    default:
      break;
  }
}

export function decreaseTierReferrerEpoch(epoch: Epoch, tier: i32): void {
  switch (tier) {
    case 1:
      if (epoch.tierFirstReferrerCount > 0) {
        epoch.tierFirstReferrerCount--;
      }
      break;
    case 2:
      if (epoch.tierSecondReferrerCount > 0) {
        epoch.tierSecondReferrerCount--;
      }
      break;
    case 3:
      if (epoch.tierThirdReferrerCount > 0) {
        epoch.tierThirdReferrerCount--;
      }
      break;
    default:
      break;
  }
}

export function decreaseTierTraderEpoch(
  epoch: Epoch,
  tier: i32,
  number: i32
): void {
  switch (tier) {
    case 1:
      if (epoch.tierFirstTraderCount >= number) {
        epoch.tierFirstTraderCount = epoch.tierFirstTraderCount - number;
      }
      break;
    case 2:
      if (epoch.tierSecondTraderCount >= number) {
        epoch.tierSecondTraderCount = epoch.tierSecondTraderCount - number;
      }
      break;
    case 3:
      if (epoch.tierThirdTraderCount >= number) {
        epoch.tierThirdTraderCount = epoch.tierThirdTraderCount - number;
      }
      break;
    default:
      break;
  }
}

export function increasePoint(epoch: Epoch, tier: i32, number: BigInt): void {
  switch (tier) {
    case 1:
      epoch.pointTierFirst = epoch.pointTierFirst.plus(
        toDecimal(number, VALUE_DECIMALS)
      );
      break;
    case 2:
      epoch.pointTierSecond = epoch.pointTierSecond.plus(
        toDecimal(number, VALUE_DECIMALS)
      );
      break;
    case 3:
      epoch.pointTierThird = epoch.pointTierThird.plus(
        toDecimal(number, VALUE_DECIMALS)
      );
      break;
    default:
      break;
  }
}

export function decreasePoint(epoch: Epoch, tier: i32, number: BigInt): void {
  switch (tier) {
    case 1:
      if (epoch.pointTierFirst.ge(toDecimal(number, VALUE_DECIMALS))) {
        epoch.pointTierFirst = epoch.pointTierFirst.minus(
          toDecimal(number, VALUE_DECIMALS)
        );
      }
      break;
    case 2:
      if (epoch.pointTierSecond.ge(toDecimal(number, VALUE_DECIMALS))) {
        epoch.pointTierSecond = epoch.pointTierSecond.minus(
          toDecimal(number, VALUE_DECIMALS)
        );
      }
      break;
    case 3:
      if (epoch.pointTierThird.ge(toDecimal(number, VALUE_DECIMALS))) {
        epoch.pointTierThird = epoch.pointTierThird.minus(
          toDecimal(number, VALUE_DECIMALS)
        );
      }
      break;
    default:
      break;
  }
}
