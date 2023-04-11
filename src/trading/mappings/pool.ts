import { Address } from "@graphprotocol/graph-ts";
import { integer } from "@protofire/subgraph-toolkit";
import {
  ClosePosition,
  DecreasePosition,
  IncreasePosition,
  LiquidatePosition,
  Pool__feeResult,
  UpdatePosition,
  Pool as PoolContract,
  TokenWhitelisted,
} from "../generated/Pool/Pool";
import { History } from "../generated/schema";
import {
  getOrNull,
  loadOrCreateMarket,
  loadOrCreatePosition,
  loadOrCreateToken,
  loadOrCreateUser,
} from "./helper";

export function handleTokenWhitelisted(ev: TokenWhitelisted): void {
  let token = loadOrCreateToken(ev.params.token);
  let market = loadOrCreateMarket(ev.params.token);
  token.save();
  market.save();
}

export function handleIncreasePosition(ev: IncreasePosition): void {
  let position = loadOrCreatePosition(ev.params.key);

  // increase user position count whenever open new position
  if (position.status == "CLOSED") {
    position.realizedPnl = integer.ZERO;
    position.createdAtTimestamp = ev.block.timestamp;

    let user = loadOrCreateUser(ev.params.account);
    user.positionCount++;
    user.save();
  }

  // update increase position
  position.status = "OPEN";
  position.owner = ev.params.account;
  position.collateralToken = ev.params.collateralToken;
  position.market = ev.params.indexToken.toHex();
  position.side = ev.params.side;
  position.realizedPnl = position.realizedPnl.plus(
    ev.params.feeValue.times(integer.NEGATIVE_ONE)
  );
  position.save();
}

export function handleDecreasePosition(ev: DecreasePosition): void {
  let position = loadOrCreatePosition(ev.params.key);
  position.realizedPnl = position.realizedPnl.plus(
    ev.params.pnl.abs
      .times(
        ev.params.pnl.sig.equals(integer.ZERO)
          ? integer.NEGATIVE_ONE
          : integer.ONE
      )
      .minus(ev.params.feeValue)
  );
  position.save();
}

export function handleUpdatePosition(ev: UpdatePosition): void {
  let position = loadOrCreatePosition(ev.params.key);
  position.size = ev.params.size;
  position.collateralValue = ev.params.collateralValue;
  position.leverage = ev.params.collateralValue
    ? ev.params.size
        .times(integer.fromNumber(10).pow(30))
        .div(ev.params.collateralValue)
    : integer.ZERO;
  position.reserveAmount = ev.params.reserveAmount;
  position.entryPrice = ev.params.entryPrice;
  position.entryInterestRate = ev.params.entryInterestRate;
  position.save();
}

export function handleClosePosition(ev: ClosePosition): void {
  let position = loadOrCreatePosition(ev.params.key);

  // decrease user position count whenever close position
  if (position.status == "OPEN") {
    let user = loadOrCreateUser(Address.fromBytes(position.owner));
    user.positionCount--;
    user.save();
  }
  position.size = ev.params.size;
  position.collateralValue = ev.params.collateralValue;
  position.leverage = ev.params.collateralValue.gt(integer.ZERO)
    ? ev.params.size
        .times(integer.fromNumber(10).pow(30))
        .div(ev.params.collateralValue)
    : integer.ZERO;
  position.reserveAmount = ev.params.reserveAmount;
  position.entryInterestRate = ev.params.entryInterestRate;
  position.status = "CLOSED";
  position.save();
}

export function handleLiquidatePosition(ev: LiquidatePosition): void {
  let position = loadOrCreatePosition(ev.params.key);

  // decrease user position count whenever close position
  if (position.status == "OPEN") {
    let user = loadOrCreateUser(Address.fromBytes(position.owner));
    user.positionCount--;
    user.save();
  }
  // update position
  position.status = "CLOSED";
  position.save();

  // create history
  let poolContract = PoolContract.bind(ev.address);
  let history = new History(`${ev.params.key.toHex()}-${ev.block.timestamp}`);
  history.owner = position.owner;
  history.size = position.size;
  history.collateralValue = position.collateralValue;
  history.side = position.side;
  history.collateralToken = position.collateralToken;
  history.market = position.market;
  history.liquidatedPrice = ev.params.indexPrice;
  history.pnl = ev.params.pnl.abs;
  let fee = getOrNull<Pool__feeResult>(poolContract.try_fee());
  let liquidatedFeeValue = fee ? fee.getLiquidationFee() : integer.ZERO;
  history.liquidatedFeeValue = liquidatedFeeValue;
  let positionFeeValue = fee
    ? fee
        .getPositionFee()
        .times(position.size)
        .div(integer.fromNumber(10).pow(10))
    : integer.ZERO;
  history.closeFeeValue = positionFeeValue;
  history.borrowFeeValue = ev.params.feeValue.minus(positionFeeValue);
  history.status = "LIQUIDATED";
  history.updateType = "DECREASE";
  history.createdAtTimestamp = ev.block.timestamp;
  history.tx = ev.transaction.hash;
  history.save();
}
