import { BigInt } from "@graphprotocol/graph-ts";
import { INTERVAL_LOG } from "../../trading/mappings/config";
import { PricePosted } from "../generated/Oracle/Oracle";
import { TokenDataDaily } from "../generated/schema";
import { toDecimal, ValueDecimals } from "./helper";

function updateDailyData(ev: PricePosted, _interval: BigInt): void {
    let interval = BigInt.fromI32(3600).times(_interval);
    let day = ev.block.timestamp.div(interval).times(interval);
    let id = `${_interval.toString()} - ${day} - ${ev.params.token.toHex()}`;
    let entity = TokenDataDaily.load(id);
    if (!entity) {
        entity = new TokenDataDaily(id);
        entity.token = ev.params.token.toHex().toString();
        entity.timestamp = day;
        entity.type = _interval;
    }
    entity.price = toDecimal(ev.params.price, ValueDecimals - 18);
    entity.save();
}

export function handlePricePost(ev: PricePosted): void {
    updateDailyData(ev, INTERVAL_LOG.onehour);
    updateDailyData(ev, INTERVAL_LOG.fourhours);
    updateDailyData(ev, INTERVAL_LOG.oneday);
    updateDailyData(ev, INTERVAL_LOG.oneweek);
}