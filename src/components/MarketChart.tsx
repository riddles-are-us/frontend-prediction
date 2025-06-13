import { TrendingUp } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useMarket } from '../contexts/MarketContext';
import { MarketData } from '../types/market';
import { MarketCalculations } from '../utils/market-calculations';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface MarketChartProps {
  market: MarketData;
}

const MarketChart: React.FC<MarketChartProps> = ({ market }) => {
  const { chartData, loadMarketHistory } = useMarket();
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [lastLoadedCounter, setLastLoadedCounter] = useState<number>(0);

  // Load market history when component mounts or when counter changes
  useEffect(() => {
    if (market && market.counter) {
      const currentCounter = market.counter;
      // Load history if:
      // 1. First time loading (lastLoadedCounter === 0)
      // 2. Counter has changed (update chart every counter change)
      if (lastLoadedCounter === 0 || currentCounter !== lastLoadedCounter) {
        console.log(`Loading market history for counter ${currentCounter} (last loaded: ${lastLoadedCounter})`);
        loadMarketHistory().then(() => {
          setLastLoadedCounter(currentCounter);
        });
      }
    }
  }, [market?.counter]); // Only depend on counter, not loadMarketHistory

  // Update current time every minute to refresh chart timestamps
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Transform chart data for recharts format
  const transformedChartData = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      // Fallback to current market prices if no historical data
      const yesLiquidity = BigInt(market.yes_liquidity || 0);
      const noLiquidity = BigInt(market.no_liquidity || 0);
      const prices = MarketCalculations.calculatePrices(yesLiquidity, noLiquidity);
      
      return [{
        time: new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        }),
        counter: market.counter || 0,
        yesPrice: prices.yesPrice * 100,
        noPrice: prices.noPrice * 100,
        fullTime: new Date().toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
      }];
    }

    return chartData.map((point) => {
      // Calculate approximate timestamp based on counter
      // Assuming each counter represents 5 seconds
      const counterInterval = 5; // seconds
      const approximateTimestamp = Date.now() - ((market.counter || 0) - point.counter) * counterInterval * 1000;
      
      return {
        time: new Date(approximateTimestamp).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        }),
        counter: point.counter,
        yesPrice: point.yesPrice * 100, // Convert to percentage
        noPrice: point.noPrice * 100,   // Convert to percentage
        fullTime: new Date(approximateTimestamp).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
      };
    });
  }, [chartData, market, currentTime]);

  // Calculate trend indicators based on current and previous counter prices
  const calculatePriceTrends = useMemo(() => {
    if (!chartData || chartData.length < 2 || !market?.counter) {
      return { yesTrend: 0, noTrend: 0 };
    }

    const currentCounter = market.counter;
    
    // Find the current counter's price data
    const currentData = chartData.find(point => point.counter === currentCounter);
    
    // Find the previous counter's price data
    const previousData = chartData.find(point => point.counter === currentCounter - 1);
    
    if (!currentData || !previousData) {
      // Fallback to latest chart data comparison if exact counter match not found
      const latestData = chartData[chartData.length - 1];
      const prevData = chartData[chartData.length - 2];
      if (latestData && prevData) {
        return {
          yesTrend: (latestData.yesPrice * 100) - (prevData.yesPrice * 100),
          noTrend: (latestData.noPrice * 100) - (prevData.noPrice * 100)
        };
      }
      return { yesTrend: 0, noTrend: 0 };
    }
    
    return {
      yesTrend: (currentData.yesPrice * 100) - (previousData.yesPrice * 100),
      noTrend: (currentData.noPrice * 100) - (previousData.noPrice * 100)
    };
  }, [chartData, market?.counter]);

  const { yesTrend, noTrend } = calculatePriceTrends;

  // Get latest data for display
  const latestData = transformedChartData[transformedChartData.length - 1];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">Counter: {dataPoint.counter}</p>
          <p className="text-sm text-muted-foreground mb-2">{dataPoint.fullTime || label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.dataKey === 'yesPrice' ? 'YES' : 'NO'}: {entry.value.toFixed(1)}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="gradient-card animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Price Chart
          </div>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-bull-500 rounded-full"></div>
              <span>YES {yesTrend > 0 ? '↗' : yesTrend < 0 ? '↘' : '→'} {latestData.yesPrice.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-bear-500 rounded-full"></div>
              <span>NO {noTrend > 0 ? '↗' : noTrend < 0 ? '↘' : '→'} {latestData.noPrice.toFixed(1)}%</span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={transformedChartData}>
              <defs>
                <linearGradient id="yesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="noGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
              <XAxis 
                dataKey="time" 
                stroke="#6b7280"
                fontSize={12}
                interval="preserveStartEnd"
                tickFormatter={(value, index) => {
                  // Show every 12th tick to avoid crowding
                  const dataLength = transformedChartData.length;
                  const interval = Math.floor(Math.max(1, dataLength / 6)); // Show about 6 labels across the chart
                  return index % interval === 0 ? value : '';
                }}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="yesPrice"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#yesGradient)"
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="noPrice"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#noGradient)"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Volume</div>
            <div className="font-semibold">
              {MarketCalculations.formatNumber(Number(market.total_volume || 0))}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Total Liquidity</div>
            <div className="font-semibold">
              {MarketCalculations.formatNumber(
                MarketCalculations.getTotalLiquidity(
                  BigInt(market.yes_liquidity || 0), 
                  BigInt(market.no_liquidity || 0)
                )
              )}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Fees Collected</div>
            <div className="font-semibold">
              {MarketCalculations.formatNumber(Number(market.total_fees_collected || 0))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MarketChart;
