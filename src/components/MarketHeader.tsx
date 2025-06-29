import { Clock, TrendingUp, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { MarketData } from '../types/market';
import { MarketCalculations } from '../utils/market-calculations';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import sanityService from '../services/sanityService';

interface MarketHeaderProps {
  market: MarketData;
}

const MarketHeader: React.FC<MarketHeaderProps> = ({ market }) => {
  const [liveTimeRemaining, setLiveTimeRemaining] = useState<string>(market.time_remaining || "Loading...");
  const [landingImageUrl, setLandingImageUrl] = useState<string | null>(null);

  // Fetch landing image from Sanity
  useEffect(() => {
    const fetchLandingImage = async () => {
      try {
        // Extract market ID from URL or use a default method
        const marketId = parseInt(window.location.pathname.split('/').pop() || '1');
        const imageUrl = await sanityService.getMarketLandingImageUrl(marketId);
        setLandingImageUrl(imageUrl);
      } catch (error) {
        console.error('Failed to fetch landing image:', error);
      }
    };

    fetchLandingImage();
  }, []);

  // Update time remaining every second for real-time countdown
  useEffect(() => {
    if (!market.remaining_time || market.remaining_time <= 0) {
      setLiveTimeRemaining("Market Ended");
      return;
    }

    // Initial time from market data
    let remainingSeconds = market.remaining_time;
    setLiveTimeRemaining(market.time_remaining || "Loading...");

    const interval = setInterval(() => {
      remainingSeconds -= 1;
      
      if (remainingSeconds <= 0) {
        setLiveTimeRemaining("Market Ended");
        clearInterval(interval);
        return;
      }

      // Format time
      const formatTime = (seconds: number): string => {
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

      setLiveTimeRemaining(formatTime(remainingSeconds));
    }, 1000);

    return () => clearInterval(interval);
  }, [market.remaining_time, market.time_remaining]);

  // Provide default values to handle undefined market data
  const yesLiquidity = BigInt(market.yes_liquidity || 0);
  const noLiquidity = BigInt(market.no_liquidity || 0);
  const prices = MarketCalculations.calculatePrices(yesLiquidity, noLiquidity);
  const totalLiquidity = MarketCalculations.getTotalLiquidity(yesLiquidity, noLiquidity);

  // Test price calculation with unequal liquidity (for debugging)
  if (yesLiquidity === noLiquidity && yesLiquidity > 0n) {
    console.log('MarketHeader - Equal liquidity detected:', {
      yesLiquidity: yesLiquidity.toString(),
      noLiquidity: noLiquidity.toString(),
      yesPrice: prices.yesPrice,
      noPrice: prices.noPrice,
      yesChance: (prices.yesPrice * 100).toFixed(1) + '%',
      noChance: (prices.noPrice * 100).toFixed(1) + '%'
    });
    
    // Test with different liquidity to verify calculation
    const testPrices = MarketCalculations.calculatePrices(BigInt(800000), BigInt(1200000));
    console.log('MarketHeader - Test with unequal liquidity (800K YES, 1200K NO):', {
      yesPrice: testPrices.yesPrice,
      noPrice: testPrices.noPrice,
      yesChance: (testPrices.yesPrice * 100).toFixed(1) + '%',
      noChance: (testPrices.noPrice * 100).toFixed(1) + '%'
    });
  }

  // Debug logging for price calculation
  console.log('MarketHeader - Liquidity and Price Calculation:', {
    yesLiquidity: yesLiquidity.toString(),
    noLiquidity: noLiquidity.toString(),
    totalLiquidity,
    prices,
    yesChance: MarketCalculations.priceToImpliedProbability(prices.yesPrice),
    noChance: MarketCalculations.priceToImpliedProbability(prices.noPrice)
  });

  return (
    <Card className="gradient-card market-glow p-6 mb-6 animate-fade-in">
      {/* Landing Image */}
      {landingImageUrl && (
        <div className="mb-6">
          <img 
            src={landingImageUrl} 
            alt={market.titleString}
            className="w-full h-48 object-cover rounded-lg"
            onError={(e) => {
              console.error('Failed to load landing image');
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}
      
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              {market.titleString}
            </h1>
            <Badge 
              variant={market.resolved ? "destructive" : "default"}
              className="text-sm"
            >
              {market.resolved ? "Resolved" : "Active"}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-5 w-5" />
            <span className="font-medium">{liveTimeRemaining}</span>
          </div>
          
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-5 w-5" />
            <span className="font-medium">
              ${MarketCalculations.formatNumber(Number(market.total_volume || 0))} Volume
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
