import {
  Address,
  BigInt,
  ByteArray,
  crypto,
  ethereum,
} from "@graphprotocol/graph-ts";
import { integer } from "@protofire/subgraph-toolkit";
import {
  Initialized,
  OracleChanged,
  OrderCancelled,
  OrderExecuted,
  OrderManager,
  OrderManager__swapOrdersResult,
  OrderPlaced,
  Swap,
  SwapOrderCancelled,
  SwapOrderExecuted,
  SwapOrderPlaced,
} from "../generated/OrderManager/OrderManager";
import { History, Order, Token } from "../generated/schema";
import {
  _getPrice,
  getOrNull,
  loadOrCreateProtocol,
  loadOrCreateUser,
  ValueDecimals,
} from "./helper";
import { ZERO } from "../../../config/constant";
import { config } from "../../../config";
import { Oracle as OracleTemplate } from "../generated/templates";

export function handleOrderPlaced(ev: OrderPlaced): void {
  let collateralPrice = _getPrice(ev.params.order.collateralToken);

  // create order entity
  let order = new Order(ev.params.key.toHex());
  order.owner = ev.params.order.owner;
  order.market = ev.params.order.indexToken.toHex();
  order.collateralToken = ev.params.order.collateralToken;
  order.payToken = ev.params.order.payToken;
  order.sizeChange = ev.params.request.sizeChange;
  order.executionFee = ev.params.order.executionFee;
  order.expiresAt = ev.params.order.expiresAt;
  order.submissionBlock = ev.params.order.submissionBlock;
  order.submissionTimestamp = ev.block.timestamp;
  order.price = ev.params.order.price;
  order.triggerAboveThreshold = ev.params.order.triggerAboveThreshold;
  order.executionTimestamp = integer.ZERO;
  order.executionPrice = integer.ZERO;
  order.side = ev.params.request.side;
  order.updateType =
    ev.params.request.updateType == 0 ? "INCREASE" : "DECREASE";
  order.type = ev.params.order.expiresAt.gt(integer.ZERO) ? "MARKET" : "LIMIT";
  order.collateralValue = collateralPrice
    ? order.updateType === "INCREASE"
      ? collateralPrice
        ? ev.params.request.collateral.times(collateralPrice)
        : integer.ZERO
      : ev.params.request.collateral
    : integer.ZERO;
  order.status = "OPEN";
  order.tx = ev.transaction.hash;
  order.save();

  // create history entity
  let history = new History(`${ev.params.key.toHex()}-${ev.block.timestamp}`);
  history.owner = order.owner;
  history.size = order.sizeChange;
  history.collateralValue = order.collateralValue;
  history.side = order.side;
  history.type = order.type;
  history.updateType = order.updateType;
  history.collateralToken = order.collateralToken;
  history.market = order.market;
  history.triggerPrice = order.price;
  history.executionPrice = order.executionPrice;
  history.triggerAboveThreshold = order.triggerAboveThreshold;
  history.status = order.status;
  history.createdAtTimestamp = ev.block.timestamp;
  history.tx = ev.transaction.hash;
  history.save();

  // increase user order count with limit order
  if (order.type == "LIMIT") {
    let user = loadOrCreateUser(ev.params.order.owner);
    user.orderCount++;
    user.save();
  }
}

export function handleOrderCancelled(ev: OrderCancelled): void {
  let order = Order.load(ev.params.key.toHex());
  if (!order) {
    return;
  }

  // decrease user order count whenever cancel limit order
  if (order.status == "OPEN" && order.type == "LIMIT") {
    let user = loadOrCreateUser(Address.fromBytes(order.owner));
    user.orderCount--;
    user.save();
  }

  // update order status to CANCELLED
  order.status = "CANCELLED";
  order.save();

  // create history order
  let history = new History(`${ev.params.key.toHex()}-${ev.block.timestamp}`);
  history.owner = order.owner;
  history.size = order.sizeChange;
  history.collateralValue = order.collateralValue;
  history.side = order.side;
  history.type = order.type;
  history.updateType = order.updateType;
  history.collateralToken = order.collateralToken;
  history.market = order.market;
  history.triggerPrice = order.price;
  history.executionPrice = order.executionPrice;
  history.triggerAboveThreshold = order.triggerAboveThreshold;
  history.status = order.status;
  history.createdAtTimestamp = ev.block.timestamp;
  history.tx = ev.transaction.hash;
  history.save();
}

export function handleOrderExpired(ev: OrderCancelled): void {
  let order = Order.load(ev.params.key.toHex());
  if (!order) {
    return;
  }

  // decrease user order count whenever expired limit order
  if (order.status == "OPEN" && order.type == "LIMIT") {
    let user = loadOrCreateUser(Address.fromBytes(order.owner));
    user.orderCount--;
    user.save();
  }

  // update order status to EXPIRED
  order.status = "EXPIRED";
  order.save();

  // create history entity
  let history = new History(`${ev.params.key.toHex()}-${ev.block.timestamp}`);
  history.owner = order.owner;
  history.size = order.sizeChange;
  history.collateralValue = order.collateralValue;
  history.side = order.side;
  history.type = order.type;
  history.updateType = order.updateType;
  history.collateralToken = order.collateralToken;
  history.market = order.market;
  history.triggerPrice = order.price;
  history.executionPrice = order.executionPrice;
  history.triggerAboveThreshold = order.triggerAboveThreshold;
  history.status = order.status;
  history.createdAtTimestamp = ev.block.timestamp;
  history.tx = ev.transaction.hash;
  history.save();
}

export function handleOrderExecuted(ev: OrderExecuted): void {
  let order = Order.load(ev.params.key.toHex());
  if (!order) {
    return;
  }

  // decrease user order count whenever executed limit order
  if (order.status == "OPEN" && order.type == "LIMIT") {
    let user = loadOrCreateUser(Address.fromBytes(order.owner));
    user.orderCount--;
    user.save();
  }

  // update order status to FILLED
  // update execution price and execution timestamp
  order.status = "FILLED";
  order.executionTimestamp = ev.block.timestamp;
  order.executionPrice = ev.params.fillPrice;
  order.save();

  // create history entity
  let history = new History(`${ev.params.key.toHex()}-${ev.block.number}`);
  history.owner = order.owner;
  history.size = order.sizeChange;
  history.collateralValue = order.collateralValue;
  history.side = order.side;
  history.type = order.type;
  history.updateType = order.updateType;
  history.collateralToken = order.collateralToken;
  history.market = order.market;
  history.triggerPrice = order.price;
  history.executionPrice = order.executionPrice;
  history.triggerAboveThreshold = order.triggerAboveThreshold;
  history.status = order.status;
  history.createdAtTimestamp = ev.block.timestamp;
  history.tx = ev.transaction.hash;
  history.save();
}

export function handleSwapOrderPlaced(ev: SwapOrderPlaced): void {
  let orderContract = OrderManager.bind(ev.address);
  let swapOrder = getOrNull<OrderManager__swapOrdersResult>(
    orderContract.try_swapOrders(ev.params.key)
  );
  if (!swapOrder) {
    return;
  }

  // create order entity
  let order = new Order(`${ev.params.key.toHex()}-SWAP`);
  order.owner = swapOrder.getOwner();
  order.tokenIn = swapOrder.getTokenIn();
  order.tokenOut = swapOrder.getTokenOut();
  order.amountIn = swapOrder.getAmountIn();
  order.minAmountOut = swapOrder.getMinAmountOut();
  order.price = swapOrder.getPrice();
  order.executionPrice = integer.ZERO;
  order.executionFee = swapOrder.getExecutionFee();
  order.submissionBlock = ev.block.number;
  order.submissionTimestamp = ev.block.timestamp;
  order.updateType = "SWAP";
  order.type = "LIMIT";
  order.status = "OPEN";
  order.tx = ev.transaction.hash;
  order.save();

  // create history entity
  let history = new History(`${ev.params.key.toHex()}-${ev.block.timestamp}`);
  history.owner = order.owner;
  history.type = order.type;
  history.updateType = order.updateType;
  history.tokenIn = order.tokenIn;
  history.tokenOut = order.tokenOut;
  history.amountIn = order.amountIn;
  history.minAmountOut = order.minAmountOut;
  history.triggerPrice = order.price;
  history.status = order.status;
  history.createdAtTimestamp = ev.block.timestamp;
  history.tx = ev.transaction.hash;
  history.save();
  
  // increase user order count whenever place limit swap order
  let user = loadOrCreateUser(swapOrder.getOwner());
  user.swapOrderCount++;
  user.save();
}

export function handleSwapOrderCancelled(ev: SwapOrderCancelled): void {
  let key = ev.params.key.toHex();
  let order = Order.load(`${key}-SWAP`);
  if (!order) {
    return;
  }

  // decrease user order count whenever cancel limit swap order
  if (order.status == "OPEN") {
    let user = loadOrCreateUser(Address.fromBytes(order.owner));
    user.swapOrderCount--;
    user.save();
  }

  // update order status to CANCELLED
  order.status = "CANCELLED";
  order.save();

  // create history entity
  let history = new History(`${key}-${ev.block.timestamp}`);
  history.owner = order.owner;
  history.type = order.type;
  history.updateType = order.updateType;
  history.tokenIn = order.tokenIn;
  history.tokenOut = order.tokenOut;
  history.amountIn = order.amountIn;
  history.minAmountOut = order.minAmountOut;
  history.triggerPrice = order.price;
  history.status = order.status;
  history.createdAtTimestamp = ev.block.timestamp;
  history.tx = ev.transaction.hash;

  history.save();
}

export function handleSwapOrderExecuted(ev: SwapOrderExecuted): void {
  let key = ev.params.key.toHex();
  let order = Order.load(`${key}-SWAP`);
  if (!order) {
    return;
  }

  // decrease user order count whenever executed swap order
  if (order.status == "OPEN") {
    let user = loadOrCreateUser(Address.fromBytes(order.owner));
    user.swapOrderCount--;
    user.save();
  }

  // update order status to FILLED
  // update order amount out
  order.amountOut = ev.params.amountOut;
  order.status = "FILLED";
  order.save();

  // create history entity
  let history = new History(`${key}-${ev.block.timestamp}`);
  history.owner = order.owner;
  history.type = order.type;
  history.updateType = order.updateType;
  history.tokenIn = order.tokenIn;
  history.tokenOut = order.tokenOut;
  history.amountIn = order.amountIn;
  history.amountOut = order.amountOut;
  history.minAmountOut = order.minAmountOut;
  let tokenInPrice = ZERO;
  if (order.tokenIn) {
    tokenInPrice = _getPrice(Address.fromBytes(history.tokenIn!));
  }
  if (order.amountIn) {
    history.valueIn = tokenInPrice.times(order.amountIn!);
  }
  let receipt = ev.receipt;
  if (receipt) {
    let swapLogs = receipt.logs.filter(function (l) {
      return l.topics[0].equals(
        crypto.keccak256(
          ByteArray.fromUTF8(
            "Swap(address,address,address,uint256,uint256,uint256)"
          )
        )
      );
    });
    let filterSwapLog: ethereum.Log | null = null;
    for (let i = 0; i < swapLogs.length; i++) {
      let swapLog = swapLogs[i];
      if (swapLog.logIndex.ge(ev.logIndex)) {
        break;
      }
      filterSwapLog = swapLog;
    }
    if (filterSwapLog) {
      let params: ethereum.Tuple;
      let swapFee: BigInt;
      let tokenOut: Address;
      if (ev.block.number.ge(config.dao_fee_block_update)) {
        params = ethereum
          .decode(
            "(address,address,uint256,uint256,uint256)",
            filterSwapLog.data
          )!
          .toTuple();
        swapFee = params[4].toBigInt();
        tokenOut = params[1].toAddress();
      } else {
        params = ethereum
          .decode(
            "(address,address,address,uint256,uint256,uint256)",
            filterSwapLog.data
          )!
          .toTuple();
        swapFee = params[5].toBigInt();
        tokenOut = params[2].toAddress();
      }
      let token = Token.load(tokenOut.toHex());
      if (token) {
        let executionPrice = ev.params.amountOut
          .times(
            integer.fromNumber(10).pow((ValueDecimals - token.decimals) as i8)
          )
          .div(ev.params.amountIn.minus(swapFee));
        order.executionPrice = executionPrice;
        history.executionPrice = executionPrice;
        history.swapFeeValue = swapFee.times(tokenInPrice);
        order.save();
      }
    }
  }
  history.status = order.status;
  history.createdAtTimestamp = ev.block.timestamp;
  history.tx = ev.transaction.hash;
  history.save();
}

export function handleSwap(ev: Swap): void {
  // create history entity
  let history = new History(
    `${ev.transaction.hash.toHex()}-${ev.block.timestamp}`
  );
  history.owner = ev.params.account;
  history.type = "MARKET";
  history.updateType = "SWAP";
  history.tokenIn = ev.params.tokenIn;
  history.tokenOut = ev.params.tokenOut;
  history.amountIn = ev.params.amountIn;
  history.amountOut = ev.params.amountOut;
  history.status = "FILLED";
  history.createdAtTimestamp = ev.block.timestamp;
  history.tx = ev.transaction.hash;
  let tokenInPrice = _getPrice(ev.params.tokenIn);
  history.valueIn = tokenInPrice.times(ev.params.amountIn);
  let receipt = ev.receipt;
  if (receipt) {
    let swapLogs = receipt.logs.filter(function (l) {
      return l.topics[0].equals(
        crypto.keccak256(
          ByteArray.fromUTF8(
            "Swap(address,address,address,uint256,uint256,uint256)"
          )
        )
      );
    });
    let filterSwapLog: ethereum.Log | null = null;
    for (let i = 0; i < swapLogs.length; i++) {
      let swapLog = swapLogs[i];
      if (swapLog.logIndex.ge(ev.logIndex)) {
        break;
      }
      filterSwapLog = swapLog;
    }
    if (filterSwapLog) {
      let params: ethereum.Tuple;
      let swapFee: BigInt;
      let tokenOut: Address;
      if (ev.block.number.ge(config.dao_fee_block_update)) {
        params = ethereum
          .decode(
            "(address,address,uint256,uint256,uint256)",
            filterSwapLog.data
          )!
          .toTuple();
        swapFee = params[4].toBigInt();
        tokenOut = params[1].toAddress();
      } else {
        params = ethereum
          .decode(
            "(address,address,address,uint256,uint256,uint256)",
            filterSwapLog.data
          )!
          .toTuple();
        swapFee = params[5].toBigInt();
        tokenOut = params[2].toAddress();
      }
      history.swapFeeValue = swapFee.times(tokenInPrice);
    }
  }
  history.save();
}

export function handleOracleChanged(ev: OracleChanged): void {
  const protocol = loadOrCreateProtocol();
  protocol.oracle = ev.params.param0;
  protocol.save();

  OracleTemplate.create(ev.params.param0);
}

export function handleInitialized(ev: Initialized): void {
  loadOrCreateProtocol();
}