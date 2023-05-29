import { Auction } from "../generated/schema";
import { BigInt, ByteArray, crypto } from "@graphprotocol/graph-ts";
import { Auction as AuctionTemplate } from "../generated/templates";
import { AuctionCreated } from "../generated/LVLBatchAuctionFactory/BatchAuctionFactory";

export function handleBatchAuctionCreated(ev: AuctionCreated): void {
  const auction = new Auction(ev.params._newAuction.toHex());
  auction.auctionAdmin = ev.params._auctionAdmin;
  auction.auctionToken = ev.params._auctionToken;
  auction.payToken = ev.params._payToken;
  auction.auctionTreasury = ev.params._auctionTreasury;
  auction.totalTokens = ev.params._totalTokens;
  auction.startPrice = ev.params._maxPrice;
  auction.startTime = ev.params._endTime.toI32();
  auction.endTime = ev.params._endTime.toI32();
  auction.minPrice = ev.params._minPrice;
  auction.commitmentsTotal = BigInt.fromI32(0);
  auction.finalized = false;
  auction.cancelled = false;
  auction.participantCount = 0;
  auction.save();

  AuctionTemplate.create(ev.params._newAuction);
}
