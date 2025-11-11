import { MarketImpact, MarketPrices } from '../types/market';

export class MarketCalculations {
  /** basis points precision (1% = 100 bp) */
  static readonly BP_DENOM = 10_000;
  /** default platform fee in bp (match backend default if used here) */
  static readonly FEE_BP = 100; // 1%

  // ---------- LMSR core ----------
  private static toNum(x: bigint): number {
    // UI-only numeric math — safe for moderate magnitudes
    return Number(x);
  }

  /** LMSR prices from outstanding shares and b */
  static calculatePrices(qYes: bigint, qNo: bigint, b: bigint): MarketPrices {
    const bN = this.toNum(b) || 1; // guard
    const qy = this.toNum(qYes) / bN;
    const qn = this.toNum(qNo) / bN;
    // softmax
    const maxq = Math.max(qy, qn);
    const ey = Math.exp(qy - maxq);
    const en = Math.exp(qn - maxq);
    const sum = ey + en;
    const yesPrice = ey / sum;
    const noPrice = en / sum;
    return { yesPrice, noPrice };
  }

  /** LMSR cost function C(q) = b * ln(exp(qY/b)+exp(qN/b)) */
  static cost(qYes: bigint, qNo: bigint, b: bigint): number {
    const bN = Math.max(this.toNum(b), 1e-12);
    const qy = this.toNum(qYes) / bN;
    const qn = this.toNum(qNo) / bN;
    const maxq = Math.max(qy, qn);
    const val = bN * (Math.log(Math.exp(qy - maxq) + Math.exp(qn - maxq)) + maxq);
    return val;
  }

  /** Buy YES/NO with `amountTokens` (net of fee). Solve for shares via Newton. */
  static calculateSharesForBet(
    betType: 0 | 1, // 0=NO, 1=YES
    amountTokens: number,
    qYes: bigint,
    qNo: bigint,
    b: bigint,
    feeBp: number = MarketCalculations.FEE_BP
  ): number {
    if (amountTokens <= 0) return 0;
    const net = amountTokens * (1 - feeBp / this.BP_DENOM);
    if (net <= 0) return 0;

    const target = this.cost(qYes, qNo, b) + net;
    const bN = this.toNum(b) || 1;

    // Choose which side s applies to
    const dirYes = betType === 1;

    // Newton on s (shares) where f(s)=C(q+s*e_i)-target=0
    let s = net; // init guess ~ linearized
    for (let i = 0; i < 30; i++) {
      const qYs = this.toNum(qYes) + (dirYes ? s : 0);
      const qNs = this.toNum(qNo) + (dirYes ? 0 : s);
      const C = this.cost(BigInt(Math.max(0, Math.floor(qYs))), BigInt(Math.max(0, Math.floor(qNs))), b);
      const f = C - target;
      if (Math.abs(f) < 1e-9) break;
      // derivative dC/ds = price of that outcome
      const { yesPrice, noPrice } = this.calculatePrices(BigInt(Math.max(0, Math.floor(qYs))), BigInt(Math.max(0, Math.floor(qNs))), b);
      const d = dirYes ? yesPrice : noPrice;
      if (d <= 0) break;
      s = s - f / d;
      if (s < 0) s = 0;
    }
    return Math.max(0, s);
  }

  /** Sell `shares` of YES/NO => payout = C(q) - C(q - s*e_i) (no root find) */
  static calculateAmountForShares(
    sellType: 0 | 1, // 0=NO, 1=YES
    shares: number,
    qYes: bigint,
    qNo: bigint,
    b: bigint,
    feeBp: number = MarketCalculations.FEE_BP
  ): number {
    if (shares <= 0) return 0;
    const C0 = this.cost(qYes, qNo, b);
    const qYs = this.toNum(qYes) - (sellType === 1 ? shares : 0);
    const qNs = this.toNum(qNo) - (sellType === 0 ? shares : 0);
    const C1 = this.cost(
      BigInt(Math.max(0, Math.floor(qYs))),
      BigInt(Math.max(0, Math.floor(qNs))),
      b
    );
    const gross = Math.max(0, C0 - C1);
    const fee = Math.ceil((gross * feeBp) / this.BP_DENOM);
    return Math.max(0, gross - fee);
  }

  // ---------- Convenience wrappers ----------
  static getBuyPrice(
    betType: 0 | 1,
    amountTokens: number,
    qYes: bigint,
    qNo: bigint,
    b: bigint,
    feeBp: number = MarketCalculations.FEE_BP
  ): number {
    const shares = this.calculateSharesForBet(betType, amountTokens, qYes, qNo, b, feeBp);
    return shares > 0 ? amountTokens / shares : 0;
  }

  static getSellPrice(
    sellType: 0 | 1,
    shares: number,
    qYes: bigint,
    qNo: bigint,
    b: bigint,
    feeBp: number = MarketCalculations.FEE_BP
  ): number {
    const amount = this.calculateAmountForShares(sellType, shares, qYes, qNo, b, feeBp);
    return shares > 0 ? amount / shares : 0;
  }

  static calculateMarketImpact(
    betType: 0 | 1,
    amountTokens: number,
    qYes: bigint,
    qNo: bigint,
    b: bigint,
    feeBp: number = MarketCalculations.FEE_BP
  ): MarketImpact {
    const { yesPrice, noPrice } = this.calculatePrices(qYes, qNo, b);
    const currentPrice = betType === 1 ? yesPrice : noPrice;
    const shares = this.calculateSharesForBet(betType, amountTokens, qYes, qNo, b, feeBp);
    const effectivePrice = shares > 0 ? amountTokens / shares : 0;
    const priceImpact = currentPrice > 0 ? Math.abs(effectivePrice - currentPrice) / currentPrice : 0;

    // simulate post-trade price
    const qYs = this.toNum(qYes) + (betType === 1 ? shares : 0);
    const qNs = this.toNum(qNo) + (betType === 0 ? shares : 0);
    const next = this.calculatePrices(
      BigInt(Math.max(0, Math.floor(qYs))),
      BigInt(Math.max(0, Math.floor(qNs))),
      b
    );
    const newPrice = betType === 1 ? next.yesPrice : next.noPrice;
    const slippage = currentPrice > 0 ? Math.abs(newPrice - currentPrice) / currentPrice : 0;
    return { priceImpact, newPrice, slippage };
  }

  static calculateSlippage(
    betType: 0 | 1,
    amountTokens: number,
    qYes: bigint,
    qNo: bigint,
    b: bigint,
    feeBp: number = MarketCalculations.FEE_BP
  ): number {
    return this.calculateMarketImpact(betType, amountTokens, qYes, qNo, b, feeBp).slippage;
  }

  static calculateFees(amountTokens: number, feeBp: number = MarketCalculations.FEE_BP): number {
    return Math.ceil((amountTokens * feeBp) / this.BP_DENOM);
  }

  // ---------- Formatting helpers ----------
  static formatPrice(price: number): string {
    return `${(price * 100).toFixed(1)}%`;
  }
  static formatNumber(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toFixed(0);
  }
  static getTotalLiquidity(qYes: bigint, qNo: bigint): number {
    // Here "liquidity" is just total outstanding shares displayed in UI
    return Number(qYes + qNo);
  }
  static priceToImpliedProbability(price: number): number {
    return price * 100;
  }
}

export enum MarketStatus {
  WAIT_START = 'WAIT_START',
  ACTIVE_TRADING = 'ACTIVE_TRADING', 
  WAIT_RESOLUTION = 'WAIT_RESOLUTION',
  PENDING_RESOLUTION = 'PENDING_RESOLUTION',
  RESOLVED = 'RESOLVED'
}

export interface MarketStatusInfo {
  status: MarketStatus;
  statusText: string;
  timeRemaining: number; // seconds
  timeRemainingText: string;
}

/**
 * Determine market status based on current counter and market timing
 */
export function getMarketStatus(
  currentCounter: number,
  startTime: number,
  endTime: number,
  resolutionTime: number,
  resolved: boolean,
  counterInterval: number = 5 // 5 seconds per counter
): MarketStatusInfo {
  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return "0s";
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // If market is already resolved
  if (resolved) {
    return {
      status: MarketStatus.RESOLVED,
      statusText: "Resolved",
      timeRemaining: 0,
      timeRemainingText: "Market Resolved"
    };
  }

  // Before start time - waiting to start
  if (currentCounter < startTime) {
    const remainingCounters = startTime - currentCounter;
    const remainingSeconds = remainingCounters * counterInterval;
    return {
      status: MarketStatus.WAIT_START,
      statusText: "Wait Start",
      timeRemaining: remainingSeconds,
      timeRemainingText: formatTimeRemaining(remainingSeconds)
    };
  }

  // Between start and end time - active trading
  if (currentCounter >= startTime && currentCounter < endTime) {
    const remainingCounters = endTime - currentCounter;
    const remainingSeconds = remainingCounters * counterInterval;
    return {
      status: MarketStatus.ACTIVE_TRADING,
      statusText: "Active Trading",
      timeRemaining: remainingSeconds,
      timeRemainingText: formatTimeRemaining(remainingSeconds)
    };
  }

  // Between end time and resolution time - waiting for resolution
  if (currentCounter >= endTime && currentCounter < resolutionTime) {
    const remainingCounters = resolutionTime - currentCounter;
    const remainingSeconds = remainingCounters * counterInterval;
    return {
      status: MarketStatus.WAIT_RESOLUTION,
      statusText: "Wait Resolution",
      timeRemaining: remainingSeconds,
      timeRemainingText: formatTimeRemaining(remainingSeconds)
    };
  }

  // After resolution time but not yet resolved - pending resolution
  return {
    status: MarketStatus.PENDING_RESOLUTION,
    statusText: "Pending Resolution",
    timeRemaining: 0,
    timeRemainingText: "Awaiting Resolution"
  };
}
