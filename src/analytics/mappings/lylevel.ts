import { ByteArray, crypto, ethereum } from "@graphprotocol/graph-ts";
import { ADDRESS_ZERO } from "../../config/constant";
import { Claimed, Transfer } from "../generated/LyLevel/LyLevel";
import { LoyaltyHistory, LoyaltyRedeemHistory } from "../generated/schema";

export function handleMint(ev: Transfer): void {
  if (ev.params.from.notEqual(ADDRESS_ZERO)) return;
  let receipt = ev.receipt;
  if (!receipt) return;
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
  let filterDecreasePositionLog: ethereum.Log | null = null;
  let filterLiquidatePositionLog: ethereum.Log | null = null;
  let filterSwapLog: ethereum.Log | null = null;
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
  if (filterDecreasePositionLog) {
    let params = ethereum
      .decode(
        "(address,address,address,uint256,uint256,uint8,uint256,(uint256,uint256),uint256)",
        filterDecreasePositionLog.data
      )!
      .toTuple();
    let history = new LoyaltyHistory(
      `${ev.params.to.toHex()}-${ev.transaction.hash.toHex()}`
    );
    history.indexToken = params[2].toAddress();
    history.collateralToken = params[1].toAddress();
    history.side = params[5].toI32();
    history.sizeChange = params[4].toBigInt();
    history.timestamp = ev.block.timestamp;
    history.amount = ev.params.value;
    history.price = params[6].toBigInt();
    history.tx = ev.transaction.hash;
    history.owner = params[0].toAddress();
    history.status = "CLOSED";
    history.isSwap = false;
    history.save();
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
      `${ev.params.to.toHex()}-${ev.transaction.hash.toHex()}`
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
    return;
  }

  if (filterSwapLog) {
    let params = ethereum
      .decode("(address,address,uint256,uint256,uint256)", filterSwapLog.data)!
      .toTuple();
    let history = new LoyaltyHistory(
      `${ev.params.to.toHex()}-${ev.transaction.hash.toHex()}`
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
