import { useEffect, useState } from 'react';
import AdminPanel from '../components/AdminPanel';
import MarketChart from '../components/MarketChart';
import MarketHeader from '../components/MarketHeader';
import PortfolioPanel from '../components/PortfolioPanel';
import TradingPanel from '../components/TradingPanel';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useMarket } from '../contexts/MarketContext';
import { useWallet } from '../contexts/WalletContext';
import { useToast } from '../hooks/use-toast';

const Index = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState("trade");
  const { toast } = useToast();
  
  const { 
    isConnected, 
    isL2Connected, 
    l1Account, 
    l2Account, 
    playerId, 
    connectL1, 
    connectL2, 
    disconnect 
  } = useWallet();
  
    const {
    marketData,
    playerData,
    isLoading,
    placeBet,
    sellShares,
    claimWinnings,
    resolveMarket,
    withdrawFees,
    refreshData
  } = useMarket();

  // Show success message when wallet connects
  useEffect(() => {
    if (l1Account) {
      toast({
        title: "Wallet Connected!",
        description: "Successfully connected to your wallet",
      });
    }
  }, [l1Account, toast]);

  // Show success message when L2 connects
  useEffect(() => {
    if (l2Account) {
      toast({
        title: "App Connected!",
        description: "Successfully connected to the prediction market app",
      });
    }
  }, [l2Account, toast]);

  // Handle wallet connection (L1)
  const handleConnectWallet = async () => {
    console.log("Connect wallet clicked"); // Debug log
    toast({
      title: "Connecting...",
      description: "Connecting to your wallet",
    });
    
    try {
      await connectL1();
      console.log("Connect L1 completed successfully"); // Debug log
      toast({
        title: "Wallet Connected!",
        description: "Successfully connected to your wallet",
      });
    } catch (error) {
      console.error("Connect wallet error:", error); // Debug log
      const errorMessage = error instanceof Error ? error.message : "Failed to connect to wallet. Please make sure you have MetaMask installed.";
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Handle L2 account connection
  const handleConnectL2 = async () => {
    toast({
      title: "Connecting to App...",
      description: "Connecting to zkWasm prediction market",
    });
    
    try {
      await connectL2();
      toast({
        title: "App Connected!",
        description: "Successfully connected to the prediction market app",
      });
    } catch (error) {
      toast({
        title: "App Connection Failed",
        description: "Failed to connect to the prediction market app",
        variant: "destructive",
      });
    }
  };

  // Player is now auto-installed when L2 connects

  // Trading functions using real API calls
  const handleTrade = async (type: 'BUY' | 'SELL', betType: 0 | 1, amount: number) => {
    if (!isL2Connected) {
      toast({
        title: "App Connection Required",
        description: "Please connect to the app first",
        variant: "destructive",
      });
      return;
    }

    if (!playerId) {
      toast({
        title: "Registration Required",
        description: "Please register as a player first",
        variant: "destructive",
      });
      return;
    }

    try {
      if (type === 'BUY') {
        await placeBet(betType, amount.toString());
      } else {
        await sellShares(betType, amount.toString());
      }
    } catch (error) {
      console.error('Trade failed:', error);
    }
  };

  const handleClaim = async () => {
    if (!isL2Connected) {
      toast({
        title: "App Connection Required",
        description: "Please connect to the app first",
        variant: "destructive",
      });
      return;
    }

    if (!playerId) {
      toast({
        title: "Registration Required",
        description: "Please register as a player first",
        variant: "destructive",
      });
      return;
    }

    try {
      await claimWinnings();
    } catch (error) {
      console.error('Claim failed:', error);
    }
  };

  const handleWithdraw = async (amount: number) => {
    if (!isL2Connected) {
      toast({
        title: "App Connection Required", 
        description: "Please connect to the app first",
        variant: "destructive",
      });
      return;
    }

    if (!playerId) {
      toast({
        title: "Registration Required", 
        description: "Please register as a player first",
        variant: "destructive",
      });
      return;
    }

    // Note: This would need to be implemented in the API
    toast({
      title: "Withdrawal Initiated", 
      description: `Withdrawing ${amount} tokens`,
    });
  };

  // Admin functions using real API calls
  const handleResolveMarket = async (outcome: boolean) => {
    try {
      await resolveMarket(outcome);
    } catch (error) {
      console.error('Market resolution failed:', error);
    }
  };

  const handleWithdrawFees = async () => {
    try {
      await withdrawFees();
    } catch (error) {
      console.error('Fee withdrawal failed:', error);
    }
  };

  const handleDepositFunds = async (playerId: string, amount: number) => {
    console.log("Depositing funds:", { playerId, amount });
    // This would need to be implemented in the API
  };

  // Calculate market percentages from real data
  const getMarketPercentages = () => {
    if (!marketData) return { yesPercentage: 50, noPercentage: 50 };
    
    const yesLiq = parseFloat(marketData.yes_liquidity);
    const noLiq = parseFloat(marketData.no_liquidity);
    const total = yesLiq + noLiq;
    
    if (total === 0) return { yesPercentage: 50, noPercentage: 50 };
    
    return {
      yesPercentage: Math.round((noLiq / total) * 100), // Price is inverse of liquidity
      noPercentage: Math.round((yesLiq / total) * 100)
    };
  };

  const { yesPercentage, noPercentage } = getMarketPercentages();

  // Show connect wallet screen if not connected to L1
  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="gradient-card market-glow p-8 max-w-md w-full text-center animate-fade-in">
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-bitcoin-500 to-bull-500 bg-clip-text text-transparent">
                zkWasm Prediction Market
              </h1>
              <p className="text-muted-foreground">
                Decentralized AMM-based prediction market powered by zkWasm
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-semibold mb-2">Connect to View Market</h3>
                <p className="text-sm text-muted-foreground">
                  Connect your wallet to view current market data
                </p>
                <div className="flex justify-center gap-2 mt-3">
                  <Badge variant="outline" className="border-muted-foreground/50">
                    Loading...
                  </Badge>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={handleConnectWallet}
              className="w-full price-gradient-yes hover:opacity-90 animate-pulse-glow"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? "Connecting..." : "Connect Wallet"}
            </Button>
            
            <div className="text-xs text-muted-foreground">
              <p>✨ AMM-based pricing</p>
              <p>🔒 zkWasm security</p>
              <p>💰 1% platform fee</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Show connect to app screen if L1 connected but not L2
  if (isConnected && !isL2Connected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="gradient-card market-glow p-8 max-w-md w-full text-center animate-fade-in">
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-bitcoin-500 to-bull-500 bg-clip-text text-transparent">
                Welcome Back!
              </h1>
              <p className="text-muted-foreground">
                Wallet connected: {l1Account?.address ? `${l1Account.address.slice(0, 6)}...${l1Account.address.slice(-4)}` : 'Unknown'}
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-semibold mb-2">Connect to App</h3>
                <p className="text-sm text-muted-foreground">
                  Connect to the zkWasm prediction market application to start trading
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={handleConnectL2}
                className="w-full price-gradient-yes hover:opacity-90"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? "Connecting to App..." : "Connect to App"}
              </Button>
              
              <Button 
                onClick={disconnect}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Disconnect Wallet
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-bitcoin-500 to-bull-500 bg-clip-text text-transparent">
              zkWasm Prediction Market
            </h1>
            <Badge variant="outline" className="border-bull-500 text-bull-600">
              Connected
            </Badge>
            {l2Account && (
              <Badge variant="outline" className="border-green-500 text-green-600">
                L2: {l2Account.toHexStr ? `${l2Account.toHexStr().slice(0, 6)}...${l2Account.toHexStr().slice(-4)}` : 'Connected'}
              </Badge>
            )}
            {isLoading && (
              <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                Installing Player...
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdmin(!isAdmin)}
            >
              {isAdmin ? "Exit Admin" : "Admin Mode"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={disconnect}
            >
              Disconnect
            </Button>
          </div>
        </div>

        {/* Market Header */}
        {marketData ? (
          <MarketHeader market={marketData} />
        ) : (
          <Card className="p-6">
            <div className="text-center text-muted-foreground">
              <div className="animate-pulse">Loading market data from localhost:3000...</div>
            </div>
          </Card>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Chart */}
          <div className="lg:col-span-2">
            {marketData ? (
              <MarketChart market={marketData} />
            ) : (
              <Card className="p-8">
                <div className="text-center text-muted-foreground">
                  <div className="animate-pulse">Loading chart data...</div>
                </div>
              </Card>
            )}
          </div>

          {/* Right Column - Trading/Portfolio */}
          <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="trade">Trade</TabsTrigger>
                <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
              </TabsList>
              
              <TabsContent value="trade" className="space-y-4">
                {marketData && playerData ? (
                  <TradingPanel
                    market={marketData}
                    playerData={playerData}
                    onTrade={handleTrade}
                  />
                ) : (
                  <Card className="p-8">
                    <div className="text-center text-muted-foreground">
                      <div className="animate-pulse">
                        {!marketData ? "Loading market data..." : "Loading player data..."}
                      </div>
                    </div>
                  </Card>
                )}
              </TabsContent>
              
              <TabsContent value="portfolio" className="space-y-4">
                {marketData && playerData ? (
                  <PortfolioPanel
                    market={marketData}
                    playerData={playerData}
                    onClaim={handleClaim}
                    onWithdraw={handleWithdraw}
                  />
                ) : (
                  <Card className="p-8">
                    <div className="text-center text-muted-foreground">
                      <div className="animate-pulse">
                        {!marketData ? "Loading market data..." : "Loading portfolio data..."}
                      </div>
                    </div>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Admin Panel */}
        {isAdmin && (
          <div className="mt-8">
            {marketData ? (
              <AdminPanel
                market={marketData}
                isAdmin={isAdmin}
                onResolveMarket={handleResolveMarket}
                onWithdrawFees={handleWithdrawFees}
                onDepositFunds={handleDepositFunds}
              />
            ) : (
              <Card className="p-8">
                <div className="text-center text-muted-foreground">
                  <div className="animate-pulse">Loading admin data...</div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Refresh Button */}
        <div className="flex justify-center">
          <Button
            onClick={refreshData}
            variant="outline"
            disabled={isLoading}
          >
            {isLoading ? "Refreshing..." : "Refresh Data"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
