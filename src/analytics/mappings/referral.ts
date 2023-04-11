import { ReferrerSet } from "../generated/ReferralController/ReferralController";
import { _storeUserAction } from "./pool";

export function handleReferrerSet(ev: ReferrerSet): void {
  _storeUserAction(ev.block.timestamp, "referral", ev.params.trader);
  _storeUserAction(ev.block.timestamp, "referral", ev.params.referrer);
}
