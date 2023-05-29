import { BigInt } from "@graphprotocol/graph-ts";
import { Record, Participant, BatchInfo, Contest } from "../generated/schema";
import {
  RecordAdded,
  BatchStarted,
  Finalized,
  LeaderUpdated,
  BatchEnded
} from "../generated/TradingContest/TradingContest";
import { ZERO } from "../../config/constant";

const CONTEST_ID = "1";

function loadOrCreateContest(): Contest {
  let entity = Contest.load(CONTEST_ID);
  if (entity == null) {
    entity = new Contest(CONTEST_ID);
    entity.totalRecord = ZERO;
  }
  return entity;
}

function loadOrCreateBatch(key: string): BatchInfo {
  let batchInfo = BatchInfo.load(key);
  if (batchInfo == null) {
    batchInfo = new BatchInfo(key);
    batchInfo.contest = CONTEST_ID;
    batchInfo.totalPoint = ZERO;
    batchInfo.totalValue = ZERO;
    batchInfo.batch = BigInt.fromString(key);
  }

  return batchInfo;
}

export function handleRecordAdded(event: RecordAdded): void {
  const contest = loadOrCreateContest();
  const recordId = contest.totalRecord.plus(BigInt.fromI32(1));
  contest.totalRecord = recordId;

  const participantKey = `b_${
    event.params._batchId
  }_w_${event.params._user.toHexString()}`;
  const batchKey = `${event.params._batchId}`;

  const record = new Record(recordId.toString());
  record.trader = event.params._user.toHexString();
  record.batch = event.params._batchId;
  record.value = event.params._value;
  record.lvlStaking = event.params._daoStaking.plus(
    event.params._lvlStaking
  );
  record.lvlStake = event.params._lvlStaking;
  record.daoStake = event.params._daoStaking;
  record.point = event.params._point;
  record.blockNumber = event.block.number;
  record.createdAt = event.block.timestamp;
  record.participant = participantKey;
  record.txHash = event.transaction.hash;

  let participant = Participant.load(participantKey);
  if (participant == null) {
    participant = new Participant(participantKey);
    participant.batch = batchKey;
    participant.trader = event.params._user;
    participant.totalPoint = event.params._point;
    participant.totalValue = event.params._value;
    participant.lastTradePoint = event.params._point;
    participant.lastTradeTimestamp = event.block.timestamp;
  } else {
    participant.totalPoint = participant.totalPoint.plus(event.params._point);
    participant.totalValue = participant.totalValue.plus(event.params._value);
    participant.lastTradePoint = event.params._point;
    participant.lastTradeTimestamp = event.block.timestamp;
  }

  const batchInfo = loadOrCreateBatch(batchKey);
  batchInfo.totalPoint = batchInfo.totalPoint.plus(event.params._point);
  batchInfo.totalValue = batchInfo.totalValue.plus(event.params._value);

  record.save();
  participant.save();
  contest.save();
  batchInfo.save();
}

export function handleBatchStarted(event: BatchStarted): void {
  const batchKey = `${event.params._currentBatch}`;
  const batchInfo = loadOrCreateBatch(batchKey);
  batchInfo.blockNumber = event.block.number;
  batchInfo.createdAt = event.block.timestamp;
  batchInfo.batch = event.params._currentBatch;
  batchInfo.finalized = false;
  batchInfo.isClosed = false;
  batchInfo.leaderUpdated = false;
  batchInfo.save();
}

export function handleBatchFinalized(event: Finalized): void {
  const batchKey = `${event.params._batchId}`;

  let batchInfo = BatchInfo.load(batchKey);
  if (batchInfo != null) {
    batchInfo.finalized = true;
    batchInfo.save();
  }
}

export function handleBatchEnded(event: BatchEnded): void {
  const batchKey = `${event.params._batchId}`;

  let batchInfo = BatchInfo.load(batchKey);
  if (batchInfo != null) {
    batchInfo.isClosed = true;
    batchInfo.save();
  }
}

export function handleLeaderUpdated(event: LeaderUpdated): void {
  const batchKey = `${event.params._batchId}`;

  let batchInfo = BatchInfo.load(batchKey);
  if (batchInfo != null) {
    batchInfo.leaderUpdated = true;
    batchInfo.save();
  }
}
