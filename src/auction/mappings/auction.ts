import { BigInt } from "@graphprotocol/graph-ts";
import {
  Auction,
  AuctionCommitment,
  AuctionCommitmentHistory,
} from "../generated/schema";
import {
  AddedCommitment,
  AuctionCancelled,
  AuctionFinalized,
} from "../generated/templates/Auction/Auction";

export function handleAddedCommitment(ev: AddedCommitment): void {
  const auction = Auction.load(ev.address.toHex());
  if (!auction) {
    return;
  }
  //save participant
  let participant = AuctionCommitment.load(`${ev.address.toHex()}-${ev.params._addr.toHex()}`);
  if (!participant) {
    participant = new AuctionCommitment(`${ev.address.toHex()}-${ev.params._addr.toHex()}`);
    participant.auction = ev.address.toHex();
    participant.user = ev.params._addr;
    participant.totalCommitted = BigInt.fromI32(0);
    auction.participantCount = auction.participantCount + 1;
  }
  participant.totalCommitted = participant.totalCommitted.plus(
    ev.params._commitment
  );
  participant.save();

  // save history
  const history = new AuctionCommitmentHistory(
    `${ev.address.toHex()}-${ev.params._addr.toHex()}-${ev.transaction.hash.toHex()}`
  );
  history.auction = ev.address.toHex();
  history.committed = ev.params._commitment;
  history.user = ev.params._addr;
  history.timestamp = ev.block.timestamp.toI32();
  history.tx = ev.transaction.hash;
  history.save();

  // save auction
  auction.commitmentsTotal = auction.commitmentsTotal.plus(
    ev.params._commitment
  );
  auction.save();
}

export function handleAuctionFinalized(ev: AuctionFinalized): void {
  const auction = Auction.load(ev.address.toHex());
  if (!auction) {
    return;
  }
  auction.finalized = true;
  auction.save();
}

export function handleAuctionCancelled(ev: AuctionCancelled): void {
  const auction = Auction.load(ev.address.toHex());
  if (!auction) {
    return;
  }
  auction.cancelled = true;
  auction.save();
}
