import { Position } from "../generated/schema";
import {
  ClosePosition,
  IncreasePosition,
  LiquidatePosition,
} from "../generated/Pool/Pool";

export function handleIncreasePosition(ev: IncreasePosition): void {
  const key = ev.params.key;
  let entity = Position.load(key.toHexString());

  if (entity == null) {
    entity = new Position(key.toHexString());
    entity.indexToken = ev.params.indexToken;
    entity.collateralToken = ev.params.collateralToken;
    entity.owner = ev.params.account.toHexString();
    entity.side = ev.params.side == 0 ? "LONG" : "SHORT";
    entity.status = "OPEN";
  } else {
    entity.status = "OPEN";
  }

  entity.save();
}

export function handleClosePosition(ev: ClosePosition): void {
  const key = ev.params.key;
  const entity = Position.load(key.toHexString());

  if (entity != null) {
    entity.status = "CLOSED";
    entity.save();
  }
}

export function handleLiquidatePosition(ev: LiquidatePosition): void {
  const key = ev.params.key;
  const entity = Position.load(key.toHexString());

  if (entity != null) {
    entity.status = "LIQUIDATED";
    entity.save();
  }
}
