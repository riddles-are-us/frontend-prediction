// Market and AMM types for the prediction market
export interface MarketData {
  titleString: string;
  description?: string;
  /** LMSR outstanding shares */
  totalYesShares: string;
  totalNoShares: string;
  /** Running pool/token balance managed by the contract (bankroll/backing) */
  poolBalance: string;
  /** LMSR liquidity parameter */
  b: string;
  /** Cumulative volume */
  totalVolume?: string;
  resolved: boolean;
  outcome: boolean | null;
  totalFeesCollected?: string;
  /** Optional prices (0..1) if backend provides them; otherwise computed client-side */
  yesPrice?: number;
  noPrice?: number;
  // Time-related fields
  counter?: number;
  start_time?: number;
  end_time?: number;
  resolution_time?: number;
  time_remaining?: string;
  remaining_time?: number;
  market_status?: string;
  market_status_text?: string;
}

export interface PlayerData {
  player_id: [number, number];
  data: {
    balance: string;
    yes_shares: string;
    no_shares: string;
    claimed: boolean;
    nonce: string;
  };
}

export interface PlayerState {
  player: PlayerData;
  state: {
    market: MarketData;
  };
}

export interface MarketPrices {
  yesPrice: number;
  noPrice: number;
}

export interface MarketImpact {
  priceImpact: number;
  newPrice: number;
  slippage: number;
}

export interface TradingPosition {
  type: 'YES' | 'NO';
  shares: number;
  value: number;
  currentPrice: number;
  pnl: number;
}

export interface Transaction {
  id: string;
  type: 'BUY' | 'SELL' | 'CLAIM' | 'DEPOSIT' | 'WITHDRAW';
  amount: number;
  shares?: number;
  price: number;
  timestamp: Date;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
}

export interface MarketStats {
  totalVolume: number;
  totalUsers: number;
  yesPercentage: number;
  noPercentage: number;
  liquidity: number;
  fees: number;
}

export enum BetType {
  NO = 0,
  YES = 1
}

export enum CommandType {
  TICK = 0,
  INSTALL_PLAYER = 1,
  WITHDRAW = 2,
  DEPOSIT = 3,
  BET = 4,
  SELL = 5,
  RESOLVE = 6,
  CLAIM = 7,
  WITHDRAW_FEES = 8
}

// Historical data types
export interface MarketHistoryEntry {
  counter: string;
  __v: number;
  /** For history we keep legacy keys, but they represent LMSR shares now */
  yesLiquidity: string; // = totalYesShares at that counter
  noLiquidity: string;  // = totalNoShares  at that counter
  b?: string;
  yesPrice?: number;
  noPrice?: number;
}

export interface MarketHistoryResponse {
  success: boolean;
  data: MarketHistoryEntry[];
}

export interface UserTransactionEntry {
  index: string;
  pid: [string, string];
  betType: number;
  amount: string;
  shares: string;
  counter: string;
  __v: number;
}

export interface UserHistoryResponse {
  success: boolean;
  data: UserTransactionEntry[];
  count: number;
}

// Chart data types for visualization
export interface ChartDataPoint {
  counter: number;
  yesPrice: number;
  noPrice: number;
  /** For charts, keep the legacy names but store LMSR shares in them */
  yesLiquidity: number; // shares
  noLiquidity: number;  // shares
  timestamp?: string;
}

export interface TransactionData {
  index: string;
  pid: string[];
  betType: number;
  amount: string;
  shares: string;
  counter: string;
  transactionType: 'BET_YES' | 'BET_NO' | 'SELL_YES' | 'SELL_NO';
  originalBetType: number;
}
