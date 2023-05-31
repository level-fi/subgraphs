import { Address, BigInt } from "@graphprotocol/graph-ts";
import { User } from "../generated/schema";

export const _0u256 = BigInt.fromI32(0);
export const _1u256 = BigInt.fromI32(1);

export function loadOrCreateUser(address: Address): User {
  let entity = User.load(address.toHexString());

  if (entity == null) {
    entity = new User(address.toHexString());
    entity.perpOrderCount = _0u256;
    entity.openPerpOrderCount = _0u256;
    entity.swapOrderCount = _0u256;
    entity.openSwapOrderCount = _0u256;
  }

  return entity;
}
