# Level Subgraph

## Packages

- `analytics`: Tracking protocol volumes, fees, tranches statistics, staking.
- `auction`: Tracking history of auction commitments, token commitments.
- `contest`: Tracking batch history, participants, trading records of contest.
- `lite`: Minimal subgraph tracking user orders and positions.
- `referral`: Tracking referral registration, epoch history, trading fee records each epoch.
- `trading`: Tracking user trading histories, order, positions and loyalty histories.

## Install

```bash
$ pnpm install
```

## Code Generation
```bash
$ pnpm -F [package-name] run codegen
```

## Build
```bash
$ pnpm -F [package-name] run build
```