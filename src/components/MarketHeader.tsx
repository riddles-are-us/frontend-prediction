
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingUp, Users } from 'lucide-react';
import { MarketData } from '../types/market';
import { MarketCalculations } from '../utils/market-calculations';

interface MarketHeaderProps {
  market: MarketData;
  timeRemaining?: string;
}

const MarketHeader: React.FC<MarketHeaderProps> = ({ market, timeRemaining = "23h 45m" }) => {
  const yesLiquidity = BigInt(market.yes_liquidity);
  const noLiquidity = BigInt(market.no_liquidity);
  const prices = MarketCalculations.calculatePrices(yesLiquidity, noLiquidity);
  const totalLiquidity = MarketCalculations.getTotalLiquidity(yesLiquidity, noLiquidity);

  return (
    <Card className="gradient-card market-glow p-6 mb-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              {market.title}
            </h1>
            <Badge 
              variant={market.resolved ? "destructive" : "default"}
              className="text-sm"
            >
              {market.resolved ? "Resolved" : "Active"}
            </Badge>
          </div>
          <p className="text-muted-foreground text-lg">
            Will Bitcoin reach $100,000 USD by December 31, 2024?
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-5 w-5" />
            <span className="font-medium">{timeRemaining}</span>
          </div>
          
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-5 w-5" />
            <span className="font-medium">
              ${MarketCalculations.formatNumber(Number(market.total_volume))} Volume
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-5 w-5" />
            <span className="font-medium">
              ${MarketCalculations.formatNumber(totalLiquidity)} Liquidity
            </span>
          </div>
        </div>
      </div>

      {/* Current Odds Display */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="bg-bull-50 dark:bg-bull-900/20 border border-bull-200 dark:border-bull-800 rounded-lg p-4">
          <div className="text-bull-600 dark:text-bull-400 text-sm font-medium mb-1">YES</div>
          <div className="text-2xl font-bold text-bull-700 dark:text-bull-300">
            {MarketCalculations.formatPrice(prices.yesPrice)}
          </div>
          <div className="text-xs text-bull-500 dark:text-bull-400 mt-1">
            {MarketCalculations.priceToImpliedProbability(prices.yesPrice).toFixed(1)}% chance
          </div>
        </div>
        
        <div className="bg-bear-50 dark:bg-bear-900/20 border border-bear-200 dark:border-bear-800 rounded-lg p-4">
          <div className="text-bear-600 dark:text-bear-400 text-sm font-medium mb-1">NO</div>
          <div className="text-2xl font-bold text-bear-700 dark:text-bear-300">
            {MarketCalculations.formatPrice(prices.noPrice)}
          </div>
          <div className="text-xs text-bear-500 dark:text-bear-400 mt-1">
            {MarketCalculations.priceToImpliedProbability(prices.noPrice).toFixed(1)}% chance
          </div>
        </div>
      </div>
    </Card>
  );
};

export default MarketHeader;
