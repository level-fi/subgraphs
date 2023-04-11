import { Transfer } from "../generated/Level/ERC20";
import { config } from "../../config";
import { ADDRESS_ZERO, TOKEN_DECIMALS } from "../../config/constant";
import {
  getDayId,
  loadOrCreateLevelDistribution,
  loadOrCreateProtocol,
  loadOrCreateProtocolStat,
  toDecimal,
} from "../utils/helper";
import { ByteArray, crypto } from "@graphprotocol/graph-ts";

export function handleTransfer(ev: Transfer): void {
  const excludeTrackLVL = config.rewardTokenFunds.concat([
    config.tokens.lvl_wbnb_pair,
    config.staking,
    ADDRESS_ZERO,
  ]);
  let levelDistribution = loadOrCreateLevelDistribution();
  if (
    !excludeTrackLVL.includes(ev.params.from) &&
    excludeTrackLVL.includes(ev.params.to)
  ) {
    levelDistribution.walletAmount = levelDistribution.walletAmount.minus(
      toDecimal(ev.params.value, TOKEN_DECIMALS)
    );
  } else if (
    excludeTrackLVL.includes(ev.params.from) &&
    !excludeTrackLVL.includes(ev.params.to)
  ) {
    levelDistribution.walletAmount = levelDistribution.walletAmount.plus(
      toDecimal(ev.params.value, TOKEN_DECIMALS)
    );
  }
  if (
    ev.params.to.equals(config.tokens.lvl_wbnb_pair) &&
    ev.params.from.notEqual(config.tokens.lvl_wbnb_pair)
  ) {
    levelDistribution.poolAmount = levelDistribution.poolAmount.plus(
      toDecimal(ev.params.value, TOKEN_DECIMALS)
    );
  } else if (
    ev.params.to.notEqual(config.tokens.lvl_wbnb_pair) &&
    ev.params.from.equals(config.tokens.lvl_wbnb_pair)
  ) {
    levelDistribution.poolAmount = levelDistribution.poolAmount.minus(
      toDecimal(ev.params.value, TOKEN_DECIMALS)
    );
  }
  levelDistribution.save();

  //save protocol
  // store total
  const protocol = loadOrCreateProtocol();
  if (
    ev.params.from.equals(ADDRESS_ZERO) ||
    config.rewardTokenFunds.includes(ev.params.from)
  ) {
    protocol.lvlCirculatingSupply = protocol.lvlCirculatingSupply.plus(
      ev.params.value
    );
  }
  if (
    ev.params.to.equals(ADDRESS_ZERO) ||
    config.rewardTokenFunds.includes(ev.params.to)
  ) {
    protocol.lvlCirculatingSupply = protocol.lvlCirculatingSupply.minus(
      ev.params.value
    );
  }
  // store daily
  const dayId = `day-${getDayId(ev.block.timestamp)}`;
  let entity = loadOrCreateProtocolStat(
    dayId,
    "daily",
    getDayId(ev.block.timestamp)
  );
  entity.lvlCirculatingSupply = toDecimal(
    protocol.lvlCirculatingSupply,
    TOKEN_DECIMALS
  );

  entity.save();
  protocol.save();

  // exclude auction transfer LVL
  const receipt = ev.receipt;
  if (!receipt) {
    return;
  }
  const auctionDeployedLogs = receipt.logs.filter(function (l) {
    return (
      l.topics.length &&
      l.topics[0].equals(
        crypto.keccak256(
          ByteArray.fromUTF8(
            "AuctionDeployed(address,address,uint256,uint256,uint256,uint256,uint256,address,address)"
          )
        )
      )
    );
  });
  if (!auctionDeployedLogs.length) {
    return;
  }
  if (ev.params.to.equals(auctionDeployedLogs.at(0).address)) {
    protocol.lvlCirculatingSupply = protocol.lvlCirculatingSupply.minus(
      ev.params.value
    );
    entity.lvlCirculatingSupply = toDecimal(
      protocol.lvlCirculatingSupply,
      TOKEN_DECIMALS
    );
    entity.save();
    protocol.save();
  }
}
