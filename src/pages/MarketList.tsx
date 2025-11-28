import { DollarSign, Loader2, TrendingUp, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import PredictionMarketAPI from '../services/api';
import sanityService, { SanityMarket } from '../services/sanityService';
import { getMarketStatus, MarketStatus, MarketCalculations } from '../utils/market-calculations';
import Footer from '../components/Footer';
import { getRpcUrl } from 'zkwasm-minirollup-browser';

interface Market {
  marketId: string;
  titleString: string;
  yesLiquidity: string;
  noLiquidity: string;
  b?: string; // LMSR liquidity parameter
  prizePool: string;
  totalVolume: string;
  resolved: boolean;
  outcome?: boolean;
  landingUrl?: string;
  sanityData?: SanityMarket;
  // Time fields from API
  startTime?: string;
  endTime?: string;
  resolutionTime?: string;
}

const MarketList = () => {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [api, setApi] = useState<PredictionMarketAPI | null>(null);
  const [currentCounter, setCurrentCounter] = useState<number>(0);

  // Initialize API for market list (doesn't need wallet connection)
  useEffect(() => {
    try {
      // const config = {
      //   serverUrl: getRpcUrl(), //"http://localhost:3000", // Use the same server URL
      //   privkey: "00000000" // Dummy private key for read-only operations
      // };
      const config = {
        serverUrl: "http://172.23.84.199:3000", // Use the same server URL
        privkey: "00000000" // Dummy private key for read-only operations
      };
      const apiInstance = new PredictionMarketAPI(config);
      setApi(apiInstance);
    } catch (error) {
      console.error('Failed to initialize API:', error);
      setError('Failed to initialize connection');
    }
  }, []);

  const fetchMarkets = async () => {
    if (!api) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch markets, Sanity data, and global state
      const [backendMarkets, sanityMarkets, globalStateResponse] = await Promise.all([
        api.getAllMarkets(),
        sanityService.getAllMarketsWithImages(),
        api.queryMarketState()
      ]);
      
      // Update current counter from global state
      const counter = globalStateResponse?.state?.counter || 0;
      setCurrentCounter(counter);
      // Merge backend markets with Sanity data
      const mergedMarkets = backendMarkets.map((backendMarket: any) => {
        const sanityMarket = sanityMarkets.find((sm: any) => sm.id.toString() === backendMarket.marketId);
        return {
          ...backendMarket,
          // Map backend field names to frontend interface
          yesLiquidity: backendMarket.totalYesShares?.toString() || backendMarket.yesLiquidity || "0",
          noLiquidity: backendMarket.totalNoShares?.toString() || backendMarket.noLiquidity || "0",
          b: backendMarket.b?.toString() || "1000000", // Default b = 1,000,000
          landingUrl: sanityMarket?.landingUrl,
          sanityData: sanityMarket
        };
      });
      
      setMarkets(mergedMarkets);
    } catch (err) {
      console.error('Failed to fetch markets:', err);
      setError(err instanceof Error ? err.message : 'Failed to load markets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (api) {
      fetchMarkets();
    }
  }, [api]);

  const calculatePrice = (yesLiq: string, noLiq: string, b: string = "1000000") => {
    const yes = BigInt(yesLiq);
    const no = BigInt(noLiq);
    const bBig = BigInt(b);
    // Use LMSR price calculation
    const prices = MarketCalculations.calculatePrices(yes, no, bBig);
    return {
      yesPrice: Math.round(prices.yesPrice * 10000) / 100,
      noPrice: Math.round(prices.noPrice * 10000) / 100,
    };
  };

  const formatNumber = (num: string) => {
    return parseInt(num).toLocaleString();
  };

  const getMarketStatusForDisplay = (market: Market) => {
    if (!market.startTime || !market.endTime || !market.resolutionTime) {
      // Fallback to simple resolved check if timing data is not available
      return market.resolved ? "Resolved" : "Active Trading";
    }

    const startTime = parseInt(market.startTime);
    const endTime = parseInt(market.endTime);
    const resolutionTime = parseInt(market.resolutionTime);
    const counterInterval = 5; // 5 seconds per counter
    
    const marketStatus = getMarketStatus(
      currentCounter,
      startTime,
      endTime,
      resolutionTime,
      market.resolved,
      counterInterval
    );

    return marketStatus.statusText;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading markets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={fetchMarkets}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              MEME Prediction Market
            </h1>
            <p className="text-sm text-muted-foreground font-medium">powered by ZKWASM</p>
            <h2 className="text-2xl font-semibold mt-2">Choose a Prediction Market</h2>
            <p className="text-muted-foreground">Select a market to start trading</p>
          </div>
        </div>

        {/* Markets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {markets.map((market) => {
            const b = market.b || "1000000"; // Default b = 1,000,000
            const prices = calculatePrice(market.yesLiquidity, market.noLiquidity, b);
            return (
              <Link key={market.marketId} to={`/${market.marketId}`}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
                  {/* Landing Image */}
                  {market.landingUrl && (
                    <div className="aspect-video overflow-hidden rounded-t-lg">
                      <img 
                        src={market.landingUrl} 
                        alt={market.titleString}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          console.error('Failed to load market landing image');
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {market.titleString}
                      </CardTitle>
                      {market.resolved && (
                        <Badge variant={market.outcome ? "default" : "secondary"}>
                          {market.outcome ? "YES Won" : "NO Won"}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Price Display */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-sm text-muted-foreground">YES</div>
                        <div className="text-lg font-bold text-green-600">{prices.yesPrice}%</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <div className="text-sm text-muted-foreground">NO</div>
                        <div className="text-lg font-bold text-red-600">{prices.noPrice}%</div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          <span>Prize Pool</span>
                        </div>
                        <span className="font-medium">{formatNumber(market.prizePool)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4" />
                          <span>Volume</span>
                        </div>
                        <span className="font-medium">{formatNumber(market.totalVolume)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Trophy className="h-4 w-4" />
                          <span>Liquidity</span>
                        </div>
                        <span className="font-medium">
                          {formatNumber((parseInt(market.yesLiquidity) + parseInt(market.noLiquidity)).toString())}
                        </span>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="pt-2 border-t">
                      <Badge 
                        variant={market.resolved ? "secondary" : "default"} 
                        className="w-full justify-center"
                      >
                        {getMarketStatusForDisplay(market)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {markets.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No markets available at the moment</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default MarketList; 