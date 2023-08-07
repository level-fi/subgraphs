import {
  Address,
  BigInt,
  ByteArray,
  crypto,
  ethereum,
} from "@graphprotocol/graph-ts";
import {
  BatchStarted,
  BatchVestingDurationSet,
  Claimed,
  RewardAdded,
  RewardAllocated,
  Transfer,
} from "../generated/LyLevel/LyLevel";
import {
  LoyaltyHistory,
  LoyaltyProgram,
  LoyaltyProtocol,
  LoyaltyRedeemHistory,
  LoyaltyUserBatch,
} from "../generated/schema";
import { ADDRESS_ZERO, ZERO } from "../../../config/constant";
import { Side } from "../../../config/enum";

export function handleMint(ev: Transfer): void {
  if (ev.params.from.notEqual(ADDRESS_ZERO)) return;
  let receipt = ev.receipt;
  if (!receipt) return;
  let increasePositionLogs = receipt.logs.filter(function (l) {
    return l.topics[0].equals(
      crypto.keccak256(
        ByteArray.fromUTF8(
          "IncreasePosition(bytes32,address,address,address,uint256,uint256,uint8,uint256,uint256)"
        )
      )
    );
  });
  let decreasePositionLogs = receipt.logs.filter(function (l) {
    return l.topics[0].equals(
      crypto.keccak256(
        ByteArray.fromUTF8(
          "DecreasePosition(bytes32,address,address,address,uint256,uint256,uint8,uint256,(uint256,uint256),uint256)"
        )
      )
    );
  });
  let liquidatePositionLogs = receipt.logs.filter(function (l) {
    return l.topics[0].equals(
      crypto.keccak256(
        ByteArray.fromUTF8(
          "LiquidatePosition(bytes32,address,address,address,uint8,uint256,uint256,uint256,uint256,(uint256,uint256),uint256)"
        )
      )
    );
  });
  let swapLogs = receipt.logs.filter(function (l) {
    return l.topics[0].equals(
      crypto.keccak256(
        ByteArray.fromUTF8(
          "Swap(address,address,address,uint256,uint256,uint256)"
        )
      )
    );
  });
  let filterIncreasePositionLog: ethereum.Log | null = null;
  let filterDecreasePositionLog: ethereum.Log | null = null;
  let filterLiquidatePositionLog: ethereum.Log | null = null;
  let filterSwapLog: ethereum.Log | null = null;
  for (let i = 0; i < increasePositionLogs.length; i++) {
    let increasePositionLog = increasePositionLogs[i];
    if (increasePositionLog.logIndex.ge(ev.logIndex)) {
      break;
    }
    filterIncreasePositionLog = increasePositionLog;
  }
  for (let i = 0; i < decreasePositionLogs.length; i++) {
    let decreasePositionLog = decreasePositionLogs[i];
    if (decreasePositionLog.logIndex.ge(ev.logIndex)) {
      break;
    }
    filterDecreasePositionLog = decreasePositionLog;
  }
  for (let i = 0; i < liquidatePositionLogs.length; i++) {
    let liquidatePositionLog = liquidatePositionLogs[i];
    if (liquidatePositionLog.logIndex.ge(ev.logIndex)) {
      break;
    }
    filterLiquidatePositionLog = liquidatePositionLog;
  }
  for (let i = 0; i < swapLogs.length; i++) {
    let swapLog = swapLogs[i];
    if (swapLog.logIndex.ge(ev.logIndex)) {
      break;
    }
    filterSwapLog = swapLog;
  }
  if (filterIncreasePositionLog) {
    let params = ethereum
      .decode(
        "(address,address,address,uint256,uint256,uint8,uint256,uint256)",
        filterIncreasePositionLog.data
      )!
      .toTuple();
    let history = new LoyaltyHistory(
      `${ev.params.to.toHex()}-${ev.transaction.hash.toHex()}-${ev.transactionLogIndex}`
    );
    history.indexToken = params[2].toAddress();
    history.collateralToken = params[1].toAddress();
    history.side = params[5].toI32();
    history.sizeChange = params[4].toBigInt();
    history.collateralValue =
      params[5].toI32() == Side.LONG
        ? params[3].toBigInt().times(params[6].toBigInt())
        : params[3].toBigInt();
    history.timestamp = ev.block.timestamp;
    history.amount = ev.params.value;
    history.price = params[6].toBigInt();
    history.tx = ev.transaction.hash;
    history.owner = params[0].toAddress();
    history.status = "OPEN";
    history.isSwap = false;
    history.save();

    let currentBatch = loadOrCreateLoyaltyProtocol().currentBatch;
    let batch = loadOrCreateBatch(currentBatch);
    batch.totalBalance = batch.totalBalance.plus(ev.params.value);
    batch.save();

    let loyaltyUserBatch = loadOrCreateLoyaltyUserBatch(
      params[0].toAddress(),
      currentBatch
    );
    loyaltyUserBatch.amount = loyaltyUserBatch.amount.plus(ev.params.value);
    loyaltyUserBatch.lastRewardTime = ev.block.timestamp;
    loyaltyUserBatch.save();
    return;
  }
  if (filterDecreasePositionLog) {
    let params = ethereum
      .decode(
        "(address,address,address,uint256,uint256,uint8,uint256,(uint256,uint256),uint256)",
        filterDecreasePositionLog.data
      )!
      .toTuple();
    let history = new LoyaltyHistory(
      `${ev.params.to.toHex()}-${ev.transaction.hash.toHex()}-${ev.transactionLogIndex}`
    );
    history.indexToken = params[2].toAddress();
    history.collateralToken = params[1].toAddress();
    history.side = params[5].toI32();
    history.sizeChange = params[4].toBigInt();
    history.collateralValue = params[3].toBigInt();
    history.timestamp = ev.block.timestamp;
    history.amount = ev.params.value;
    history.price = params[6].toBigInt();
    history.tx = ev.transaction.hash;
    history.owner = params[0].toAddress();
    history.status = "CLOSED";
    history.isSwap = false;
    history.save();

    let currentBatch = loadOrCreateLoyaltyProtocol().currentBatch;
    let batch = loadOrCreateBatch(currentBatch);
    batch.totalBalance = batch.totalBalance.plus(ev.params.value);
    batch.save();

    let loyaltyUserBatch = loadOrCreateLoyaltyUserBatch(
      params[0].toAddress(),
      currentBatch
    );
    loyaltyUserBatch.amount = loyaltyUserBatch.amount.plus(ev.params.value);
    loyaltyUserBatch.lastRewardTime = ev.block.timestamp;
    loyaltyUserBatch.save();
    return;
  }
  if (filterLiquidatePositionLog) {
    let params = ethereum
      .decode(
        "(address,address,address,uint8,uint256,uint256,uint256,uint256,(uint256,uint256),uint256)",
        filterLiquidatePositionLog.data
      )!
      .toTuple();
    let history = new LoyaltyHistory(
      `${ev.params.to.toHex()}-${ev.transaction.hash.toHex()}-${ev.transactionLogIndex}`
    );
    history.indexToken = params[2].toAddress();
    history.collateralToken = params[1].toAddress();
    history.side = params[3].toI32();
    history.sizeChange = params[4].toBigInt();
    history.timestamp = ev.block.timestamp;
    history.amount = ev.params.value;
    history.price = params[7].toBigInt();
    history.tx = ev.transaction.hash;
    history.owner = params[0].toAddress();
    history.status = "LIQUIDATED";
    history.isSwap = false;
    history.save();

    let currentBatch = loadOrCreateLoyaltyProtocol().currentBatch;
    let batch = loadOrCreateBatch(currentBatch);
    batch.totalBalance = batch.totalBalance.plus(ev.params.value);
    batch.save();

    let loyaltyUserBatch = loadOrCreateLoyaltyUserBatch(
      params[0].toAddress(),
      currentBatch
    );
    loyaltyUserBatch.amount = loyaltyUserBatch.amount.plus(ev.params.value);
    loyaltyUserBatch.lastRewardTime = ev.block.timestamp;
    loyaltyUserBatch.save();
    return;
  }

  if (filterSwapLog) {
    let params = ethereum
      .decode("(address,address,uint256,uint256,uint256)", filterSwapLog.data)!
      .toTuple();
    let history = new LoyaltyHistory(
      `${ev.params.to.toHex()}-${ev.transaction.hash.toHex()}-${ev.transactionLogIndex}`
    );
    history.tokenIn = params[0].toAddress();
    history.tokenOut = params[1].toAddress();
    history.amountIn = params[2].toBigInt();
    history.amountOut = params[3].toBigInt();
    history.timestamp = ev.block.timestamp;
    history.amount = ev.params.value;
    history.tx = ev.transaction.hash;
    history.owner = ev.transaction.from;
    history.isSwap = true;
    history.save();

    let currentBatch = loadOrCreateLoyaltyProtocol().currentBatch;
    let batch = loadOrCreateBatch(currentBatch);
    batch.totalBalance = batch.totalBalance.plus(ev.params.value);
    batch.save();

    let loyaltyUserBatch = loadOrCreateLoyaltyUserBatch(
      ev.transaction.from,
      currentBatch
    );
    loyaltyUserBatch.amount = loyaltyUserBatch.amount.plus(ev.params.value);
    loyaltyUserBatch.lastRewardTime = ev.block.timestamp;
    loyaltyUserBatch.save();
    return;
  }
}

export function handleClaimed(ev: Claimed): void {
  let entity = new LoyaltyRedeemHistory(
    `${ev.params.to.toHexString()}-${ev.block.timestamp}`
  );
  entity.amount = ev.params.amount;
  entity.owner = ev.params.to;
  entity.tx = ev.transaction.hash;
  entity.timestamp = ev.block.timestamp;
  entity.save();
}
export function handleBatchStarted(ev: BatchStarted): void {
  let loyaltyProtocol = loadOrCreateLoyaltyProtocol();
  loyaltyProtocol.currentBatch = ev.params.id;
  loyaltyProtocol.save();

  let batch = loadOrCreateBatch(ev.params.id);
  batch.startTime = ev.block.timestamp;
  batch.save();
}

export function handleRewardAllocated(ev: RewardAllocated): void {
  let batch = loadOrCreateBatch(ev.params.batchId);
  batch.allocatedTime = ev.block.timestamp;
  let loyaltyProtocol = loadOrCreateLoyaltyProtocol();
  batch.batchVestingDuration = loyaltyProtocol.batchVestingDuration;
  batch.rewardAmount = ev.params.amount;
  batch.rewardPerShare = batch.rewardAmount
    .times(BigInt.fromI32(1000000))
    .div(batch.totalBalance);
  batch.save();
}

export function loadOrCreateLoyaltyProtocol(): LoyaltyProtocol {
  let loyaltyProtocol = LoyaltyProtocol.load("1");
  if (loyaltyProtocol == null) {
    loyaltyProtocol = new LoyaltyProtocol("1");
    loyaltyProtocol.currentBatch = ZERO;
    loyaltyProtocol.batchVestingDuration = ZERO;
  }
  return loyaltyProtocol;
}
export function loadOrCreateBatch(batchId: BigInt): LoyaltyProgram {
  let batch = LoyaltyProgram.load(`${batchId}`);
  if (batch == null) {
    batch = new LoyaltyProgram(`${batchId}`);
    batch.startTime = ZERO;
    batch.rewardPerShare = ZERO;
    batch.totalBalance = ZERO;
    batch.allocatedTime = ZERO;
    batch.batchVestingDuration = ZERO;
    batch.rewardAmount = ZERO;
  }
  return batch;
}

export function loadOrCreateLoyaltyUserBatch(
  user: Address,
  batchId: BigInt
): LoyaltyUserBatch {
  let id = `${batchId}-${user.toHex()}`;
  let loyaltyUserBatch = LoyaltyUserBatch.load(id);
  if (loyaltyUserBatch == null) {
    loyaltyUserBatch = new LoyaltyUserBatch(id);
    loyaltyUserBatch.batch = `${batchId}`;
    loyaltyUserBatch.batchId = batchId;
    loyaltyUserBatch.user = user;
    loyaltyUserBatch.amount = ZERO;
    loyaltyUserBatch.lastRewardTime = ZERO;
  }
  return loyaltyUserBatch;
}

export function handleBatchVestingDurationSet(
  ev: BatchVestingDurationSet
): void {
  let loyaltyProtocol = loadOrCreateLoyaltyProtocol();
  loyaltyProtocol.batchVestingDuration = ev.params.duration;
  loyaltyProtocol.save();
}

export function handleRewardAdded(ev: RewardAdded): void {
  let currentBatch = loadOrCreateLoyaltyProtocol().currentBatch;
  let batch = loadOrCreateBatch(currentBatch);
  batch.rewardAmount = ev.params._rewardTokens;
  batch.save();
}
