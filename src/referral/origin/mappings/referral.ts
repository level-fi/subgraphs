import {
  ReferrerSet,
  SetChainToClaimRewards,
  UserUnverified,
  UserVerified,
} from "../generated/LevelReferralRegistry/LevelReferralRegistry";
import {
  ClaimRegistry,
  CrawlIndex,
  Epoch,
  FeeHistory,
  ReferralRegistry,
  Verify,
} from "../generated/schema";
import {
  EpochEnded,
  EpochStarted,
  TradingFeeUpdated,
} from "../generated/LevelReferralController/LevelReferralController";
import { ONE, ZERO } from "../../../config/constant";

function loadCrawlIndex(): CrawlIndex {
  let crawlIndex: CrawlIndex | null = CrawlIndex.load("1");

  if (!crawlIndex) {
    crawlIndex = new CrawlIndex("1");
    crawlIndex.referralRegistryIndex = ZERO;
    crawlIndex.claimRegistryIndex = ZERO;
    crawlIndex.verifyIndex = ZERO;
    crawlIndex.feeHistoryIndex = ZERO;
  }

  return crawlIndex;
}

export function handleReferrerSet(event: ReferrerSet): void {
  let crawlIndex: CrawlIndex = loadCrawlIndex();

  crawlIndex.referralRegistryIndex = crawlIndex.referralRegistryIndex.plus(ONE);

  const referralRegistry: ReferralRegistry = new ReferralRegistry(
    crawlIndex.referralRegistryIndex.toString()
  );

  referralRegistry.index = crawlIndex.referralRegistryIndex;
  referralRegistry.user = event.params.trader;
  referralRegistry.referrer = event.params.referrer;
  referralRegistry.time = event.block.timestamp;

  crawlIndex.save();
  referralRegistry.save();
}

export function handleSetChainToClaimRewards(
  event: SetChainToClaimRewards
): void {
  let crawlIndex: CrawlIndex = loadCrawlIndex();

  crawlIndex.claimRegistryIndex = crawlIndex.claimRegistryIndex.plus(ONE);

  const claimRegistry: ClaimRegistry = new ClaimRegistry(
    crawlIndex.claimRegistryIndex.toString()
  );

  claimRegistry.index = crawlIndex.claimRegistryIndex;
  claimRegistry.user = event.params.user;
  claimRegistry.time = event.block.timestamp;

  crawlIndex.save();
  claimRegistry.save();
}

export function handleTradingFeeUpdated(event: TradingFeeUpdated): void {
  let crawlIndex: CrawlIndex = loadCrawlIndex();

  crawlIndex.feeHistoryIndex = crawlIndex.feeHistoryIndex.plus(ONE);

  const feeHistory: FeeHistory = new FeeHistory(
    crawlIndex.feeHistoryIndex.toString()
  );

  feeHistory.index = crawlIndex.feeHistoryIndex;
  feeHistory.trader = event.params.trader;
  feeHistory.feeValue = event.params.fee;
  feeHistory.epochId = event.params.epoch.toI32();
  feeHistory.time = event.block.timestamp;

  crawlIndex.save();
  feeHistory.save();
}

export function handleEpochStarted(event: EpochStarted): void {
  const epoch: Epoch = new Epoch(event.params.epoch.toString());
  epoch.epochId = event.params.epoch.toI32();
  epoch.startTime = event.params.startTime;

  epoch.save();
}

export function handleEpochEnded(event: EpochEnded): void {
  const epoch: Epoch | null = Epoch.load(event.params.epoch.toString());

  if (epoch) {
    epoch.endTime = event.block.timestamp;
    epoch.endBlock = event.block.number;
    epoch.save();
  }
}

export function handleUserVerified(event: UserVerified): void {
  let crawlIndex: CrawlIndex = loadCrawlIndex();

  crawlIndex.verifyIndex = crawlIndex.verifyIndex.plus(ONE);

  const verify: Verify = new Verify(crawlIndex.verifyIndex.toString());

  verify.index = crawlIndex.verifyIndex;
  verify.user = event.params.user;
  verify.isVerify = 1;
  verify.time = event.block.timestamp;
  verify.block = event.block.number;

  crawlIndex.save();
  verify.save();
}

export function handleUserUnverified(event: UserUnverified): void {
  let crawlIndex: CrawlIndex = loadCrawlIndex();

  crawlIndex.verifyIndex = crawlIndex.verifyIndex.plus(ONE);

  const verify: Verify = new Verify(crawlIndex.verifyIndex.toString());

  verify.index = crawlIndex.verifyIndex;
  verify.user = event.params.user;
  verify.isVerify = 0;
  verify.time = event.block.timestamp;
  verify.block = event.block.number;

  crawlIndex.save();
  verify.save();
}
