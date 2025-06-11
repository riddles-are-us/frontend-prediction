
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { MarketData } from '../types/market';
import { MarketCalculations } from '../utils/market-calculations';

interface MarketChartProps {
  market: MarketData;
}

// Mock historical data for demonstration
const generateMockData = (currentYesPrice: number, currentNoPrice: number) => {
  const data = [];
  const baseTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
  
  // Start with slightly different prices and trend toward current
  let yesPrice = currentYesPrice + (Math.random() - 0.5) * 0.2;
  let noPrice = 1 - yesPrice;
  
  for (let i = 0; i < 144; i++) { // 10-minute intervals over 24 hours
    const timestamp = baseTime + (i * 10 * 60 * 1000);
    
    // Add some randomness and trend toward current prices
    const trendFactor = i / 144;
    const randomFactor = (Math.random() - 0.5) * 0.02;
    
    yesPrice = yesPrice * (1 + randomFactor) + (currentYesPrice - yesPrice) * trendFactor * 0.02;
    noPrice = 1 - yesPrice;
    
    // Ensure prices stay within bounds
    yesPrice = Math.max(0.05, Math.min(0.95, yesPrice));
    noPrice = 1 - yesPrice;
    
    data.push({
      time: new Date(timestamp).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      timestamp,
      yesPrice: yesPrice * 100,
      noPrice: noPrice * 100,
      volume: Math.floor(Math.random() * 10000) + 1000
    });
  }
  
  return data;
};

const MarketChart: React.FC<MarketChartProps> = ({ market }) => {
  const yesLiquidity = BigInt(market.yes_liquidity);
  const noLiquidity = BigInt(market.no_liquidity);
  const prices = MarketCalculations.calculatePrices(yesLiquidity, noLiquidity);
  
  const chartData = useMemo(() => 
    generateMockData(prices.yesPrice, prices.noPrice), 
    [prices.yesPrice, prices.noPrice]
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{label}</p>
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
                  // Show only every 6th tick to avoid crowding
                  return index % 6 === 0 ? value : '';
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
              {MarketCalculations.formatNumber(Number(market.total_volume))}
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
              {MarketCalculations.formatNumber(Number(market.total_fees_collected))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MarketChart;
