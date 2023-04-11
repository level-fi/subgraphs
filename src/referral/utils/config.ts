import { dataSource, BigInt, Address } from "@graphprotocol/graph-ts";

export const isTestnet = dataSource.network().includes("testnet");

class Config {
  lvlOracle: Address;
  lvlOracleV2: Address;
  referral_epoch_update: BigInt;
  rebate_referrer: BigInt[];
  discount_trader: BigInt[];
}

const bsc: Config = {
  lvlOracle: Address.fromString("0xf4bd28b3f29f910c3519382f8aedc8d60b98301a"),
  lvlOracleV2: Address.fromString("0x03D5c199c4Abf2451D7b64b73A8078fC5a05eBa9"),
  referral_epoch_update: BigInt.fromI32(4),
  rebate_referrer: [
    BigInt.fromI32(0),
    BigInt.fromI32(50000),
    BigInt.fromI32(100000),
    BigInt.fromI32(150000),
  ],
  discount_trader: [
    BigInt.fromI32(0),
    BigInt.fromI32(50000),
    BigInt.fromI32(100000),
    BigInt.fromI32(100000),
  ],
};

const bsc_testnet: Config = {
  lvlOracle: Address.fromString("0x25f986532cCdF24B6249F6AC64f3a968De97e710"),
  lvlOracleV2: Address.fromString("0xD0F1Cb0791Af0fa6A9a8Ec1874AA746BfeEeE284"),
  referral_epoch_update: BigInt.fromI32(9),
  rebate_referrer: [
    BigInt.fromI32(0),
    BigInt.fromI32(50000),
    BigInt.fromI32(100000),
    BigInt.fromI32(150000),
  ],
  discount_trader: [
    BigInt.fromI32(0),
    BigInt.fromI32(50000),
    BigInt.fromI32(100000),
    BigInt.fromI32(100000),
  ],
};

export const config = isTestnet ? bsc_testnet : bsc;
