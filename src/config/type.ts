import { Address, BigInt } from "@graphprotocol/graph-ts";
export class Config {
  pool: Address;
  poolLens: Address;
  oracle_block_update: BigInt;
  dao_fee_block_update: BigInt;
  lvl_start_tracking_block: BigInt;
  wrapNative: Address;
  tranches: Address[];
  stableTokens: Address[];
  indexTokens: Address[];
}
