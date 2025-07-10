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
  const { chartData, loadMarketHistory, globalState } = useMarket();
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [lastLoadedCounter, setLastLoadedCounter] = useState<number>(0);

  // Load market history
  useEffect(() => {
    if (globalState && globalState.counter !== undefined) {
      const currentCounter = globalState.counter;
      if (lastLoadedCounter === 0 || currentCounter !== lastLoadedCounter) {
        console.log(`Loading market history for global counter ${currentCounter}`);
        
        loadMarketHistory().then(() => {
          setLastLoadedCounter(currentCounter);
        }).catch((error) => {
          console.error('Failed to load market history:', error);
        });
      }
    }
  }, [globalState?.counter]);

  // Transform chart data for recharts format
  const transformedChartData = useMemo(() => {
    console.log('MarketChart - transformedChartData: chartData length =', chartData?.length || 0);
    
    if (!chartData || chartData.length === 0) {
      console.log('MarketChart - Using fallback to current market prices');
      
      // Calculate prices using current liquidity with sell algorithm
      const yesAmount = MarketCalculations.calculateAmountForShares(1, 100, BigInt(market.yes_liquidity), BigInt(market.no_liquidity));
      const noAmount = MarketCalculations.calculateAmountForShares(0, 100, BigInt(market.yes_liquidity), BigInt(market.no_liquidity));
      const yesPrice = yesAmount / 100;
      const noPrice = noAmount / 100;
      
      return [{
        time: new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        }),
        counter: globalState?.counter || 0,
        yesPrice: yesPrice,
        noPrice: noPrice,
        fullTime: new Date().toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
      }];
    }

    console.log('MarketChart - Using historical chart data with', chartData.length, 'points');
    
    return chartData.map((point) => {
      const counterInterval = 5; // seconds
      const approximateTimestamp = Date.now() - ((globalState?.counter || 0) - point.counter) * counterInterval * 1000;
      
      // Calculate prices using point's liquidity with sell algorithm
      const yesAmount = MarketCalculations.calculateAmountForShares(1, 100, BigInt(point.yesLiquidity), BigInt(point.noLiquidity));
      const noAmount = MarketCalculations.calculateAmountForShares(0, 100, BigInt(point.yesLiquidity), BigInt(point.noLiquidity));
      const yesPrice = yesAmount / 100;
      const noPrice = noAmount / 100;
      
      return {
        time: new Date(approximateTimestamp).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        }),
        counter: point.counter,
        yesPrice: yesPrice,
        noPrice: noPrice,
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
    if (!chartData || chartData.length < 2 || !globalState?.counter) {
      return { yesTrend: 0, noTrend: 0 };
    }

    const currentCounter = globalState.counter;
    
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
  }, [chartData, globalState?.counter]);

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
              {entry.dataKey === 'yesPrice' ? 'YES' : 'NO'}: {entry.value.toFixed(3)}
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
              <span>YES {yesTrend > 0 ? '↗' : yesTrend < 0 ? '↘' : '→'} {(latestData.yesPrice).toFixed(3)}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-bear-500 rounded-full"></div>
              <span>NO {noTrend > 0 ? '↗' : noTrend < 0 ? '↘' : '→'} {(latestData.noPrice).toFixed(3)}</span>
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
              />
              <YAxis 
                domain={[0, 2]}
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(value) => value.toFixed(2)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="yesPrice"
                stroke="#22c55e"
                fillOpacity={1}
                fill="url(#yesGradient)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="noPrice"
                stroke="#ef4444"
                fillOpacity={1}
                fill="url(#noGradient)"
                strokeWidth={2}
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
