import { config } from "../../config";
import { ADDRESS_ZERO, ZERO } from "../../config/constant";
import { _storeUserLiquidity } from "./pool";
import {
  loadOrCreateTranche,
} from "../utils/helper";
import { Transfer } from "../generated/SLPToken/LpToken";

export function handleTransfer(ev: Transfer): void {
  // store tranche
  const totalEntity = loadOrCreateTranche(ev.address);
  if (ev.params.from.equals(ADDRESS_ZERO)) {
    totalEntity.llpSupply = totalEntity.llpSupply.plus(ev.params.value);
  } else if (ev.params.to.equals(ADDRESS_ZERO)) {
    totalEntity.llpSupply = totalEntity.llpSupply.minus(ev.params.value);
  }
  totalEntity.save();

  if (
    config.excludeTrackLp.includes(ev.params.from) ||
    config.excludeTrackLp.includes(ev.params.to)
  ) {
    return;
  }

  _storeUserLiquidity(
    ev.params.from,
    ev.block.timestamp,
    ev.address,
    "TRANSFER_OUT",
    ev.params.value,
    ZERO,
    ev.transaction.hash
  );

  _storeUserLiquidity(
    ev.params.to,
    ev.block.timestamp,
    ev.address,
    "TRANSFER_IN",
    ev.params.value,
    ZERO,
    ev.transaction.hash
  );
}
