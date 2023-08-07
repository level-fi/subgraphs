import {
  BigInt,
  BigDecimal,
  Address,
  dataSource,
} from "@graphprotocol/graph-ts";

export const network = dataSource.network();

export const ZERO = BigInt.zero();

export const DECIMAL_ZERO = BigDecimal.zero();

export const ONE = BigInt.fromI32(1);

export const NEGATIVE_ONE = BigInt.fromI32(-1);

export const VALUE_DECIMALS = 30 as i8;

export const TOKEN_DECIMALS = 18 as i8;

export const INTEREST_RATE_DECIMALS = 10 as i8;

export const PRICE_FEED_DECIMALS = 8 as i8;

export const FEE_PRECISION = BigInt.fromI32(10).pow(10);

export const VALUE_PRECISION = BigInt.fromI32(10).pow(VALUE_DECIMALS);

export const TOKEN_PRECISION = BigInt.fromI32(10).pow(TOKEN_DECIMALS);

export const PRICE_FEED_PRECISION = BigInt.fromI32(10).pow(PRICE_FEED_DECIMALS);

export const ADDRESS_ZERO = Address.fromString("0x" + "0".repeat(40));

export const ACCRUAL_INTERVAL = 3600; // 1 hour
