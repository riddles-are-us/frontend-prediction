import { TrendingUp } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MarketData } from '../types/market';
import { MarketCalculations } from '../utils/market-calculations';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface MarketChartProps {
  market: MarketData;
}

// Mock historical data for demonstration
const generateMockData = (currentYesPrice: number, currentNoPrice: number, market: MarketData) => {
  const data = [];
  const now = Date.now();
  
  // Calculate the actual start time based on counter
  // Each counter represents 5 seconds
  const currentCounter = market.counter || 0;
  const startTime = market.start_time || 0;
  const elapsedCounters = currentCounter - startTime;
  const elapsedSeconds = elapsedCounters * 5;
  const marketStartTime = now - (elapsedSeconds * 1000);
  
  // Generate 24 hours of data with 10-minute intervals (144 data points)
  const dataPoints = 144;
  const intervalMs = (24 * 60 * 60 * 1000) / dataPoints; // 10 minutes in milliseconds
  
  // Start with slightly different prices and trend toward current
  let yesPrice = currentYesPrice + (Math.random() - 0.5) * 0.2;
  let noPrice = 1 - yesPrice;
  
  for (let i = 0; i < dataPoints; i++) {
    // Calculate timestamp from 24 hours ago to now
    const timestamp = now - ((dataPoints - 1 - i) * intervalMs);
    
    // Add some randomness and trend toward current prices
    const trendFactor = i / dataPoints;
    const randomFactor = (Math.random() - 0.5) * 0.02;
    
    yesPrice = yesPrice * (1 + randomFactor) + (currentYesPrice - yesPrice) * trendFactor * 0.02;
    noPrice = 1 - yesPrice;
    
    // Ensure prices stay within bounds
    yesPrice = Math.max(0.05, Math.min(0.95, yesPrice));
    noPrice = 1 - yesPrice;
    
    data.push({
      time: new Date(timestamp).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false // Use 24-hour format for clarity
      }),
      timestamp,
      fullTime: new Date(timestamp).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }),
      yesPrice: yesPrice * 100,
      noPrice: noPrice * 100,
      volume: Math.floor(Math.random() * 10000) + 1000
    });
  }
  
  return data;
};

const MarketChart: React.FC<MarketChartProps> = ({ market }) => {
  // Add a timestamp state to force chart regeneration every minute
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time every minute to keep chart timestamps current
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Provide default values to handle undefined market data
  const yesLiquidity = BigInt(market.yes_liquidity || 0);
  const noLiquidity = BigInt(market.no_liquidity || 0);
  const prices = MarketCalculations.calculatePrices(yesLiquidity, noLiquidity);
  
  const chartData = useMemo(() => 
    generateMockData(prices.yesPrice, prices.noPrice, market), 
    [prices.yesPrice, prices.noPrice, market, currentTime]
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{dataPoint.fullTime || label}</p>
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

  // Get latest data point for trend indicators
  const latestData = chartData[chartData.length - 1];
  const previousData = chartData[chartData.length - 2];
  const yesTrend = latestData.yesPrice - previousData.yesPrice;
  const noTrend = latestData.noPrice - previousData.noPrice;

  return (
    <Card className="gradient-card animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Price Chart (24H)
          </div>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-bull-500 rounded-full"></div>
              <span>YES {yesTrend > 0 ? '↗' : '↘'} {latestData.yesPrice.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-bear-500 rounded-full"></div>
              <span>NO {noTrend > 0 ? '↗' : '↘'} {latestData.noPrice.toFixed(1)}%</span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
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
                  // Show every 12th tick (approximately every 2 hours) to avoid crowding
                  const dataLength = chartData.length;
                  const interval = Math.floor(dataLength / 6); // Show about 6 labels across the chart
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
            <div className="text-sm text-muted-foreground">24h Volume</div>
            <div className="font-semibold">
              {MarketCalculations.formatNumber(Number(market.total_volume || 0))}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Total Liquidity</div>
            <div className="font-semibold">
              {MarketCalculations.formatNumber(
                MarketCalculations.getTotalLiquidity(yesLiquidity, noLiquidity)
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
