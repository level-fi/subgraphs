import { BigInt } from "@graphprotocol/graph-ts";

class Log {
    onehour: BigInt;
    fourhours: BigInt;
    oneday: BigInt;
    oneweek: BigInt;
}

export const INTERVAL_LOG: Log = {
    onehour: BigInt.fromI32(1),
    fourhours: BigInt.fromI32(4),
    oneday: BigInt.fromI32(24),
    oneweek: BigInt.fromI32(24 * 7),
}
