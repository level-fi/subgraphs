import { Address, BigInt } from "@graphprotocol/graph-ts";
import { isTestnet } from "./constant";
import { Config } from "./type";

const bsc: Config = {
  pool: Address.fromString("0xA5aBFB56a78D2BD4689b25B8A77fd49Bb0675874"),
  oracle: Address.fromString("0x04Db83667F5d59FF61fA6BbBD894824B233b3693"),
  oracle_block_update: BigInt.fromI32(24148430),
  dao_fee_block_update: BigInt.fromI32(24088804),
  lvl_start_tracking_block: BigInt.fromI32(24239465),
  rewardTokenFunds: [
    Address.fromString("0x92a0a11a57c28d4c86a629530fd59b83b1276003"), // incentive
    Address.fromString("0x9a1409a1b7826a80b6c6d33f85a342cd9448fb54"), // partnership
    Address.fromString("0xd804ea7306abe2456bdd04a31f6f6a2f55dc0d21"), // lockdrop
    Address.fromString("0x804bbb7a06c0934571aAD137360215ef1335e6A1"), // dev
    Address.fromString("0x1ab33a7454427814a71f128109fe5b498aa21e5d"), // farm
    Address.fromString("0x5aE081b6647aEF897dEc738642089D4BDa93C0e7"), // farm v2
    Address.fromString("0xA67FBecEa04d09a96b6153651093732352A45FFf"), // dao vesting
    Address.fromString("0x0415ede62fcebddd4012f0612fbf4409fe9ed3c5"), // dao vesting v2
    Address.fromString("0xfAfb51D61a450974042A1Ce40d2BAF6257486eeA"), // dao vesting v3
    Address.fromString("0x8BFf27E9Fa1C28934554e6B5239Fb52776573619"), // treasury
    Address.fromString("0x22E7F559bE09B6A758F02A84dDC64f45642206a1"), // referral
    Address.fromString("0x977087422C008233615b572fBC3F209Ed300063a"), // referral v2
    Address.fromString("0x95883611685a20936EC935B0A33F82e11D478e3D"), // loyalty level
    Address.fromString("0x9c1A19038dF30636e15e67303d9ed3474d76e015"), // bootstrap
    Address.fromString("0xB07953F23545796710957faec97F05B21146AC2d"), // level reserve
  ],
  excludeFunds: [
    Address.fromString("0x804bbb7a06c0934571aAD137360215ef1335e6A1"), // dev
    Address.fromString("0xA67FBecEa04d09a96b6153651093732352A45FFf"), // dao vesting
    Address.fromString("0x0415ede62fcebddd4012f0612fbf4409fe9ed3c5"), // dao vesting v2
    Address.fromString("0xfAfb51D61a450974042A1Ce40d2BAF6257486eeA"), // dao vesting v3
  ],
  staking: Address.fromString("0x87CC04d6FE59859cB7eB6d970EBc22dCdCBc9368"),
  tranches: [
    Address.fromString("0xB5C42F84Ab3f786bCA9761240546AA9cEC1f8821"), // Senior Tranche
    Address.fromString("0x4265af66537F7BE1Ca60Ca6070D97531EC571BDd"), // Mezzanine Tranche
    Address.fromString("0xcC5368f152453D497061CB1fB578D2d3C54bD0A0"), // Junior Tranche
  ],
  excludeTrackLp: [
    Address.fromString("0x0000000000000000000000000000000000000000"),
    Address.fromString("0x1Ab33A7454427814a71F128109fE5B498Aa21E5d"), // farm
    Address.fromString("0x5aE081b6647aEF897dEc738642089D4BDa93C0e7"), // farm v2
    Address.fromString("0xBD8638C1fF477275E49aaAe3E4691b74AE76BeCd"), // Liquidity Router
    Address.fromString("0x70f1555889dD1bD458A430bD57D22c12C6FCF9a4"), // LockDrop Old
    Address.fromString("0xd804ea7306abe2456bdd04a31f6f6a2f55dc0d21"), // LockDrop
    Address.fromString("0x8BFf27E9Fa1C28934554e6B5239Fb52776573619"), // Treasury
    Address.fromString("0xf37DAc12B916356c44585333F33Cd2dF366dA487"), // LlpRewardDistributor
    Address.fromString("0xB61c13458626e33ee362390e2AD2D4F15F2a2031"), // GovernanceRedemptionPoolV2
    Address.fromString("0xe5f3b669fd58AF914111759da054f3029734678C"), // Staking LGO
    Address.fromString("0x08A12FFedf49fa5f149C73B07E31f99249e40869"), // Staking LVL
  ],
  tokens: {
    wbnb: Address.fromString("0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"),
    lvl: Address.fromString("0xB64E280e9D1B5DbEc4AcceDb2257A87b400DB149"),
    busd: Address.fromString("0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56"),
    lvl_wbnb_pair: Address.fromString(
      "0x70f16782010fa7ddf032a6aacdeed05ac6b0bc85"
    ),
    busd_wbnb_pair: Address.fromString(
      "0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16"
    ),
  },
  stableTokens: [
    Address.fromString("0x55d398326f99059fF775485246999027B3197955"), // usdt
    Address.fromString("0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56"), // busd
  ],
  poolTokens: [
    Address.fromString("0x55d398326f99059fF775485246999027B3197955"), // usdt
    Address.fromString("0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56"), // busd
    Address.fromString("0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c"), // btc
    Address.fromString("0x2170Ed0880ac9A755fd29B2688956BD959F933F8"), // eth
    Address.fromString("0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"), // wbnb
    Address.fromString("0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82"), // cake
  ],
  rewardPoolId: BigInt.fromI32(3),
};

const bsc_testnet: Config = {
  pool: Address.fromString("0x339e42dFd61f4f4D1Be5D6D4b422FC571eC948DD"),
  oracle: Address.fromString("0x9D8D9Ca236f565FAA03AdB31eEc09bF40C0c2d7e"),
  oracle_block_update: BigInt.fromI32(25645910),
  dao_fee_block_update: BigInt.fromI32(26243166),
  lvl_start_tracking_block: BigInt.fromI32(25070273),
  rewardTokenFunds: [
    Address.fromString("0x9d4ad36F2C8679a9645e8dee0F38b473aB971103"), // lockdrop
    Address.fromString("0x3A6fB632567e333C4cc05cB5beDCFE386120eaDE"), // farm
    Address.fromString("0x2Eb3D4bFAC30B01101dE87dD8Bb73Da3Deb34c59"), // referral
    Address.fromString("0xa70271AF28FD14AB2B8534c8a9297588b45ffcf4"), // loyalty level
  ],
  excludeFunds: [],
  staking: Address.fromString("0xa744b864fE9Ca8E7cD227cfe8eC975840d457EA8"),
  tranches: [
    Address.fromString("0x840FFC777d9946417c07df1f85f8f5835270ee4a"), // Senior Tranche
    Address.fromString("0x39007531cc3E86F52DDBd1fb9a93e1D67008a7a5"), // Mezzanine Tranche
    Address.fromString("0x58C5D5082c24128C087dE52269b26c91bDcb7cD8"), // Junior Tranche
  ],
  excludeTrackLp: [
    Address.fromString("0x0000000000000000000000000000000000000000"),
    Address.fromString("0x3A6fB632567e333C4cc05cB5beDCFE386120eaDE"), // farm
  ],
  tokens: {
    wbnb: Address.fromString("0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd"),
    lvl: Address.fromString("0x0f45eD1F06d2442d18B73Ab49AC5f1b8FB51211e"),
    busd: Address.fromString("0x14C6cD8582eC95cE3E6FA5e6FDDF0b994717B55b"),
    lvl_wbnb_pair: Address.fromString(
      "0x1c82C4703be6c49C98867D438CC63fCF8D4D5017"
    ),
    busd_wbnb_pair: Address.fromString(
      "0xc476a8E5703D3cD58a54056e54F1E99E5944E6D7"
    ),
  },
  stableTokens: [
    Address.fromString("0x2F964CBa95FB30183084D0B8d672D819aD080e00"), // usdt
    Address.fromString("0x14C6cD8582eC95cE3E6FA5e6FDDF0b994717B55b"), // busd
  ],
  poolTokens: [
    Address.fromString("0x2F964CBa95FB30183084D0B8d672D819aD080e00"), // usdt
    Address.fromString("0x14C6cD8582eC95cE3E6FA5e6FDDF0b994717B55b"), // busd
    Address.fromString("0xdb87048a45c75F077eCEE18b0C344Eb167CBBb42"), // btc
    Address.fromString("0x9e421F4606ec42Cd7F88260419566c9f233Cfa98"), // eth
    Address.fromString("0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd"), // wbnb
    Address.fromString("0x6FbF1AA3cB4CF6E00F9431828439333eA10215ba"), // cake
  ],
  rewardPoolId: BigInt.fromI32(3),
};

export const config = isTestnet ? bsc_testnet : bsc;
