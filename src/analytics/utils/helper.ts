import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { Pool } from "../generated/Pool/Pool";
import {
  FeeStat,
  PriceStat,
  Protocol,
  ProtocolStat,
  RiskFactor,
  TokenDistributionStat,
  TradingPairStat,
  TradingStat,
  Tranche,
  TrancheStat,
  VolumeStat,
} from "../generated/schema";
import { config } from "../../config";
import { DECIMAL_ZERO, FEE_PRECISION, ZERO } from "../../config/constant";

export function toDecimal(value: BigInt, decimal: number): BigDecimal {
  return value.divDecimal(
    BigInt.fromI32(10)
      .pow(decimal as i8)
      .toBigDecimal()
  );
}

export function getDayId(timestamp: BigInt): BigInt {
  const dayTimestamp = (timestamp.toI32() / 86400) * 86400;
  return BigInt.fromI32(dayTimestamp);
}

export function getOneHourId(timestamp: BigInt): BigInt {
  const hourTimestamp = (timestamp.toI32() / 3600) * 3600;
  return BigInt.fromI32(hourTimestamp);
}

export function getFourHourId(timestamp: BigInt): BigInt {
  const fourHourTimestamp = (timestamp.toI32() / (3600 * 4)) * 3600 * 4;
  return BigInt.fromI32(fourHourTimestamp);
}

export function getOneWeekId(timestamp: BigInt): BigInt {
  const weekTimestamp = (timestamp.toI32() / (86400 * 7)) * 86400 * 7;
  return BigInt.fromI32(weekTimestamp);
}

export function emptyArray<T>(size: number, v?: T): T[] {
  const ret: T[] = [];
  for (let i = 0; i < size; i++) {
    if (v) {
      ret[i] = v;
    }
  }
  return ret;
}

export function loadOrCreateVolumeStat(
  id: string,
  period: string,
  timestamp: BigInt
): VolumeStat {
  let entity = VolumeStat.load(id);
  if (entity === null) {
    entity = new VolumeStat(id);
    entity.trading = DECIMAL_ZERO;
    entity.swap = DECIMAL_ZERO;
    entity.total = DECIMAL_ZERO;
    entity.cumulative = DECIMAL_ZERO;
    entity.period = period;
    entity.timestamp = timestamp.toI32();
  }
  return entity;
}

export function loadOrCreateFeeStat(
  id: string,
  period: string,
  timestamp: BigInt
): FeeStat {
  let entity = FeeStat.load(id);
  if (entity === null) {
    entity = new FeeStat(id);
    entity.trading = DECIMAL_ZERO;
    entity.swap = DECIMAL_ZERO;
    entity.mint = DECIMAL_ZERO;
    entity.burn = DECIMAL_ZERO;
    entity.liquidate = DECIMAL_ZERO;
    entity.total = DECIMAL_ZERO;
    entity.cumulative = DECIMAL_ZERO;
    entity.period = period;
    entity.timestamp = timestamp.toI32();
  }
  return entity;
}

export function loadOrCreateTradingStat(
  id: string,
  period: string,
  timestamp: BigInt
): TradingStat {
  let entity = TradingStat.load(id);
  if (entity === null) {
    entity = new TradingStat(id);
    entity.longOpenInterest = DECIMAL_ZERO;
    entity.shortOpenInterest = DECIMAL_ZERO;
    entity.traderPnl = DECIMAL_ZERO;
    entity.cumulativeTraderPnl = DECIMAL_ZERO;
    entity.daoFee = DECIMAL_ZERO;
    entity.cumulativeDaoFee = DECIMAL_ZERO;
    entity.traderFee = DECIMAL_ZERO;
    entity.cumulativeTraderFee = DECIMAL_ZERO;
    entity.period = period;
    entity.timestamp = timestamp.toI32();
  }
  return entity;
}

export function loadOrCreateProtocol(): Protocol {
  let entity = Protocol.load("1");
  if (entity === null) {
    entity = new Protocol("1");
    entity.totalValue = ZERO;
    entity.totalFee = ZERO;
    entity.openInterest = ZERO;
    entity.totalVolume = ZERO;
    entity.poolValue = ZERO;
    entity.pairLiquidity = ZERO;
    entity.totalUsers = 0;
    entity.daoFeeRatio = ZERO;
    entity.lastUpdatedBlock = ZERO;
    const pool = Pool.bind(config.pool);
    const fees = pool.try_fee();
    entity.daoFeeRatio = fees.reverted ? ZERO : fees.value.getDaoFee();
    entity.save();
  }
  return entity;
}

export function loadOrCreateProtocolStat(
  id: string,
  period: string,
  timestamp: BigInt
): ProtocolStat {
  let entity = ProtocolStat.load(id);
  if (entity === null) {
    entity = new ProtocolStat(id);
    entity.totalValueLocked = DECIMAL_ZERO;
    entity.llpValue = DECIMAL_ZERO;
    entity.pairLiquidity = DECIMAL_ZERO;
    entity.lvlCirculatingSupply = DECIMAL_ZERO;
    entity.period = period;
    entity.timestamp = timestamp.toI32();
  }
  return entity;
}

export function loadOrCreateTranche(tranche: Address): Tranche {
  let entity = Tranche.load(tranche.toHex());
  if (entity === null) {
    entity = new Tranche(tranche.toHex());
    entity.trancheValue = ZERO;
    entity.llpSupply = ZERO;
    entity.llpPrice = ZERO;
    entity.totalFeeValue = ZERO;
    entity.tranche = tranche;
  }
  return entity;
}

export function loadOrCreateTrancheStat(
  id: string,
  tranche: Address,
  period: string,
  timestamp: BigInt
): TrancheStat {
  let entity = TrancheStat.load(id);
  if (entity === null) {
    entity = new TrancheStat(id);
    entity.trancheValue = DECIMAL_ZERO;
    entity.llpSupply = DECIMAL_ZERO;
    entity.llpPrice = DECIMAL_ZERO;
    entity.totalFeeValue = DECIMAL_ZERO;
    entity.tranche = tranche;
    entity.period = period;
    entity.timestamp = timestamp.toI32();
  }
  return entity;
}

export function loadOrCreateTokenDistributionStat(
  id: string,
  tranche: Address,
  token: Address,
  period: string,
  timestamp: BigInt
): TokenDistributionStat {
  let entity = TokenDistributionStat.load(id);
  if (entity === null) {
    entity = new TokenDistributionStat(id);
    entity.value = DECIMAL_ZERO;
    entity.token = token;
    entity.tranche = tranche;
    entity.period = period;
    entity.timestamp = timestamp.toI32();
  }
  return entity;
}

export function loadOrCreatePriceStat(
  id: string,
  token: Address,
  period: string,
  timestamp: BigInt
): PriceStat {
  let entity = PriceStat.load(id);
  if (entity === null) {
    entity = new PriceStat(id);
    entity.value = ZERO;
    entity.token = token;
    entity.period = period;
    entity.timestamp = timestamp.toI32();
  }
  return entity;
}

export function loadOrCreateTradingPairStat(
  id: string,
  token: Address,
  period: string,
  timestamp: BigInt
): TradingPairStat {
  let entity = TradingPairStat.load(id);
  if (entity === null) {
    entity = new TradingPairStat(id);
    entity.indexToken = token;
    entity.volume = ZERO;
    entity.volumeUsd = ZERO;
    entity.period = period;
    entity.timestamp = timestamp.toI32();
  }
  return entity;
}

export function loadOrCreateRiskFactor(indexToken: Address): RiskFactor {
  let riskFactorConfig = RiskFactor.load(indexToken.toHex());
  const pool = Pool.bind(config.pool);
  const tranches = config.tranches;
  if (!riskFactorConfig) {
    riskFactorConfig = new RiskFactor(indexToken.toHex());
    riskFactorConfig.token = indexToken;
    const totalRiskFactor = pool.try_totalRiskFactor(indexToken);
    riskFactorConfig.totalRiskFactor = totalRiskFactor.reverted ? ZERO : totalRiskFactor.value;
    let riskFactors = emptyArray<BigInt>(tranches.length, ZERO);
    for (let i = 0; i < tranches.length; i++) {
      const tranche = tranches[i];
      const riskFactor = pool.try_riskFactor(indexToken, tranche);
      const riskFactor_ = riskFactor.reverted ? ZERO : riskFactor.value;
      riskFactors[i] = riskFactor_;
    }
    riskFactorConfig.riskFactors = riskFactors;
    riskFactorConfig.save();
  }
  return riskFactorConfig;
}

export function _getPrice(token: Address): BigInt {
  const entity = PriceStat.load(`total-${token.toHex()}`);
  if (!entity) {
    return ZERO;
  }
  return entity.value;
}

export function _calcReturnFee(feeValue: BigInt): BigInt {
  const protocol = loadOrCreateProtocol();
  return feeValue
    .times(FEE_PRECISION.minus(protocol.daoFeeRatio))
    .div(FEE_PRECISION);
}

export function _calcDaoFee(feeValue: BigInt): BigInt {
  const protocol = Protocol.load("1");
  if (!protocol) {
    return ZERO;
  }
  return feeValue.times(protocol.daoFeeRatio).div(FEE_PRECISION);
}

export function _calcTotalFee(daoFeeValue: BigInt): BigInt {
  const protocol = Protocol.load("1");
  if (!protocol || protocol.daoFeeRatio.equals(ZERO)) {
    return ZERO;
  }
  return daoFeeValue.times(FEE_PRECISION).div(protocol.daoFeeRatio);
}

export function _calcTrancheValue(
  tranche: Address,
  block: BigInt
): BigInt | null {
  const poolContract = Pool.bind(config.pool);
  if (block.lt(config.oracle_block_update)) {
    const trancheValueV1 = poolContract.try_getTrancheValue1(tranche);
    return trancheValueV1.reverted ? null : trancheValueV1.value;
  }
  const maxTrancheValue = poolContract.try_getTrancheValue(tranche, true);
  const minTrancheValue = poolContract.try_getTrancheValue(tranche, false);
  if (maxTrancheValue.reverted || minTrancheValue.reverted) {
    return null;
  }
  return maxTrancheValue.value
    .plus(minTrancheValue.value)
    .div(BigInt.fromI32(2));
}

export function _calcPoolValue(block: BigInt): BigInt | null {
  const poolContract = Pool.bind(config.pool);
  if (block.lt(config.oracle_block_update)) {
    const poolValue = poolContract.try_getPoolValue1();
    return poolValue.reverted ? null : poolValue.value;
  }
  const maxPoolValue = poolContract.try_getPoolValue(true);
  const minPoolValue = poolContract.try_getPoolValue(false);
  if (maxPoolValue.reverted || minPoolValue.reverted) {
    return null;
  }
  return maxPoolValue.value.plus(minPoolValue.value).div(BigInt.fromI32(2));
}

export function _needUpdate(block: BigInt): boolean {
  const protocol = Protocol.load("1");
  if (!protocol) {
    return false;
  }
  return block.minus(protocol.lastUpdatedBlock).ge(BigInt.fromI32(20));
}
