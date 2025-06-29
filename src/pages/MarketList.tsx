import { DollarSign, Loader2, TrendingUp, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import PredictionMarketAPI from '../services/api';
import sanityService, { SanityMarket } from '../services/sanityService';

interface Market {
  marketId: string;
  titleString: string;
  yesLiquidity: string;
  noLiquidity: string;
  prizePool: string;
  totalVolume: string;
  resolved: boolean;
  outcome?: boolean;
  landingUrl?: string;
  sanityData?: SanityMarket;
}

const MarketList = () => {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [api, setApi] = useState<PredictionMarketAPI | null>(null);

  // Initialize API for market list (doesn't need wallet connection)
  useEffect(() => {
    try {
      const config = {
        serverUrl: "https://rpc.btcprediction.zkwasm.ai", //"http://localhost:3000", // Use the same server URL
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
      
      // Fetch markets from both backend and Sanity
      const [backendMarkets, sanityMarkets] = await Promise.all([
        api.getAllMarkets(),
        sanityService.getAllMarketsWithImages()
      ]);
      
      // Merge backend markets with Sanity data
      const mergedMarkets = backendMarkets.map(backendMarket => {
        const sanityMarket = sanityMarkets.find(sm => sm.id.toString() === backendMarket.marketId);
        return {
          ...backendMarket,
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

  const calculatePrice = (yesLiq: string, noLiq: string) => {
    const yes = parseFloat(yesLiq);
    const no = parseFloat(noLiq);
    const total = yes + no;
    if (total === 0) return { yesPrice: 50, noPrice: 50 };
    return {
      yesPrice: Math.round((no / total) * 100),
      noPrice: Math.round((yes / total) * 100)
    };
  };

  const formatNumber = (num: string) => {
    return parseInt(num).toLocaleString();
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
          <img 
            src="/platform-banner.png" 
            alt="zkWasm Prediction Markets"
            className="h-12 w-auto mx-auto"
            onError={(e) => {
              e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQ4IiB2aWV3Qm94PSIwIDAgNDAwIDQ4IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQ4IiByeD0iOCIgZmlsbD0iI0YzRjRGNiIvPgo8dGV4dCB4PSIyMDAiIHk9IjI4IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM2NTczODQiIHRleHQtYW5jaG9yPSJtaWRkbGUiPnprV2FzbSBQcmVkaWN0aW9uIE1hcmtldHM8L3RleHQ+Cjwvc3ZnPgo=';
            }}
          />
          <div>
            <h1 className="text-3xl font-bold">Choose a Prediction Market</h1>
            <p className="text-muted-foreground">Select a market to start trading</p>
          </div>
        </div>

        {/* Markets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {markets.map((market) => {
            const prices = calculatePrice(market.yesLiquidity, market.noLiquidity);
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
                      <Badge variant={market.resolved ? "secondary" : "default"} className="w-full justify-center">
                        {market.resolved ? "Resolved" : "Active Trading"}
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
    </div>
  );
};

export default MarketList; 