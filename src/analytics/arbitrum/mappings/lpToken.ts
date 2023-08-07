import { ADDRESS_ZERO } from "../../../config/constant";
import { Transfer } from "../generated/SLPToken/LpToken";
import { loadOrCreateTranche } from "../utils/helper";

export function handleTransfer(ev: Transfer): void {
  // store tranche
  const totalEntity = loadOrCreateTranche(ev.address);
  if (ev.params.from.equals(ADDRESS_ZERO)) {
    totalEntity.llpSupply = totalEntity.llpSupply.plus(ev.params.value);
  } else if (ev.params.to.equals(ADDRESS_ZERO)) {
    totalEntity.llpSupply = totalEntity.llpSupply.minus(ev.params.value);
  }
  totalEntity.save();
}