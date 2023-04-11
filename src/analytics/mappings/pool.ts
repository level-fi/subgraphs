import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  DaoFeeSet,
  DecreasePosition,
  IncreasePosition,
  InterestAccrued,
  LiquidatePosition,
  LiquidityAdded,
  LiquidityRemoved,
  Pool,
  Swap,
  TokenRiskFactorUpdated,
} from "../generated/Pool/Pool";
import {
  BorrowIndex,
  UserData,
  UserStat,
  UserTrancheHistory,
} from "../generated/schema";
import { config } from "../../config";
import {
  ACCRUAL_INTERVAL,
  DECIMAL_ZERO,
  INTEREST_RATE_DECIMALS,
  NEGATIVE_ONE,
  ONE,
  TOKEN_DECIMALS,
  VALUE_DECIMALS,
  ZERO,
} from "../../config/constant";
import { Side } from "../utils/enums";
import {
  emptyArray,
  getDayId,
  loadOrCreateFeeStat,
  loadOrCreateProtocol,
  loadOrCreateProtocolStat,
  loadOrCreateRiskFactor,
  loadOrCreateTokenDistributionStat,
  loadOrCreateTradingPairStat,
  loadOrCreateTradingStat,
  loadOrCreateTranche,
  loadOrCreateTrancheStat,
  loadOrCreateUserStat,
  loadOrCreateUserTrancheStat,
  loadOrCreateVolumeStat,
  toDecimal,
  _calcDaoFee,
  _calcPoolValue,
  _calcReturnFee,
  _calcTotalFee,
  _calcTrancheValue,
  _getPrice,
  _needUpdate,
} from "../utils/helper";

export function handlePositionIncreased(ev: IncreasePosition): void {
  _storeVolume("trading", ev.block.timestamp, ev.params.sizeChanged);
  _storeFee("trading", ev.block.timestamp, ev.params.feeValue);
  _storeOpenInterest(
    ev.block.timestamp,
    true,
    ev.params.side,
    ev.params.sizeChanged
  );
  _storePnl(ev.block.timestamp, ZERO, ev.params.feeValue);
  _storeUserAction(ev.block.timestamp, "trading", ev.params.account);
  _storeTradingPair(
    ev.params.indexToken,
    ev.params.indexPrice,
    ev.block.timestamp,
    ev.params.sizeChanged
  );
  _storeTrancheFees(
    _calcReturnFee(ev.params.feeValue),
    ev.params.indexToken,
    ev.block.timestamp
  );
  if (!_needUpdate(ev.block.number)) {
    return;
  }
  _storeTranches(ev.block.number, ev.block.timestamp);
  _storeProtocol(ev.block.number, ev.block.timestamp);
}

export function handlePositionDecreased(ev: DecreasePosition): void {
  _storeVolume("trading", ev.block.timestamp, ev.params.sizeChanged);
  _storeFee("trading", ev.block.timestamp, ev.params.feeValue);
  _storeOpenInterest(
    ev.block.timestamp,
    false,
    ev.params.side,
    ev.params.sizeChanged
  );
  // sig 0: loss, 1: profit
  _storePnl(
    ev.block.timestamp,
    ev.params.pnl.abs.times(
      ev.params.pnl.sig.equals(ZERO) ? NEGATIVE_ONE : ONE
    ),
    ev.params.feeValue
  );
  _storeUserAction(ev.block.timestamp, "trading", ev.params.account);
  _storeTradingPair(
    ev.params.indexToken,
    ev.params.indexPrice,
    ev.block.timestamp,
    ev.params.sizeChanged
  );
  _storeTrancheFees(
    _calcReturnFee(ev.params.feeValue),
    ev.params.indexToken,
    ev.block.timestamp
  );
  if (!_needUpdate(ev.block.number)) {
    return;
  }
  _storeTranches(ev.block.number, ev.block.timestamp);
  _storeProtocol(ev.block.number, ev.block.timestamp);
}

export function handlePositionLiquidated(ev: LiquidatePosition): void {
  _storeVolume("trading", ev.block.timestamp, ev.params.size);
  _storeFee("liquidate", ev.block.timestamp, ev.params.feeValue);
  _storeOpenInterest(ev.block.timestamp, false, ev.params.side, ev.params.size);
  // sig 0: loss, 1: profit
  _storePnl(
    ev.block.timestamp,
    ev.params.pnl.abs.times(
      ev.params.pnl.sig.equals(ZERO) ? NEGATIVE_ONE : ONE
    ),
    ev.params.feeValue
  );
  _storeUserAction(ev.block.timestamp, "trading", ev.params.account);
  _storeTradingPair(
    ev.params.indexToken,
    ev.params.indexPrice,
    ev.block.timestamp,
    ev.params.size
  );
  _storeTrancheFees(
    _calcReturnFee(ev.params.feeValue),
    ev.params.indexToken,
    ev.block.timestamp
  );
  if (!_needUpdate(ev.block.number)) {
    return;
  }
  _storeTranches(ev.block.number, ev.block.timestamp);
  _storeProtocol(ev.block.number, ev.block.timestamp);
}

export function handleLiquidityAdded(ev: LiquidityAdded): void {
  const tokenPrice = _getPrice(ev.params.token);
  const feeValue = tokenPrice.times(ev.params.fee);
  const realizedFeeValue = ev.block.number.ge(config.dao_fee_block_update)
    ? _calcTotalFee(feeValue)
    : feeValue;
  _storeFee("mint", ev.block.timestamp, realizedFeeValue);
  _storeUserAction(ev.block.timestamp, "mintBurn", ev.transaction.from);
  const mintLlpValue = tokenPrice.times(ev.params.amount);
  _storeUserLiquidity(
    ev.transaction.from,
    ev.block.timestamp,
    ev.params.tranche,
    "ADD",
    ev.params.lpAmount,
    mintLlpValue.minus(realizedFeeValue),
    ev.transaction.hash
  );
  _storeTrancheFee(
    _calcReturnFee(realizedFeeValue),
    ev.params.tranche,
    ev.block.timestamp
  );
  if (!_needUpdate(ev.block.number)) {
    return;
  }
  _storeTranches(ev.block.number, ev.block.timestamp);
  _storeProtocol(ev.block.number, ev.block.timestamp);
}

export function handleLiquidityRemoved(ev: LiquidityRemoved): void {
  const tokenPrice = _getPrice(ev.params.token);
  const feeValue = tokenPrice.times(ev.params.fee);
  const realizedFeeValue = ev.block.number.ge(config.dao_fee_block_update)
    ? _calcTotalFee(feeValue)
    : feeValue;
  _storeFee("burn", ev.block.timestamp, realizedFeeValue);
  _storeUserAction(ev.block.timestamp, "mintBurn", ev.transaction.from);
  const burnLlpValue = tokenPrice.times(ev.params.amountOut);
  _storeUserLiquidity(
    ev.transaction.from,
    ev.block.timestamp,
    ev.params.tranche,
    "REMOVE",
    ev.params.lpAmount,
    burnLlpValue,
    ev.transaction.hash
  );
  _storeTrancheFee(
    _calcReturnFee(realizedFeeValue),
    ev.params.tranche,
    ev.block.timestamp
  );
  if (!_needUpdate(ev.block.number)) {
    return;
  }
  _storeTranches(ev.block.number, ev.block.timestamp);
  _storeProtocol(ev.block.number, ev.block.timestamp);
}

export function handleSwap(ev: Swap): void {
  const tokenInPrice = _getPrice(ev.params.tokenIn);
  const tokenOutPrice = _getPrice(ev.params.tokenOut);
  const feeValue = tokenInPrice.times(ev.params.fee);
  const volume = tokenInPrice
    .times(ev.params.amountIn)
    .plus(tokenOutPrice.times(ev.params.amountOut))
    .div(BigInt.fromI32(2));
  _storeVolume("swap", ev.block.timestamp, volume);
  _storeFee("swap", ev.block.timestamp, feeValue);
  _storeUserAction(ev.block.timestamp, "swap", ev.transaction.from);
  _storeTrancheFees(
    _calcReturnFee(feeValue),
    ev.params.tokenIn,
    ev.block.timestamp
  );
  if (!_needUpdate(ev.block.number)) {
    return;
  }
  _storeTranches(ev.block.number, ev.block.timestamp);
  _storeProtocol(ev.block.number, ev.block.timestamp);
}

export function handleInterestAccrued(ev: InterestAccrued): void {
  const borrowIndexIntervalTimestamp =
    (ev.block.timestamp.toI32() / ACCRUAL_INTERVAL) * ACCRUAL_INTERVAL;
  const timestamp = getDayId(ev.block.timestamp);
  const id = `${timestamp}-daily-${ev.params.token.toHex()}`;
  let entity = BorrowIndex.load(id);

  const totalId = `total-${ev.params.token.toHex()}`;
  let totalEntity = BorrowIndex.load(totalId);
  if (!entity) {
    entity = new BorrowIndex(id);
    if (totalEntity) {
      entity.startBorrowIndex = totalEntity.endBorrowIndex;
      entity.startTimestamp = totalEntity.endTimestamp;
    } else {
      entity.startBorrowIndex = DECIMAL_ZERO;
      entity.startTimestamp = borrowIndexIntervalTimestamp;
    }
    entity.timestamp = timestamp.toI32();
    entity.token = ev.params.token;
    entity.period = "daily";
  }
  entity.endBorrowIndex = toDecimal(
    ev.params.borrowIndex,
    INTEREST_RATE_DECIMALS
  );
  entity.endTimestamp = borrowIndexIntervalTimestamp;
  entity.save();

  if (totalEntity == null) {
    totalEntity = new BorrowIndex(totalId);
    totalEntity.period = "total";
    totalEntity.startBorrowIndex = DECIMAL_ZERO;
    totalEntity.token = ev.params.token;
    totalEntity.startTimestamp = borrowIndexIntervalTimestamp;
  }
  totalEntity.endBorrowIndex = toDecimal(
    ev.params.borrowIndex,
    INTEREST_RATE_DECIMALS
  );
  totalEntity.timestamp = timestamp.toI32();
  totalEntity.endTimestamp = borrowIndexIntervalTimestamp;
  totalEntity.save();
}

export function handleDaoFeeSet(ev: DaoFeeSet): void {
  const protocol = loadOrCreateProtocol();
  protocol.daoFeeRatio = ev.params.value;
  protocol.save();
}

export function handleTokenRiskFactorUpdated(ev: TokenRiskFactorUpdated): void {
  const riskFactor = loadOrCreateRiskFactor(ev.params.token);
  const pool = Pool.bind(config.pool);
  const tranches = config.tranches;
  const totalRiskFactor = pool.try_totalRiskFactor(ev.params.token);
  riskFactor.totalRiskFactor = totalRiskFactor.reverted
    ? ZERO
    : totalRiskFactor.value;
  let riskFactors = emptyArray<BigInt>(tranches.length, ZERO);
  for (let i = 0; i < tranches.length; i++) {
    const tranche = tranches[i];
    const riskFactor = pool.try_riskFactor(ev.params.token, tranche);
    const riskFactor_ = riskFactor.reverted ? ZERO : riskFactor.value;
    riskFactors[i] = riskFactor_;
  }
  riskFactor.riskFactors = riskFactors;
  riskFactor.save();
}

function _storeVolume(type: string, timestamp: BigInt, volume: BigInt): void {
  // store total
  const totalEntity = loadOrCreateVolumeStat(
    "total",
    "total",
    getDayId(timestamp)
  );
  totalEntity.setBigDecimal(
    type,
    totalEntity.getBigDecimal(type).plus(toDecimal(volume, VALUE_DECIMALS))
  );
  totalEntity.total = totalEntity.total.plus(toDecimal(volume, VALUE_DECIMALS));
  totalEntity.cumulative = totalEntity.cumulative.plus(
    toDecimal(volume, VALUE_DECIMALS)
  );

  // store daily
  const dayId = `day-${getDayId(timestamp)}`;
  const entity = loadOrCreateVolumeStat(dayId, "daily", getDayId(timestamp));
  entity.setBigDecimal(
    type,
    entity.getBigDecimal(type).plus(toDecimal(volume, VALUE_DECIMALS))
  );
  entity.total = entity.total.plus(toDecimal(volume, VALUE_DECIMALS));
  entity.cumulative = totalEntity.cumulative;

  const protocol = loadOrCreateProtocol();
  protocol.totalVolume = protocol.totalVolume.plus(volume);

  entity.save();
  totalEntity.save();
  protocol.save();
}

function _storeFee(type: string, timestamp: BigInt, feeValue: BigInt): void {
  // store total
  const totalEntity = loadOrCreateFeeStat(
    "total",
    "total",
    getDayId(timestamp)
  );
  totalEntity.setBigDecimal(
    type,
    totalEntity.getBigDecimal(type).plus(toDecimal(feeValue, VALUE_DECIMALS))
  );
  totalEntity.total = totalEntity.total.plus(
    toDecimal(feeValue, VALUE_DECIMALS)
  );
  totalEntity.cumulative = totalEntity.cumulative.plus(
    toDecimal(feeValue, VALUE_DECIMALS)
  );

  // store daily
  const dayId = `day-${getDayId(timestamp)}`;
  let entity = loadOrCreateFeeStat(dayId, "daily", getDayId(timestamp));
  entity.setBigDecimal(
    type,
    entity.getBigDecimal(type).plus(toDecimal(feeValue, VALUE_DECIMALS))
  );
  entity.total = entity.total.plus(toDecimal(feeValue, VALUE_DECIMALS));
  entity.cumulative = totalEntity.cumulative;

  const protocol = loadOrCreateProtocol();
  protocol.totalFee = protocol.totalFee.plus(feeValue);

  entity.save();
  totalEntity.save();
  protocol.save();
}

function _storeOpenInterest(
  timestamp: BigInt,
  isIncrease: boolean,
  side: Side,
  sizeChanged: BigInt
): void {
  // store total
  const totalEntity = loadOrCreateTradingStat(
    "total",
    "total",
    getDayId(timestamp)
  );
  if (side === Side.LONG) {
    totalEntity.longOpenInterest = isIncrease
      ? totalEntity.longOpenInterest.plus(
          toDecimal(sizeChanged, VALUE_DECIMALS)
        )
      : totalEntity.longOpenInterest.minus(
          toDecimal(sizeChanged, VALUE_DECIMALS)
        );
  } else {
    totalEntity.shortOpenInterest = isIncrease
      ? totalEntity.shortOpenInterest.plus(
          toDecimal(sizeChanged, VALUE_DECIMALS)
        )
      : totalEntity.shortOpenInterest.minus(
          toDecimal(sizeChanged, VALUE_DECIMALS)
        );
  }

  // store daily
  const dayId = `day-${getDayId(timestamp)}`;
  let entity = loadOrCreateTradingStat(dayId, "daily", getDayId(timestamp));
  entity.longOpenInterest = totalEntity.longOpenInterest;
  entity.shortOpenInterest = totalEntity.shortOpenInterest;

  const protocol = loadOrCreateProtocol();
  protocol.openInterest = isIncrease
    ? protocol.openInterest.plus(sizeChanged)
    : protocol.openInterest.minus(sizeChanged);

  entity.save();
  totalEntity.save();
  protocol.save();
}

function _storePnl(timestamp: BigInt, pnl: BigInt, feeValue: BigInt): void {
  // store total
  const totalEntity = loadOrCreateTradingStat(
    "total",
    "total",
    getDayId(timestamp)
  );
  totalEntity.traderPnl = totalEntity.traderPnl.plus(
    toDecimal(pnl, VALUE_DECIMALS)
  );
  totalEntity.traderFee = totalEntity.traderFee.plus(
    toDecimal(feeValue, VALUE_DECIMALS)
  );
  totalEntity.daoFee = totalEntity.daoFee.plus(
    toDecimal(_calcDaoFee(feeValue), VALUE_DECIMALS)
  );

  // store daily
  const dayId = `day-${getDayId(timestamp)}`;
  let entity = loadOrCreateTradingStat(dayId, "daily", getDayId(timestamp));
  entity.traderPnl = entity.traderPnl.plus(toDecimal(pnl, VALUE_DECIMALS));
  entity.traderFee = entity.traderFee.plus(toDecimal(feeValue, VALUE_DECIMALS));
  entity.daoFee = entity.daoFee.plus(
    toDecimal(_calcDaoFee(feeValue), VALUE_DECIMALS)
  );
  entity.cumulativeTraderPnl = totalEntity.traderPnl;
  entity.cumulativeTraderFee = totalEntity.traderFee;
  entity.cumulativeDaoFee = totalEntity.daoFee;

  entity.save();
  totalEntity.save();
}

function _storeTradingPair(
  indexToken: Address,
  price: BigInt,
  timestamp: BigInt,
  volumeUsd: BigInt
): void {
  // store total
  const totalEntity = loadOrCreateTradingPairStat(
    `total-${indexToken.toHex()}`,
    indexToken,
    "total",
    getDayId(timestamp)
  );
  totalEntity.volumeUsd = totalEntity.volumeUsd.plus(volumeUsd);
  totalEntity.volume = totalEntity.volume.plus(volumeUsd.div(price));

  // store daily
  const dayId = `day-${getDayId(timestamp)}-${indexToken.toHex()}`;
  let entity = loadOrCreateTradingPairStat(
    dayId,
    indexToken,
    "daily",
    getDayId(timestamp)
  );
  entity.volumeUsd = entity.volumeUsd.plus(volumeUsd);
  entity.volume = entity.volume.plus(volumeUsd.div(price));

  entity.save();
  totalEntity.save();
}

function _storeProtocol(block: BigInt, timestamp: BigInt): void {
  const poolValue = _calcPoolValue();
  if (!poolValue || poolValue.equals(ZERO)) {
    return;
  }

  // store total
  const protocol = loadOrCreateProtocol();
  protocol.totalValue = protocol.totalValue.minus(protocol.poolValue);
  protocol.poolValue = poolValue;
  protocol.totalValue = protocol.totalValue.plus(protocol.poolValue);
  protocol.lastUpdatedBlock = block;

  // store daily
  const dayId = `day-${getDayId(timestamp)}`;
  let entity = loadOrCreateProtocolStat(dayId, "daily", getDayId(timestamp));
  entity.totalValueLocked = toDecimal(protocol.totalValue, VALUE_DECIMALS);
  entity.llpValue = toDecimal(protocol.poolValue, VALUE_DECIMALS);
  entity.lvlCirculatingSupply = toDecimal(
    protocol.lvlCirculatingSupply,
    TOKEN_DECIMALS
  );
  entity.pairLiquidity = toDecimal(protocol.pairLiquidity, VALUE_DECIMALS);

  entity.save();
  protocol.save();
}

function _storeTrancheFees(
  feeValue: BigInt,
  indexToken: Address,
  timestamp: BigInt
): void {
  const riskFactorConfig = loadOrCreateRiskFactor(indexToken);
  const tranches = config.tranches;
  const pool = Pool.bind(config.pool);
  const isStableCoin = config.stableTokens.includes(indexToken);
  const totalRiskFactor = riskFactorConfig.totalRiskFactor;
  const totalRiskFactor_ = isStableCoin
    ? BigInt.fromI32(config.tranches.length)
    : totalRiskFactor
    ? totalRiskFactor
    : ZERO;
  for (let i = 0; i < tranches.length; i++) {
    const tranche = tranches[i];
    const riskFactor = riskFactorConfig.riskFactors[i];
    const riskFactor_ = isStableCoin ? ONE : riskFactor ? riskFactor : ZERO;
    const totalEntity = loadOrCreateTranche(tranche);
    const share = totalRiskFactor_.equals(ZERO)
      ? ZERO
      : feeValue.times(riskFactor_).div(totalRiskFactor_);

    // store total
    totalEntity.totalFeeValue = totalEntity.totalFeeValue.plus(share);
    totalEntity.tranche = tranche;
    for (let i = 0; i < config.poolTokens.length; i++) {
      const trancheAsset = pool.try_trancheAssets(
        tranche,
        config.poolTokens[i]
      );
      const price = _getPrice(config.poolTokens[i]);
      if (trancheAsset.reverted || price.equals(ZERO)) {
        return;
      }
      // store total
      const totalTokenDistributionEntity = loadOrCreateTokenDistributionStat(
        `total-${tranche.toHex()}-${config.poolTokens[i].toHex()}`,
        tranche,
        config.poolTokens[i],
        "total",
        getDayId(timestamp)
      );
      totalTokenDistributionEntity.value = toDecimal(
        trancheAsset.value.getPoolAmount().times(price),
        VALUE_DECIMALS
      );

      // store daily
      const dayId = `day-${getDayId(timestamp)}`;
      const tokenDistributionEntity = loadOrCreateTokenDistributionStat(
        `${dayId}-${tranche.toHex()}-${config.poolTokens[i].toHex()}`,
        tranche,
        config.poolTokens[i],
        "daily",
        getDayId(timestamp)
      );
      tokenDistributionEntity.value = toDecimal(
        trancheAsset.value.getPoolAmount().times(price),
        VALUE_DECIMALS
      );

      totalTokenDistributionEntity.save();
      tokenDistributionEntity.save();
    }
    // store daily
    const dayId = `day-${getDayId(timestamp)}`;
    const entity = loadOrCreateTrancheStat(
      `${dayId}-${tranche.toHex()}`,
      tranche,
      "daily",
      getDayId(timestamp)
    );
    entity.llpPrice = toDecimal(
      totalEntity.llpPrice,
      VALUE_DECIMALS - TOKEN_DECIMALS
    );
    entity.llpSupply = toDecimal(totalEntity.llpSupply, TOKEN_DECIMALS);
    entity.trancheValue = toDecimal(totalEntity.trancheValue, VALUE_DECIMALS);
    entity.totalFeeValue = toDecimal(totalEntity.totalFeeValue, VALUE_DECIMALS);
    entity.tranche = tranche;

    entity.save();
    totalEntity.save();
  }
}

function _storeTrancheFee(
  feeValue: BigInt,
  tranche: Address,
  timestamp: BigInt
): void {
  const pool = Pool.bind(config.pool);
  const totalEntity = loadOrCreateTranche(tranche);
  // store total
  totalEntity.totalFeeValue = totalEntity.totalFeeValue.plus(feeValue);
  totalEntity.tranche = tranche;
  for (let i = 0; i < config.poolTokens.length; i++) {
    const trancheAsset = pool.try_trancheAssets(tranche, config.poolTokens[i]);
    const price = _getPrice(config.poolTokens[i]);
    if (trancheAsset.reverted || price.equals(ZERO)) {
      return;
    }
    // store total
    const totalTokenDistributionEntity = loadOrCreateTokenDistributionStat(
      `total-${tranche.toHex()}-${config.poolTokens[i].toHex()}`,
      tranche,
      config.poolTokens[i],
      "total",
      getDayId(timestamp)
    );
    totalTokenDistributionEntity.value = toDecimal(
      trancheAsset.value.getPoolAmount().times(price),
      VALUE_DECIMALS
    );

    // store daily
    const dayId = `day-${getDayId(timestamp)}`;
    const tokenDistributionEntity = loadOrCreateTokenDistributionStat(
      `${dayId}-${tranche.toHex()}-${config.poolTokens[i].toHex()}`,
      tranche,
      config.poolTokens[i],
      "daily",
      getDayId(timestamp)
    );
    tokenDistributionEntity.value = toDecimal(
      trancheAsset.value.getPoolAmount().times(price),
      VALUE_DECIMALS
    );

    totalTokenDistributionEntity.save();
    tokenDistributionEntity.save();
  }
  // store daily
  const dayId = `day-${getDayId(timestamp)}`;
  const entity = loadOrCreateTrancheStat(
    `${dayId}-${tranche.toHex()}`,
    tranche,
    "daily",
    getDayId(timestamp)
  );
  entity.llpPrice = toDecimal(
    totalEntity.llpPrice,
    VALUE_DECIMALS - TOKEN_DECIMALS
  );
  entity.llpSupply = toDecimal(totalEntity.llpSupply, TOKEN_DECIMALS);
  entity.trancheValue = toDecimal(totalEntity.trancheValue, VALUE_DECIMALS);
  entity.totalFeeValue = toDecimal(totalEntity.totalFeeValue, VALUE_DECIMALS);
  entity.tranche = tranche;

  entity.save();
  totalEntity.save();
}

function _storeTranches(block: BigInt, timestamp: BigInt): void {
  const pool = Pool.bind(config.pool);
  const tranches = config.tranches;
  for (let i = 0; i < tranches.length; i++) {
    const tranche = tranches[i];
    const trancheValue = _calcTrancheValue(tranche, block);
    const totalEntity = loadOrCreateTranche(tranche);
    if (!trancheValue || totalEntity.llpSupply.equals(ZERO)) {
      continue;
    }
    const llpPrice = trancheValue.div(totalEntity.llpSupply);

    // store total
    totalEntity.llpPrice = llpPrice;
    totalEntity.trancheValue = trancheValue;
    totalEntity.tranche = tranche;
    for (let i = 0; i < config.poolTokens.length; i++) {
      const trancheAsset = pool.try_trancheAssets(
        tranche,
        config.poolTokens[i]
      );
      const price = _getPrice(config.poolTokens[i]);
      if (trancheAsset.reverted || price.equals(ZERO)) {
        return;
      }
      // store total
      const totalTokenDistributionEntity = loadOrCreateTokenDistributionStat(
        `total-${tranche.toHex()}-${config.poolTokens[i].toHex()}`,
        tranche,
        config.poolTokens[i],
        "total",
        getDayId(timestamp)
      );
      totalTokenDistributionEntity.value = toDecimal(
        trancheAsset.value.getPoolAmount().times(price),
        VALUE_DECIMALS
      );

      // store daily
      const dayId = `day-${getDayId(timestamp)}`;
      const tokenDistributionEntity = loadOrCreateTokenDistributionStat(
        `${dayId}-${tranche.toHex()}-${config.poolTokens[i].toHex()}`,
        tranche,
        config.poolTokens[i],
        "daily",
        getDayId(timestamp)
      );
      tokenDistributionEntity.value = toDecimal(
        trancheAsset.value.getPoolAmount().times(price),
        VALUE_DECIMALS
      );

      totalTokenDistributionEntity.save();
      tokenDistributionEntity.save();
    }
    // store daily
    const dayId = `day-${getDayId(timestamp)}`;
    const entity = loadOrCreateTrancheStat(
      `${dayId}-${tranche.toHex()}`,
      tranche,
      "daily",
      getDayId(timestamp)
    );
    entity.llpPrice = toDecimal(
      totalEntity.llpPrice,
      VALUE_DECIMALS - TOKEN_DECIMALS
    );
    entity.llpSupply = toDecimal(totalEntity.llpSupply, TOKEN_DECIMALS);
    entity.trancheValue = toDecimal(totalEntity.trancheValue, VALUE_DECIMALS);
    entity.totalFeeValue = toDecimal(totalEntity.totalFeeValue, VALUE_DECIMALS);
    entity.tranche = tranche;

    entity.save();
    totalEntity.save();
  }
}

export function _storeUserLiquidity(
  user: Address,
  timestamp: BigInt,
  tranche: Address,
  action: string,
  llpAmount: BigInt,
  llpValue: BigInt,
  tx: Bytes
): void {
  // store total
  let totalEntity = loadOrCreateUserTrancheStat(
    `total-${user.toHex()}-${tranche.toHex()}`,
    user,
    tranche,
    "total",
    getDayId(timestamp)
  );
  if (action === "ADD" || action === "TRANSFER_IN") {
    totalEntity.llpAmount = totalEntity.llpAmount.plus(llpAmount);
    totalEntity.llpValue = totalEntity.llpValue.plus(llpValue);
  } else if (action === "REMOVE" || action === "TRANSFER_OUT") {
    totalEntity.llpAmount = totalEntity.llpAmount.minus(llpAmount);
    totalEntity.llpValue = totalEntity.llpValue.minus(llpValue);
  }

  // store daily
  const dayId = `day-${getDayId(timestamp)}-${user.toHex()}-${tranche.toHex()}`;
  let entity = loadOrCreateUserTrancheStat(
    dayId,
    user,
    tranche,
    "daily",
    getDayId(timestamp)
  );
  entity.llpAmount = totalEntity.llpAmount;
  entity.llpValue = totalEntity.llpValue;

  entity.save();
  totalEntity.save();

  // store history
  const history = new UserTrancheHistory(
    `${user.toHex()}-${tranche.toHex()}-${timestamp}`
  );
  history.user = user;
  history.tranche = tranche;
  history.action = action;
  history.llpAmount = totalEntity.llpAmount;
  history.llpValue = totalEntity.llpValue;
  history.llpValueChange = llpValue;
  history.llpAmountChange = llpAmount;
  history.timestamp = timestamp.toI32();
  history.tx = tx;
  history.save();
}

export function _storeUserAction(
  timestamp: BigInt,
  type: string,
  account: Address
): void {
  const total = _storeUserActionByPeriod(
    timestamp,
    type,
    account,
    "total",
    null
  );
  _storeUserActionByPeriod(timestamp, type, account, "daily", total);
}

export function _storeUserActionByPeriod(
  timestamp: BigInt,
  type: string,
  account: Address,
  period: string,
  userStatTotal: UserStat | null
): UserStat {
  const isTotal = period === "total";
  const dayId = `day-${getDayId(timestamp)}`;
  let userId = isTotal
    ? `${account.toHex()}-total`
    : `${account.toHex()}-${getDayId(timestamp)}`;
  let protocol = loadOrCreateProtocol();
  let userStat = loadOrCreateUserStat(
    isTotal ? "total" : dayId,
    period,
    getDayId(timestamp)
  );
  let user = UserData.load(userId);
  if (user === null) {
    user = new UserData(userId);
    user.period = period;
    user.timestamp = getDayId(timestamp).toI32();
    user.actionSwapCount = 0;
    user.actionTradingCount = 0;
    user.actionMintBurnCount = 0;
    user.actionReferralCount = 0;
    userStat.uniqueCount++;
    if (isTotal) {
      userStat.uniqueCountCumulative = userStat.uniqueCount;
      protocol.totalUsers = userStat.uniqueCountCumulative;
    } else if (userStatTotal != null) {
      userStat.uniqueCountCumulative = userStatTotal.uniqueCount;
    }
  }
  userStat.actionCount++;
  let actionCountProp: string = "";
  let uniqueCountProp: string = "";
  if (type === "trading") {
    actionCountProp = "actionTradingCount";
    uniqueCountProp = "uniqueTradingCount";
  } else if (type === "swap") {
    actionCountProp = "actionSwapCount";
    uniqueCountProp = "uniqueSwapCount";
  } else if (type === "mintBurn") {
    actionCountProp = "actionMintBurnCount";
    uniqueCountProp = "uniqueMintBurnCount";
  } else if (type === "referral") {
    actionCountProp = "actionReferralCount";
    uniqueCountProp = "uniqueReferralCount";
  }
  let uniqueCountCumulativeProp = uniqueCountProp + "Cumulative";
  if (user.getI32(actionCountProp) === 0) {
    userStat.setI32(uniqueCountProp, userStat.getI32(uniqueCountProp) + 1);
  }
  user.setI32(actionCountProp, user.getI32(actionCountProp) + 1);
  userStat.setI32(actionCountProp, userStat.getI32(actionCountProp) + 1);

  if (isTotal) {
    userStat.setI32(
      uniqueCountCumulativeProp,
      userStat.getI32(uniqueCountProp)
    );
  } else if (userStatTotal != null) {
    userStat.setI32(
      uniqueCountCumulativeProp,
      userStatTotal.getI32(uniqueCountProp)
    );
  }

  user.save();
  userStat.save();
  protocol.save();

  return userStat;
}
