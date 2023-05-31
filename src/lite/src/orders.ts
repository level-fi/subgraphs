import { PerpOrder, SwapOrder } from "../generated/schema";
import {
  OrderCancelled,
  OrderExecuted,
  OrderExpired,
  OrderManager,
  OrderPlaced,
  SwapOrderCancelled,
  SwapOrderExecuted,
  SwapOrderPlaced,
} from "../generated/OrderManager/OrderManager";
import { _1u256, loadOrCreateUser } from "./user";
import { User } from "../generated/schema";

export function handlePerpOrderPlaced(ev: OrderPlaced): void {
  const order = new PerpOrder(ev.params.key.toString());
  const owner = ev.params.order.owner;
  order.orderId = ev.params.key;
  order.owner = ev.params.order.owner.toHexString();
  order.indexToken = ev.params.order.indexToken;
  order.collateralToken = ev.params.order.collateralToken;
  order.payToken = ev.params.order.payToken;
  order.price = ev.params.order.price;
  order.side = ev.params.request.side;
  order.triggerAboveThreshold = ev.params.order.triggerAboveThreshold;
  order.status = "OPEN";
  order.createdAt = ev.block.timestamp;
  order.createdAtBlock = ev.block.number;
  order.expiresAt = ev.params.order.expiresAt;
  order.updateType =
    ev.params.request.updateType == 0 ? "INCREASE" : "DECREASE";
  order.sizeChange = ev.params.request.sizeChange;
  order.collateral = ev.params.request.collateral;

  const user = loadOrCreateUser(owner);
  user.perpOrderCount = user.perpOrderCount.plus(_1u256);
  user.openPerpOrderCount = user.openPerpOrderCount.plus(_1u256);

  order.save();
  user.save();
}

export function handlePerpOrderCancelled(ev: OrderCancelled): void {
  const order = PerpOrder.load(ev.params.key.toString());

  if (order != null) {
    order.status = "CANCELLED";
    order.save();

    const user = User.load(order.owner);
    if (user != null) {
      user.openPerpOrderCount = user.openPerpOrderCount.minus(_1u256);
      user.save();
    }
  }
}

export function handlePerpOrderExpired(ev: OrderExpired): void {
  const order = PerpOrder.load(ev.params.key.toString());

  if (order != null) {
    order.status = "EXPIRED";
    order.save();

    const user = User.load(order.owner);
    if (user != null) {
      user.openPerpOrderCount = user.openPerpOrderCount.minus(_1u256);
      user.save();
    }
  }
}

export function handlePerpOrderExecuted(ev: OrderExecuted): void {
  const order = PerpOrder.load(ev.params.key.toString());
  if (order != null) {
    order.status = "FILLED";
    order.save();

    const user = User.load(order.owner);
    if (user != null) {
      user.openPerpOrderCount = user.openPerpOrderCount.minus(_1u256);
      user.save();
    }
  }
}

export function handleSwapOrderPlaced(ev: SwapOrderPlaced): void {
  const orderManager = OrderManager.bind(ev.address);
  const orderResult = orderManager.try_swapOrders(ev.params.key);
  if (orderResult.reverted) {
    return;
  }

  const order = orderResult.value;
  const entity = new SwapOrder(ev.params.key.toString());
  const owner = order.getOwner();
  entity.owner = owner.toHexString();
  entity.tokenIn = order.getTokenIn();
  entity.tokenOut = order.getTokenOut();
  entity.amountIn = order.getAmountIn();
  entity.minAmountOut = order.getMinAmountOut();
  entity.status = "OPEN";
  entity.createdAt = ev.block.timestamp;
  entity.createdAtBlock = ev.block.number;
  entity.orderId = ev.params.key;
  entity.save();

  const user = loadOrCreateUser(owner);
  user.swapOrderCount = user.swapOrderCount.plus(_1u256);
  user.openSwapOrderCount = user.openSwapOrderCount.plus(_1u256);
  user.save();
}

export function handleSwapOrderCancelled(ev: SwapOrderCancelled): void {
  const order = SwapOrder.load(ev.params.key.toString());
  if (order != null) {
    order.status = "CANCELLED";
    order.save();

    const user = User.load(order.owner);
    if (user != null) {
      user.openSwapOrderCount = user.openSwapOrderCount.minus(_1u256);
      user.save();
    }
  }
}

export function handleSwapOrderExecuted(ev: SwapOrderExecuted): void {
  const order = SwapOrder.load(ev.params.key.toString());
  if (order != null) {
    order.status = "FILLED";
    order.save();

    const user = User.load(order.owner);
    if (user != null) {
      user.openSwapOrderCount = user.openSwapOrderCount.minus(_1u256);
      user.save();
    }
  }
}
