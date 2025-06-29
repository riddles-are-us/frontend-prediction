// AMM calculation utilities for the prediction market
import { MarketImpact, MarketPrices } from '../types/market';

export class MarketCalculations {
  // Constants from the Rust backend
  static readonly PRECISION = 10000;
  static readonly FEE_RATE = 100; // 1% = 100 basis points

  // Calculate current market prices based on liquidity
  static calculatePrices(yesLiquidity: bigint, noLiquidity: bigint): MarketPrices {
    const totalLiquidity = yesLiquidity + noLiquidity;
    
    if (totalLiquidity === 0n) {
      return { yesPrice: 0.5, noPrice: 0.5 };
    }

    const yesPrice = Number(noLiquidity * BigInt(this.PRECISION) / totalLiquidity) / this.PRECISION;
    const noPrice = Number(yesLiquidity * BigInt(this.PRECISION) / totalLiquidity) / this.PRECISION;

    return { yesPrice, noPrice };
  }

  // Calculate shares received for a given bet amount (before fees)
  static calculateSharesForBet(
    betType: 0 | 1, // 0 = NO, 1 = YES
    amount: number,
    yesLiquidity: bigint,
    noLiquidity: bigint
  ): number {
    const amountBig = BigInt(Math.floor(amount));
    
    if (betType === 1) { // YES bet
      // Calculate shares using AMM formula: shares = yes_liquidity - (yes_liquidity * no_liquidity) / (no_liquidity + amount)
      const newNoLiquidity = noLiquidity + amountBig;
      const newYesLiquidity = (yesLiquidity * noLiquidity) / newNoLiquidity;
      const shares = yesLiquidity - newYesLiquidity;
      return Number(shares);
    } else { // NO bet
      const newYesLiquidity = yesLiquidity + amountBig;
      const newNoLiquidity = (yesLiquidity * noLiquidity) / newYesLiquidity;
      const shares = noLiquidity - newNoLiquidity;
      return Number(shares);
    }
  }

  // Calculate amount received for selling shares
  static calculateAmountForShares(
    sellType: 0 | 1, // 0 = NO, 1 = YES
    shares: number,
    yesLiquidity: bigint,
    noLiquidity: bigint
  ): number {
    const sharesBig = BigInt(Math.floor(shares));
    
    if (sellType === 1) { // Selling YES shares
      // Calculate amount using reverse AMM formula
      const newYesLiquidity = yesLiquidity + sharesBig;
      const newNoLiquidity = (yesLiquidity * noLiquidity) / newYesLiquidity;
      const amount = noLiquidity - newNoLiquidity;
      return Number(amount);
    } else { // Selling NO shares
      const newNoLiquidity = noLiquidity + sharesBig;
      const newYesLiquidity = (yesLiquidity * noLiquidity) / newNoLiquidity;
      const amount = yesLiquidity - newYesLiquidity;
      return Number(amount);
    }
  }

  // Calculate effective buy price for a given amount
  static getBuyPrice(
    betType: 0 | 1,
    amount: number,
    yesLiquidity: bigint,
    noLiquidity: bigint
  ): number {
    const shares = this.calculateSharesForBet(betType, amount, yesLiquidity, noLiquidity);
    return shares > 0 ? amount / shares : 0;
  }

  // Calculate effective sell price for given shares
  static getSellPrice(
    sellType: 0 | 1,
    shares: number,
    yesLiquidity: bigint,
    noLiquidity: bigint
  ): number {
    const amount = this.calculateAmountForShares(sellType, shares, yesLiquidity, noLiquidity);
    return shares > 0 ? amount / shares : 0;
  }

  // Calculate market impact of a trade
  static calculateMarketImpact(
    betType: 0 | 1,
    amount: number,
    yesLiquidity: bigint,
    noLiquidity: bigint
  ): MarketImpact {
    const currentPrices = this.calculatePrices(yesLiquidity, noLiquidity);
    const currentPrice = betType === 1 ? currentPrices.yesPrice : currentPrices.noPrice;
    
    const shares = this.calculateSharesForBet(betType, amount, yesLiquidity, noLiquidity);
    const effectivePrice = amount / shares;
    
    const priceImpact = Math.abs(effectivePrice - currentPrice) / currentPrice;
    
    // Calculate new liquidity after trade
    const amountBig = BigInt(Math.floor(amount));
    let newYesLiquidity = yesLiquidity;
    let newNoLiquidity = noLiquidity;
    
    if (betType === 1) {
      newNoLiquidity = noLiquidity + amountBig;
      newYesLiquidity = (yesLiquidity * noLiquidity) / newNoLiquidity;
    } else {
      newYesLiquidity = yesLiquidity + amountBig;
      newNoLiquidity = (yesLiquidity * noLiquidity) / newYesLiquidity;
    }
    
    const newPrices = this.calculatePrices(newYesLiquidity, newNoLiquidity);
    const newPrice = betType === 1 ? newPrices.yesPrice : newPrices.noPrice;
    
    const slippage = Math.abs(newPrice - currentPrice) / currentPrice;
    
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
    noLiquidity: bigint
  ): number {
    const impact = this.calculateMarketImpact(betType, amount, yesLiquidity, noLiquidity);
    return impact.slippage;
  }

  // Calculate fees for a transaction
  static calculateFees(amount: number): number {
    return Math.ceil(amount * this.FEE_RATE / this.PRECISION);
  }

  // Format price as percentage
  static formatPrice(price: number): string {
    return `${(price * 100).toFixed(1)}%`;
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
