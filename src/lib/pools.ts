export const POOLS = [
  {
    id: "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640",
    label: "ETH / USDC",
    fee: "0.05%",
    feeTier: "500",
    symbols: ["USDC", "WETH"],
  },
  {
    id: "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8",
    label: "ETH / USDC",
    fee: "0.30%",
    feeTier: "3000",
    symbols: ["USDC", "WETH"],
  },
  {
    id: "0x3416cf6c708da44db2624d63ea0aaef7113527c6",
    label: "USDC / USDT",
    fee: "0.01%",
    feeTier: "100",
    symbols: ["USDC", "USDT"],
  },
  {
    id: "0xcbcdf9626bc03e24f779434178a73a0b4bad62ed",
    label: "WBTC / ETH",
    fee: "0.30%",
    feeTier: "3000",
    symbols: ["WBTC", "WETH"],
  },
] as const;

export function getPool(id: string) {
  return POOLS.find((pool) => pool.id === id.toLowerCase());
}
export type PoolConfig = (typeof POOLS)[number];
