import { Auction } from "../generated/schema";
import { BigInt, ByteArray, crypto } from "@graphprotocol/graph-ts";
import { Auction as AuctionTemplate } from "../generated/templates";
import { AuctionCreated } from "../generated/LVLAuctionFactory/AuctionFactory";

export function handleAuctionCreated(ev: AuctionCreated): void {
  const receipt = ev.receipt;
  if (!receipt) {
    return;
  }
  const auctionDeployedLog = receipt.logs
    .filter(function (l) {
      return l.topics[0].equals(
        crypto.keccak256(
          ByteArray.fromUTF8(
            "AuctionDeployed(address,address,uint256,uint256,uint256,uint256,uint256,address,address)"
          )
        )
      );
    })
    .at(0);
  if (!auctionDeployedLog) {
    return;
  }
  const auction = new Auction(auctionDeployedLog.address.toHex());
  auction.auctionAdmin = ev.params.auctionAdmin;
  auction.auctionToken = ev.params._auctionToken;
  auction.payToken = ev.params._payToken;
  auction.auctionTreasury = ev.params.auctionTreasury;
  auction.totalTokens = ev.params._totalTokens;
  auction.startPrice = ev.params._startPrice;
  auction.startTime = ev.params._endTime.toI32();
  auction.endTime = ev.params._endTime.toI32();
  auction.minPrice = ev.params._minPrice;
  auction.commitmentsTotal = BigInt.fromI32(0);
  auction.finalized = false;
  auction.cancelled = false;
  auction.participantCount = 0;
  auction.save();

  AuctionTemplate.create(auctionDeployedLog.address);
}
