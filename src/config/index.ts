import { Address, BigInt } from "@graphprotocol/graph-ts";
import { network } from "./constant";
import { Config } from "./type";

const bsc: Config = {
  pool: Address.fromString("0xA5aBFB56a78D2BD4689b25B8A77fd49Bb0675874"),
  poolLens: Address.fromString("0xbb89b4910dab84ff62eed0a3e0892c5f5876c49a"),
  oracle_block_update: BigInt.fromI32(24148430),
  dao_fee_block_update: BigInt.fromI32(24088804),
  lvl_start_tracking_block: BigInt.fromI32(24239465),
  tranches: [
    Address.fromString("0xB5C42F84Ab3f786bCA9761240546AA9cEC1f8821"), // Senior Tranche
    Address.fromString("0x4265af66537F7BE1Ca60Ca6070D97531EC571BDd"), // Mezzanine Tranche
    Address.fromString("0xcC5368f152453D497061CB1fB578D2d3C54bD0A0"), // Junior Tranche
  ],
  wrapNative: Address.fromString("0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"),
  stableTokens: [
    Address.fromString("0x55d398326f99059fF775485246999027B3197955"), // usdt
    Address.fromString("0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56"), // busd
  ],
  indexTokens: [
    Address.fromString("0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c"), // btc
    Address.fromString("0x2170Ed0880ac9A755fd29B2688956BD959F933F8"), // eth
    Address.fromString("0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"), // wbnb
    Address.fromString("0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82"), // cake
  ],
};

const arbitrum: Config = {
  pool: Address.fromString("0x32B7bF19cb8b95C27E644183837813d4b595dcc6"),
  poolLens: Address.fromString("0x451acd3643D37B2841bEAc94E9a7320f11FDA06F"),
  oracle_block_update: BigInt.fromI32(0),
  dao_fee_block_update: BigInt.fromI32(0),
  lvl_start_tracking_block: BigInt.fromI32(0),
  tranches: [
    Address.fromString("0x5573405636F4b895E511C9C54aAfbefa0E7Ee458"), //Senior Tranche
    Address.fromString("0xb076f79f8D1477165E2ff8fa99930381FB7d94c1"), //Mezzanine Tranche
    Address.fromString("0x502697AF336F7413Bb4706262e7C506Edab4f3B9"), //Junior Tranche
  ],
  wrapNative: Address.fromString("0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"),
  stableTokens: [
    Address.fromString("0xaf88d065e77c8cC2239327C5EDb3A432268e5831"), //usdc
    Address.fromString("0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"), //usdt
  ],
  indexTokens: [
    Address.fromString("0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f"), //btc
    Address.fromString("0x912CE59144191C1204E64559FE8253a0e49E6548"), //arb
    Address.fromString("0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"), //eth
  ],
};
export const config = network == "bsc" ? bsc : arbitrum;
