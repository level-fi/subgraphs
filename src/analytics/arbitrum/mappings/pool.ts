import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
  _calcDaoFee,
  _calcReturnFee,
  _getPrice,
  _needUpdate,
  emptyArray,
  getDayId,
  getOneHourId,
  loadOrCreateProtocol,
  loadOrCreateProtocolStat,
  loadOrCreateRiskFactor,
  loadOrCreateTokenDistributionStat,
  loadOrCreateTradingPairStat,
  loadOrCreateTranche,
  loadOrCreateTrancheFee,
  loadOrCreateTrancheStat,
  toDecimal,
} from "../utils/helper";
import { config } from "../../../config";
import {
  FEE_PRECISION,
  ONE,
  TOKEN_DECIMALS,
  VALUE_DECIMALS,
  ZERO,
} from "../../../config/constant";
import { PoolLens } from "../generated/Pool/PoolLens";
import {
  DaoFeeSet,
  DecreasePosition,
  IncreasePosition,
  LiquidatePosition,
  LiquidityAdded,
  LiquidityRemoved,
  PnLDistributed,
  Pool,
  Swap,
  TokenRiskFactorUpdated,
  TokenWhitelisted,
} from "../generated/Pool/Pool";
import {
  loadOrCreateFeeStat,
  loadOrCreateTradingStat,
  loadOrCreateVolumeStat,
} from "../../bsc/utils/helper";
import { Side } from "../../../config/enum";
import { Token } from "../generated/schema";
import { ERC20 } from "../generated/Pool/ERC20";

export function handlePositionIncreased(ev: IncreasePosition): void {
  _storeVolume("trading", ev.block.timestamp, ev.params.sizeChanged);
  _storeFee("trading", ev.block.timestamp, ev.params.feeValue);
  _storeOpenInterest(
    ev.block.timestamp,
    true,
    ev.params.side,
    ev.params.sizeChanged
  );
  _storeOpenInterestByToken(
    ev.block.timestamp,
    ev.params.indexToken,
    true,
    ev.params.side,
    ev.params.sizeChanged
  );
  _storePnl(ev.block.timestamp, ZERO, ev.params.feeValue);
  _storeTradingPair(
    ev.params.indexToken,
    ev.params.indexPrice,
    ev.block.timestamp,
    ev.params.sizeChanged
  );
  const collateralToken = Token.load(ev.params.collateralToken.toHex());
  if (collateralToken) {
    const feeAmount = ev.params.feeValue.div(
      ev.params.side === Side.LONG
        ? ev.params.indexPrice
        : BigInt.fromI32(10).pow(
            (VALUE_DECIMALS - collateralToken.decimals) as i8
          )
    );
    _storeTradingFeeReturn(
      ev.params.feeValue,
      feeAmount,
      "trading",
      ev.params.indexToken,
      ev.params.collateralToken,
      ev.block.timestamp
    );
  }
  if (!_needUpdate(ev.block.number)) {
    return;
  }
  _storeTranches(ev.block.timestamp);
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
  _storeOpenInterestByToken(
    ev.block.timestamp,
    ev.params.indexToken,
    false,
    ev.params.side,
    ev.params.sizeChanged
  );
  _storePnl(ev.block.timestamp, ev.params.pnl, ev.params.feeValue);
  _storeTradingPair(
    ev.params.indexToken,
    ev.params.indexPrice,
    ev.block.timestamp,
    ev.params.sizeChanged
  );
  const collateralToken = Token.load(ev.params.collateralToken.toHex());
  if (collateralToken) {
    const feeAmount = ev.params.feeValue.div(
      ev.params.side === Side.LONG
        ? ev.params.indexPrice
        : BigInt.fromI32(10).pow(
            (VALUE_DECIMALS - collateralToken.decimals) as i8
          )
    );
    _storeTradingFeeReturn(
      ev.params.feeValue,
      feeAmount,
      "trading",
      ev.params.indexToken,
      ev.params.collateralToken,
      ev.block.timestamp
    );
  }
  if (!_needUpdate(ev.block.number)) {
    return;
  }
  _storeTranches(ev.block.timestamp);
  _storeProtocol(ev.block.number, ev.block.timestamp);
}

export function handlePositionLiquidated(ev: LiquidatePosition): void {
  _storeVolume("liquidate", ev.block.timestamp, ev.params.size);
  _storeFee("liquidate", ev.block.timestamp, ev.params.feeValue);
  _storeOpenInterest(ev.block.timestamp, false, ev.params.side, ev.params.size);
  _storeOpenInterestByToken(
    ev.block.timestamp,
    ev.params.indexToken,
    false,
    ev.params.side,
    ev.params.size
  );
  _storePnl(ev.block.timestamp, ev.params.pnl, ev.params.feeValue);
  _storeTradingPair(
    ev.params.indexToken,
    ev.params.indexPrice,
    ev.block.timestamp,
    ev.params.size
  );
  const collateralToken = Token.load(ev.params.collateralToken.toHex());
  if (collateralToken) {
    const feeAmount = ev.params.feeValue.div(
      ev.params.side === Side.LONG
        ? ev.params.indexPrice
        : BigInt.fromI32(10).pow(
            (VALUE_DECIMALS - collateralToken.decimals) as i8
          )
    );
    _storeTradingFeeReturn(
      ev.params.feeValue,
      feeAmount,
      "liquidate",
      ev.params.indexToken,
      ev.params.collateralToken,
      ev.block.timestamp
    );
  }
  if (!_needUpdate(ev.block.number)) {
    return;
  }
  _storeTranches(ev.block.timestamp);
  _storeProtocol(ev.block.number, ev.block.timestamp);
}

export function handleLiquidityAdded(ev: LiquidityAdded): void {
  const tokenPrice = _getPrice(ev.params.token);
  const feeValue = tokenPrice.times(ev.params.fee);
  _storeVolume("mint", ev.block.timestamp, tokenPrice.times(ev.params.amount));
  _storeFee("mint", ev.block.timestamp, feeValue);
  _storeLpFeeReturn(
    feeValue,
    ev.params.fee,
    "mint",
    ev.params.token,
    ev.params.tranche,
    ev.block.timestamp
  );
  if (!_needUpdate(ev.block.number)) {
    return;
  }
  _storeTranches(ev.block.timestamp);
  _storeProtocol(ev.block.number, ev.block.timestamp);
}

export function handleLiquidityRemoved(ev: LiquidityRemoved): void {
  const tokenPrice = _getPrice(ev.params.token);
  const feeValue = tokenPrice.times(ev.params.fee);
  _storeVolume(
    "burn",
    ev.block.timestamp,
    tokenPrice.times(ev.params.amountOut)
  );
  _storeFee("burn", ev.block.timestamp, feeValue);
  _storeLpFeeReturn(
    feeValue,
    ev.params.fee,
    "burn",
    ev.params.token,
    ev.params.tranche,
    ev.block.timestamp
  );
  if (!_needUpdate(ev.block.number)) {
    return;
  }
  _storeTranches(ev.block.timestamp);
  _storeProtocol(ev.block.number, ev.block.timestamp);
}

export function handleSwap(ev: Swap): void {
  const feeValue = ev.params.priceIn.times(ev.params.fee);
  const volume = ev.params.priceIn
    .times(ev.params.amountIn)
    .plus(ev.params.priceOut.times(ev.params.amountOut))
    .div(BigInt.fromI32(2));
  _storeVolume("swap", ev.block.timestamp, volume);
  _storeFee("swap", ev.block.timestamp, feeValue);
  const indexToken =
    config.stableTokens.includes(ev.params.tokenIn) &&
    !config.stableTokens.includes(ev.params.tokenOut)
      ? ev.params.tokenOut
      : ev.params.tokenIn;
  _storeTradingFeeReturn(
    feeValue,
    ev.params.fee,
    "swap",
    indexToken,
    ev.params.tokenIn,
    ev.block.timestamp
  );
  if (!_needUpdate(ev.block.number)) {
    return;
  }
  _storeTranches(ev.block.timestamp);
  _storeProtocol(ev.block.number, ev.block.timestamp);
}

export function handlePnLDistributed(ev: PnLDistributed): void {
  // store total
  const totalEntity = loadOrCreateTranche(ev.params.tranche);
  totalEntity.traderPnl = totalEntity.traderPnl.plus(ev.params.pnl);

  // store daily
  const dayId = `day-${getDayId(ev.block.timestamp)}`;
  const entity = loadOrCreateTrancheStat(
    `${dayId}-${ev.params.tranche.toHex()}`,
    ev.params.tranche,
    "daily",
    getDayId(ev.block.timestamp)
  );
  entity.traderPnl = entity.traderPnl.plus(
    toDecimal(ev.params.pnl, VALUE_DECIMALS)
  );
  entity.cumulativeTraderPnl = toDecimal(totalEntity.traderPnl, VALUE_DECIMALS);
  entity.cumulativeTraderFee = toDecimal(totalEntity.traderFee, VALUE_DECIMALS);
  entity.cumulativeReturnFee = toDecimal(totalEntity.returnFee, VALUE_DECIMALS);

  entity.save();
  totalEntity.save();
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

export function handleDaoFeeSet(ev: DaoFeeSet): void {
  const protocol = loadOrCreateProtocol();
  protocol.daoFeeRatio = ev.params.value;
  protocol.save();
}

export function handleTokenWhitelisted(ev: TokenWhitelisted): void {
  let token = Token.load(ev.params.token.toHex());
  if (!token) {
    const erc20 = ERC20.bind(ev.params.token);
    token = new Token(ev.params.token.toHex());
    token.address = ev.params.token;
    const decimal = erc20.try_decimals();
    token.decimals = !decimal.reverted ? decimal.value : 0;
    token.save();
  }
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
  totalEntity.dao = totalEntity.dao.plus(_calcDaoFee(feeValue));

  // store daily
  const dayId = `day-${getDayId(timestamp)}`;
  let entity = loadOrCreateFeeStat(dayId, "daily", getDayId(timestamp));
  entity.setBigDecimal(
    type,
    entity.getBigDecimal(type).plus(toDecimal(feeValue, VALUE_DECIMALS))
  );
  entity.total = entity.total.plus(toDecimal(feeValue, VALUE_DECIMALS));
  entity.cumulative = totalEntity.cumulative;
  entity.dao = entity.dao.plus(_calcDaoFee(feeValue));

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
  let dayEntity = loadOrCreateTradingStat(dayId, "daily", getDayId(timestamp));
  dayEntity.longOpenInterest = totalEntity.longOpenInterest;
  dayEntity.shortOpenInterest = totalEntity.shortOpenInterest;

  // store hourly
  const hourId = `hour-${getOneHourId(timestamp)}`;
  let hourEntity = loadOrCreateTradingStat(
    hourId,
    "hourly",
    getOneHourId(timestamp)
  );
  hourEntity.longOpenInterest = totalEntity.longOpenInterest;
  hourEntity.shortOpenInterest = totalEntity.shortOpenInterest;

  const protocol = loadOrCreateProtocol();
  protocol.openInterest = isIncrease
    ? protocol.openInterest.plus(sizeChanged)
    : protocol.openInterest.minus(sizeChanged);

  dayEntity.save();
  hourEntity.save();
  totalEntity.save();
  protocol.save();
}

function _storeOpenInterestByToken(
  timestamp: BigInt,
  indexToken: Address,
  isIncrease: boolean,
  side: Side,
  sizeChanged: BigInt
): void {
  // store total
  const totalEntity = loadOrCreateTradingPairStat(
    `total-${indexToken.toHex()}`,
    indexToken,
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
  totalEntity.save();

  for (let i = 0; i < config.indexTokens.length; i++) {
    const token = config.indexTokens[i];
    const total = loadOrCreateTradingPairStat(
      `total-${token.toHex()}`,
      token,
      "total",
      getDayId(timestamp)
    );
    // store daily
    const dayId = `day-${getDayId(timestamp)}-${token.toHex()}`;
    let dayEntity = loadOrCreateTradingPairStat(
      dayId,
      token,
      "daily",
      getDayId(timestamp)
    );
    dayEntity.longOpenInterest = total.longOpenInterest;
    dayEntity.shortOpenInterest = total.shortOpenInterest;

    // store hourly
    const hourId = `hour-${getOneHourId(timestamp)}-${token.toHex()}`;
    let hourEntity = loadOrCreateTradingPairStat(
      hourId,
      token,
      "hourly",
      getOneHourId(timestamp)
    );
    hourEntity.longOpenInterest = total.longOpenInterest;
    hourEntity.shortOpenInterest = total.shortOpenInterest;

    dayEntity.save();
    hourEntity.save();
  }
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
  totalEntity.save();

  // store daily
  const dayId = `day-${getDayId(timestamp)}-${indexToken.toHex()}`;
  let dayEntity = loadOrCreateTradingPairStat(
    dayId,
    indexToken,
    "daily",
    getDayId(timestamp)
  );
  dayEntity.volumeUsd = dayEntity.volumeUsd.plus(volumeUsd);
  dayEntity.volume = dayEntity.volume.plus(volumeUsd.div(price));

  // store hourly
  const hourId = `hour-${getOneHourId(timestamp)}-${indexToken.toHex()}`;
  let hourEntity = loadOrCreateTradingPairStat(
    hourId,
    indexToken,
    "hourly",
    getOneHourId(timestamp)
  );
  hourEntity.volumeUsd = hourEntity.volumeUsd.plus(volumeUsd);
  hourEntity.volume = hourEntity.volume.plus(volumeUsd.div(price));

  dayEntity.save();
  hourEntity.save();
}

function _storeTradingFeeReturn(
  totalFeeValue: BigInt,
  totalFeeAmount: BigInt,
  feeType: string,
  indexToken: Address,
  collateralToken: Address,
  timestamp: BigInt
): void {
  const returnFeeValue = _calcReturnFee(totalFeeValue);
  const returnFeeAmount = _calcReturnFee(totalFeeAmount);
  const riskFactorConfig = loadOrCreateRiskFactor(indexToken);
  const tranches = config.tranches;
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
    const trancheFeeEntity = loadOrCreateTrancheFee(tranche, collateralToken);
    const returnFeeShare = totalRiskFactor_.equals(ZERO)
      ? ZERO
      : returnFeeValue.times(riskFactor_).div(totalRiskFactor_);
    const returnFeeShareAmount = totalRiskFactor_.equals(ZERO)
      ? ZERO
      : returnFeeAmount.times(riskFactor_).div(totalRiskFactor_);
    const traderFeeShare = totalRiskFactor_.equals(ZERO)
      ? ZERO
      : totalFeeValue.times(riskFactor_).div(totalRiskFactor_);

    // store total
    totalEntity.totalFeeValue = totalEntity.totalFeeValue.plus(returnFeeShare);
    totalEntity.setBigInt(
      `${feeType}FeeValue`,
      totalEntity.getBigInt(`${feeType}FeeValue`).plus(returnFeeShare)
    );
    if (feeType === "trading") {
      totalEntity.traderFee = totalEntity.traderFee.plus(traderFeeShare);
      totalEntity.returnFee = totalEntity.returnFee.plus(returnFeeShare);
    }

    // store tranche fee
    trancheFeeEntity.setBigInt(
      feeType,
      trancheFeeEntity.getBigInt(feeType).plus(returnFeeShareAmount)
    );

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
    entity.setBigDecimal(
      `${feeType}FeeValue`,
      entity
        .getBigDecimal(`${feeType}FeeValue`)
        .plus(toDecimal(returnFeeShare, VALUE_DECIMALS))
    );
    entity.totalFeeValue = entity.totalFeeValue.plus(
      toDecimal(returnFeeShare, VALUE_DECIMALS)
    );
    entity.traderFee = entity.traderFee.plus(
      toDecimal(totalFeeValue, VALUE_DECIMALS)
    );
    entity.returnFee = entity.returnFee.plus(
      toDecimal(returnFeeValue, VALUE_DECIMALS)
    );
    entity.cumulativeTraderPnl = toDecimal(
      totalEntity.traderPnl,
      VALUE_DECIMALS
    );
    entity.cumulativeTraderFee = toDecimal(
      totalEntity.traderFee,
      VALUE_DECIMALS
    );
    entity.cumulativeReturnFee = toDecimal(
      totalEntity.returnFee,
      VALUE_DECIMALS
    );

    entity.save();
    totalEntity.save();
    trancheFeeEntity.save();
  }
}

function _storeLpFeeReturn(
  totalFeeValue: BigInt,
  totalFeeAmount: BigInt,
  feeType: string,
  token: Address,
  tranche: Address,
  timestamp: BigInt
): void {
  const returnFeeValue = _calcReturnFee(totalFeeValue);
  const returnFeeAmount = _calcReturnFee(totalFeeAmount);
  const totalEntity = loadOrCreateTranche(tranche);
  const trancheFeeEntity = loadOrCreateTrancheFee(tranche, token);
  // store total
  totalEntity.totalFeeValue = totalEntity.totalFeeValue.plus(returnFeeValue);
  totalEntity.setBigInt(
    `${feeType}FeeValue`,
    totalEntity.getBigInt(`${feeType}FeeValue`).plus(returnFeeValue)
  );
  // store tranche fee
  trancheFeeEntity.setBigInt(
    feeType,
    trancheFeeEntity.getBigInt(feeType).plus(returnFeeAmount)
  );
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
  trancheFeeEntity.save();
}

function _storeTranches(timestamp: BigInt): void {
  const poolContract = Pool.bind(config.pool);
  const poolLensContract = PoolLens.bind(config.poolLens);
  const tranches = config.tranches;
  const poolTokens = config.stableTokens.concat(config.indexTokens);
  for (let i = 0; i < tranches.length; i++) {
    const tranche = tranches[i];
    const trancheAssetValue = poolLensContract.try_getTrancheValue(tranche);
    if (trancheAssetValue.reverted) {
      continue;
    }
    const trancheValue = trancheAssetValue.value;
    const totalEntity = loadOrCreateTranche(tranche);

    if (!trancheValue || totalEntity.llpSupply.equals(ZERO)) {
      continue;
    }

    const llpPrice = trancheValue.div(totalEntity.llpSupply);

    // store total
    totalEntity.llpPrice = llpPrice;
    totalEntity.trancheValue = trancheValue;
    totalEntity.tranche = tranche;

    const dayId = getDayId(timestamp);
    for (let i = 0; i < poolTokens.length; i++) {
      const trancheAsset = poolContract.try_trancheAssets(
        tranche,
        poolTokens[i]
      );
      const price = _getPrice(poolTokens[i]);
      if (trancheAsset.reverted || price.equals(ZERO)) {
        continue;
      }
      // store total
      const totalTokenDistributionEntity = loadOrCreateTokenDistributionStat(
        `total-${tranche.toHex()}-${poolTokens[i].toHex()}`,
        tranche,
        poolTokens[i],
        "total",
        dayId
      );
      totalTokenDistributionEntity.value = toDecimal(
        trancheAsset.value.getPoolAmount().times(price),
        VALUE_DECIMALS
      );

      // store daily
      const tokenDistributionEntity = loadOrCreateTokenDistributionStat(
        `day-${dayId}-${tranche.toHex()}-${poolTokens[i].toHex()}`,
        tranche,
        poolTokens[i],
        "daily",
        dayId
      );
      tokenDistributionEntity.value = toDecimal(
        trancheAsset.value.getPoolAmount().times(price),
        VALUE_DECIMALS
      );

      totalTokenDistributionEntity.save();
      tokenDistributionEntity.save();
    }

    // store daily
    const entity = loadOrCreateTrancheStat(
      `day-${dayId}-${tranche.toHex()}`,
      tranche,
      "daily",
      dayId
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

function _storeProtocol(block: BigInt, timestamp: BigInt): void {
  const poolLensContract = PoolLens.bind(config.poolLens);
  const poolValue = poolLensContract.try_getPoolValue();
  if (poolValue.reverted || poolValue.value.equals(ZERO)) {
    return;
  }

  // store total
  const protocol = loadOrCreateProtocol();
  protocol.totalValue = protocol.totalValue.minus(protocol.poolValue);
  protocol.poolValue = poolValue.value;
  protocol.totalValue = protocol.totalValue.plus(protocol.poolValue);
  protocol.lastUpdatedBlock = block;
  // store daily
  const dayId = `day-${getDayId(timestamp)}`;
  let entity = loadOrCreateProtocolStat(dayId, "daily", getDayId(timestamp));
  entity.totalValueLocked = toDecimal(protocol.totalValue, VALUE_DECIMALS);
  entity.llpValue = toDecimal(protocol.poolValue, VALUE_DECIMALS);
  entity.pairLiquidity = toDecimal(protocol.pairLiquidity, VALUE_DECIMALS);

  entity.save();
  protocol.save();
}
