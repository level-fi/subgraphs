import { Address, BigInt } from "@graphprotocol/graph-ts";

export class TokenConfig {
  wbnb: Address;
  lvl: Address;
  lvl_wbnb_pair: Address;
  busd: Address;
  busd_wbnb_pair: Address;
}

export class Config {
  pool: Address;
  oracle: Address;
  oracle_block_update: BigInt;
  dao_fee_block_update: BigInt;
  lvl_start_tracking_block: BigInt;
  tokens: TokenConfig;
  stableTokens: Address[];
  rewardTokenFunds: Address[];
  excludeFunds: Address[];
  staking: Address;
  tranches: Address[];
  excludeTrackLp: Address[];
  poolTokens: Address[];
  rewardPoolId: BigInt;
}
