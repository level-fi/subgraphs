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
import { Market, Position, PriceStat, Protocol, Token, User } from "../generated/schema";
import { config } from "../../../config";
import { ZERO } from "../../../config/constant";
import { Pool } from "../generated/OrderManager/Pool";
import { Oracle as OracleTemplate } from "../generated/templates";

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

export function loadOrCreateProtocol(): Protocol {
  let entity = Protocol.load("1");
  if (!entity) {
    entity = new Protocol("1");
    const pool = Pool.bind(config.pool);
    const oracle = pool.try_oracle();
    if (!oracle.reverted) {
      OracleTemplate.create(oracle.value);
      entity.oracle = oracle.value;
      entity.save();
    }
  }
  return entity;
}

export function _getPrice(token: Address): BigInt {
  if (token.equals(EthAddress)) {
    token = config.wrapNative;
  }
  const entity = PriceStat.load(token.toHex());
  if (!entity) {
    return ZERO;
  }
  return entity.value;
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
