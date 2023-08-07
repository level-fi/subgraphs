import { OracleChanged } from "../generated/OrderManager/OrderManager";
import { Oracle as OracleTemplate } from "../generated/templates";
import { loadOrCreateProtocol } from "../utils/helper";

export function handleOracleChanged(ev: OracleChanged): void {
  const protocol = loadOrCreateProtocol();
  protocol.oracle = ev.params.param0;
  protocol.save();

  OracleTemplate.create(ev.params.param0);
}
