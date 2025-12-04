// LMSR calculation utilities for the prediction market
import { MarketImpact, MarketPrices } from '../types/market';

export class MarketCalculations {
  // Constants from the Rust backend
  static readonly PRECISION = 1000000; // Fixed point precision (1e6)
  static readonly FEE_RATE = 100; // 1% = 100 basis points
  static readonly FEE_BASIS_POINTS = 10000; // Fee denominator
  static readonly DEFAULT_B = 1000000n; // Default LMSR liquidity parameter

  // LMSR Cost Function: C(q_yes, q_no, b) = b * ln(exp(q_yes/b) + exp(q_no/b))
  private static lmsrCost(qYes: number, qNo: number, b: number): number {
    const expYes = Math.exp(qYes / b);
    const expNo = Math.exp(qNo / b);
    const sum = expYes + expNo;
    return b * Math.log(sum);
  }

  // LMSR YES price: exp(q_yes/b) / (exp(q_yes/b) + exp(q_no/b))
  private static lmsrPriceYes(qYes: number, qNo: number, b: number): number {
    const expYes = Math.exp(qYes / b);
    const expNo = Math.exp(qNo / b);
    return expYes / (expYes + expNo);
  }

  // LMSR NO price: exp(q_no/b) / (exp(q_yes/b) + exp(q_no/b))
  private static lmsrPriceNo(qYes: number, qNo: number, b: number): number {
    return 1 - this.lmsrPriceYes(qYes, qNo, b);
  }

  // Cost to buy delta_yes YES shares
  private static lmsrBuyYesQuote(qYes: number, qNo: number, b: number, deltaYes: number): number {
    const costBefore = this.lmsrCost(qYes, qNo, b);
    const costAfter = this.lmsrCost(qYes + deltaYes, qNo, b);
    return costAfter - costBefore;
  }

  // Cost to buy delta_no NO shares
  private static lmsrBuyNoQuote(qYes: number, qNo: number, b: number, deltaNo: number): number {
    const costBefore = this.lmsrCost(qYes, qNo, b);
    const costAfter = this.lmsrCost(qYes, qNo + deltaNo, b);
    return costAfter - costBefore;
  }

  // Payout for selling s_yes YES shares
  private static lmsrSellYesQuote(qYes: number, qNo: number, b: number, sYes: number): number {
    if (sYes > qYes) return 0;
    const costBefore = this.lmsrCost(qYes, qNo, b);
    const costAfter = this.lmsrCost(qYes - sYes, qNo, b);
    return costBefore - costAfter;
  }

  // Payout for selling s_no NO shares
  private static lmsrSellNoQuote(qYes: number, qNo: number, b: number, sNo: number): number {
    if (sNo > qNo) return 0;
    const costBefore = this.lmsrCost(qYes, qNo, b);
    const costAfter = this.lmsrCost(qYes, qNo - sNo, b);
    return costBefore - costAfter;
  }

  // Calculate current market prices based on LMSR
  static calculatePrices(yesLiquidity: bigint, noLiquidity: bigint, b: bigint = this.DEFAULT_B): MarketPrices {
    const qYes = Number(yesLiquidity);
    const qNo = Number(noLiquidity);
    const bNum = Number(b);
    
    if (qYes === 0 && qNo === 0) {
      return { yesPrice: 0.5, noPrice: 0.5 };
    }
    
    // LMSR price calculation
    const yesPrice = this.lmsrPriceYes(qYes, qNo, bNum);
    const noPrice = this.lmsrPriceNo(qYes, qNo, bNum);
    
    return { yesPrice, noPrice };
  }

  // Calculate shares received for a given bet amount (LMSR with binary search)
  static calculateSharesForBet(
    betType: 0 | 1, // 0 = NO, 1 = YES
    amount: number,
    yesLiquidity: bigint,
    noLiquidity: bigint,
    b: bigint = this.DEFAULT_B
  ): number {
    const betAmount = BigInt(Math.floor(amount));
    const fee = (betAmount * BigInt(this.FEE_RATE) + BigInt(this.FEE_BASIS_POINTS) - 1n) / BigInt(this.FEE_BASIS_POINTS);
    const netAmount = betAmount - fee;
    
    const qYes = Number(yesLiquidity);
    const qNo = Number(noLiquidity);
    const bNum = Number(b);
    const netAmountNum = Number(netAmount);
    
    // Binary search for shares
    let lo = 0;
    let hi = Number(yesLiquidity) + Number(noLiquidity); // Upper bound
    
    while (lo < hi) {
      const mid = Math.floor((lo + hi + 1) / 2);
      let quote: number;
      
      if (betType === 1) { // YES bet
        quote = this.lmsrBuyYesQuote(qYes, qNo, bNum, mid);
      } else { // NO bet
        quote = this.lmsrBuyNoQuote(qYes, qNo, bNum, mid);
      }
      
      if (quote <= netAmountNum) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    
    return lo;
  }

  // Calculate amount received for selling shares (LMSR)
  static calculateAmountForShares(
    sellType: 0 | 1, // 0 = NO, 1 = YES
    shares: number,
    yesLiquidity: bigint,
    noLiquidity: bigint,
    b: bigint = this.DEFAULT_B
  ): number {
    const sharesToSell = Number(shares);
    const qYes = Number(yesLiquidity);
    const qNo = Number(noLiquidity);
    const bNum = Number(b);
    
    // LMSR calculation for selling
    let grossAmountNum: number;
    if (sellType === 1) { // Selling YES shares
      grossAmountNum = this.lmsrSellYesQuote(qYes, qNo, bNum, sharesToSell);
    } else { // Selling NO shares
      grossAmountNum = this.lmsrSellNoQuote(qYes, qNo, bNum, sharesToSell);
    }
    
    // Convert to number (scale by 1e6 to match fixed point precision)
    return grossAmountNum;
  }

  // Calculate effective buy price for a given amount
  static getBuyPrice(
    betType: 0 | 1,
    amount: number,
    yesLiquidity: bigint,
    noLiquidity: bigint,
    b: bigint = this.DEFAULT_B
  ): number {
    const shares = this.calculateSharesForBet(betType, amount, yesLiquidity, noLiquidity, b);
    return shares > 0 ? amount / shares : 0;
  }

  // Calculate effective sell price for given shares
  static getSellPrice(
    sellType: 0 | 1,
    shares: number,
    yesLiquidity: bigint,
    noLiquidity: bigint,
    b: bigint = this.DEFAULT_B
  ): number {
    const amount = this.calculateAmountForShares(sellType, shares, yesLiquidity, noLiquidity, b);
    return shares > 0 ? amount / shares : 0;
  }

  // Calculate market impact of a trade (LMSR)
  static calculateMarketImpact(
    betType: 0 | 1,
    amount: number,
    yesLiquidity: bigint,
    noLiquidity: bigint,
    b: bigint = this.DEFAULT_B
  ): MarketImpact {
    const currentPrices = this.calculatePrices(yesLiquidity, noLiquidity, b);
    const currentPrice = betType === 1 ? currentPrices.yesPrice : currentPrices.noPrice;
    
    // Calculate shares that would be received
    const shares = this.calculateSharesForBet(betType, amount, yesLiquidity, noLiquidity, b);
    const effectivePrice = shares > 0 ? amount / shares : 0;
    
    const priceImpact = currentPrice > 0 ? Math.abs(effectivePrice - currentPrice) / currentPrice : 0;
    
    // Calculate new liquidity after bet
    const sharesNum = Number(shares);
    let newYesLiquidity: bigint, newNoLiquidity: bigint;
    if (betType === 1) { // YES bet
      newYesLiquidity = yesLiquidity + BigInt(sharesNum);
      newNoLiquidity = noLiquidity;
    } else { // NO bet
      newYesLiquidity = yesLiquidity;
      newNoLiquidity = noLiquidity + BigInt(sharesNum);
    }
    
    const newPrices = this.calculatePrices(newYesLiquidity, newNoLiquidity, b);
    const newPrice = betType === 1 ? newPrices.yesPrice : newPrices.noPrice;
    
    const slippage = currentPrice > 0 ? Math.abs(newPrice - currentPrice) / currentPrice : 0;
    
    return {
      priceImpact,
      newPrice,
      slippage
    };
  }

  // Calculate slippage for a trade
  static calculateSlippage(
    betType: 0 | 1,
    amount: number,
    yesLiquidity: bigint,
    noLiquidity: bigint,
    b: bigint = this.DEFAULT_B
  ): number {
    const impact = this.calculateMarketImpact(betType, amount, yesLiquidity, noLiquidity, b);
    return impact.slippage;
  }

  // Calculate fees for a transaction
  static calculateFees(amount: number): number {
    return Math.ceil(amount * this.FEE_RATE / this.FEE_BASIS_POINTS);
  }

  // Format price as percentage
  static formatPrice(price: number): string {
    return `${(Math.round(price * 10000) / 100).toFixed(2)}%`;
  }

  // Format large numbers with appropriate units
  static formatNumber(value: number): string {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toFixed(0);
  }

  // Calculate total liquidity
  static getTotalLiquidity(yesLiquidity: bigint, noLiquidity: bigint): number {
    return Number(yesLiquidity + noLiquidity);
  }

  // Calculate implied probability from price
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
