import {
  Address,
  BigDecimal,
  BigInt,
  Bytes,
  dataSource,
  ethereum,
} from "@graphprotocol/graph-ts";
import { integer } from "@protofire/subgraph-toolkit";
import { ERC20 } from "../generated/Pool/ERC20";
import { Market, Position, Token, User } from "../generated/schema";

export function getOrNull<T>(result: ethereum.CallResult<T>): T | null {
  return result.reverted ? null : result.value;
}

export function loadOrCreateToken(address: Address): Token {
  let entity = Token.load(address.toHex());
  if (entity != null) {
    return entity;
  }

  entity = new Token(address.toHex());
  let token = ERC20.bind(address);
  let isETH = address.equals(EthAddress);
  let decimals = token.try_decimals();
  let symbol = getOrNull<string>(token.try_symbol());
  entity.decimals = isETH ? 18 : !decimals.reverted ? decimals.value : 0;
  entity.symbol = isETH ? "BNB" : symbol ? symbol : "undefined";
  entity.price = BigDecimal.zero();
  return entity;
}

export function loadOrCreateMarket(indexToken: Address): Market {
  let entity = Market.load(indexToken.toHex());
  if (entity != null) {
    return entity;
  }

  entity = new Market(indexToken.toHex());
  entity.indexToken = indexToken.toHex();
  return entity;
}

export function loadOrCreatePosition(key: Bytes): Position {
  let entity = Position.load(key.toHex());
  if (entity != null) {
    return entity;
  }
  entity = new Position(key.toHex());
  entity.size = integer.ZERO;
  entity.status = "CLOSED";
  entity.collateralValue = integer.ZERO;
  entity.leverage = integer.ZERO;
  entity.reserveAmount = integer.ZERO;
  entity.entryPrice = integer.ZERO;
  entity.entryInterestRate = integer.ZERO;
  entity.realizedPnl = integer.ZERO;

  return entity;
}

export function loadOrCreateUser(address: Address): User {
  let entity = User.load(address.toHex());

  if (entity != null) {
    return entity;
  }
  entity = new User(address.toHex());
  entity.positionCount = 0;
  entity.orderCount = 0;
  entity.swapCount = 0;
  entity.swapOrderCount = 0;
  return entity;
}

export const EthAddress = Address.fromHexString("0x" + "e".repeat(40));

// decimals
export const ValueDecimals = 30;

export const toDecimal = (value: BigInt, decimal: number): BigDecimal =>
  value.divDecimal(
    integer
      .fromNumber(10)
      .pow(decimal as i8)
      .toBigDecimal()
  );

export const isTestnet = dataSource.network().includes("testnet");

export const ORACLE_BLOCK = BigInt.fromI32(isTestnet ? 25645910 : 24148430);

export const isNewOracleStart = (ev: ethereum.Event): boolean =>
  ev.block.number.ge(ORACLE_BLOCK);
