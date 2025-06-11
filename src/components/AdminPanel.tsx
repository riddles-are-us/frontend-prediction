
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Settings, DollarSign, TrendingUp, Users, Award } from 'lucide-react';
import { MarketData } from '../types/market';
import { MarketCalculations } from '../utils/market-calculations';
import { useToast } from '@/hooks/use-toast';

interface AdminPanelProps {
  market: MarketData;
  isAdmin: boolean;
  onResolveMarket: (outcome: boolean) => void;
  onWithdrawFees: () => void;
  onDepositFunds: (playerId: string, amount: number) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({
  market,
  isAdmin,
  onResolveMarket,
  onWithdrawFees,
  onDepositFunds
}) => {
  const [depositPlayerId, setDepositPlayerId] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  if (!isAdmin) {
    return (
      <Card className="gradient-card animate-fade-in">
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Admin access required</p>
        </CardContent>
      </Card>
    );
  }

  const feesCollected = Number(market.total_fees_collected);
  const totalVolume = Number(market.total_volume);
  const yesLiquidity = BigInt(market.yes_liquidity);
  const noLiquidity = BigInt(market.no_liquidity);
  const totalLiquidity = MarketCalculations.getTotalLiquidity(yesLiquidity, noLiquidity);

  const handleResolveMarket = async (outcome: boolean) => {
    if (market.resolved) {
      toast({
        title: "Already Resolved",
        description: "This market has already been resolved",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      await onResolveMarket(outcome);
      toast({
        title: "Market Resolved",
        description: `Market resolved with outcome: ${outcome ? 'YES' : 'NO'}`,
      });
    } catch (error) {
      toast({
        title: "Resolution Failed",
        description: "Failed to resolve market. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdrawFees = async () => {
    if (feesCollected === 0) {
      toast({
        title: "No Fees",
        description: "There are no fees to withdraw",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      await onWithdrawFees();
      toast({
        title: "Fees Withdrawn",
        description: `Successfully withdrew ${feesCollected} tokens in fees`,
      });
    } catch (error) {
      toast({
        title: "Withdrawal Failed",
        description: "Failed to withdraw fees. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDepositFunds = async () => {
    if (!depositPlayerId || !depositAmount) {
      toast({
        title: "Missing Information",
        description: "Please enter both player ID and amount",
        variant: "destructive"
      });
      return;
    }

    const amount = parseFloat(depositAmount);
    if (amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid positive amount",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      await onDepositFunds(depositPlayerId, amount);
      setDepositPlayerId('');
      setDepositAmount('');
      toast({
        title: "Funds Deposited",
        description: `Deposited ${amount} tokens to player ${depositPlayerId}`,
      });
    } catch (error) {
      toast({
        title: "Deposit Failed",
        description: "Failed to deposit funds. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="gradient-card animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Admin Panel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="resolution">Resolution</TabsTrigger>
            <TabsTrigger value="funds">Funds</TabsTrigger>
            <TabsTrigger value="fees">Fees</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <TrendingUp className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <div className="font-semibold">{MarketCalculations.formatNumber(totalVolume)}</div>
                <div className="text-sm text-muted-foreground">Total Volume</div>
              </div>
              
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <DollarSign className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <div className="font-semibold">{MarketCalculations.formatNumber(totalLiquidity)}</div>
                <div className="text-sm text-muted-foreground">Liquidity</div>
              </div>
              
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <Award className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <div className="font-semibold">{MarketCalculations.formatNumber(feesCollected)}</div>
                <div className="text-sm text-muted-foreground">Fees Collected</div>
              </div>
              
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <Users className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <div className="font-semibold">--</div>
                <div className="text-sm text-muted-foreground">Active Users</div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="font-semibold">Market Status</h3>
              <div className="flex items-center justify-between">
                <span>Current Status:</span>
                <Badge variant={market.resolved ? "destructive" : "default"}>
                  {market.resolved ? "Resolved" : "Active"}
                </Badge>
              </div>
              {market.resolved && (
                <div className="flex items-center justify-between">
                  <span>Resolution Outcome:</span>
                  <Badge 
                    variant="outline"
                    className={market.outcome ? 'border-bull-500 text-bull-600' : 'border-bear-500 text-bear-600'}
                  >
                    {market.outcome ? 'YES' : 'NO'}
                  </Badge>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="resolution" className="space-y-4">
            <div className="space-y-4">
              <h3 className="font-semibold">Market Resolution</h3>
              
              {market.resolved ? (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span>Market Status:</span>
                    <Badge variant="destructive">Resolved</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Winning Outcome:</span>
                    <Badge 
                      variant="outline"
                      className={market.outcome ? 'border-bull-500 text-bull-600' : 'border-bear-500 text-bear-600'}
                    >
                      {market.outcome ? 'YES' : 'NO'}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-muted-foreground">
                    Resolve the market by selecting the winning outcome. This action cannot be undone.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => handleResolveMarket(true)}
                      disabled={isLoading}
                      className="price-gradient-yes hover:opacity-90"
                    >
                      Resolve YES
                    </Button>
                    <Button
                      onClick={() => handleResolveMarket(false)}
                      disabled={isLoading}
                      className="price-gradient-no hover:opacity-90"
                    >
                      Resolve NO
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="funds" className="space-y-4">
            <div className="space-y-4">
              <h3 className="font-semibold">Player Fund Management</h3>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="playerId">Player ID</Label>
                  <Input
                    id="playerId"
                    placeholder="Enter player ID"
                    value={depositPlayerId}
                    onChange={(e) => setDepositPlayerId(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="depositAmount">Amount to Deposit</Label>
                  <Input
                    id="depositAmount"
                    type="number"
                    placeholder="Enter amount"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                  />
                </div>
                
                <Button
                  onClick={handleDepositFunds}
                  disabled={!depositPlayerId || !depositAmount || isLoading}
                  className="w-full"
                >
                  {isLoading ? "Processing..." : "Deposit Funds"}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="fees" className="space-y-4">
            <div className="space-y-4">
              <h3 className="font-semibold">Fee Management</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Total Fees Collected:</span>
                  <span className="font-semibold text-lg">
                    {feesCollected.toLocaleString()} tokens
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span>Fee Rate:</span>
                  <span className="font-medium">1.0%</span>
                </div>
                
                <Separator />
                
                <Button
                  onClick={handleWithdrawFees}
                  disabled={feesCollected === 0 || isLoading}
                  className="w-full"
                  variant={feesCollected > 0 ? "default" : "outline"}
                >
                  {isLoading ? "Processing..." : 
                   feesCollected === 0 ? "No Fees Available" : 
                   `Withdraw ${feesCollected.toLocaleString()} Tokens`}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AdminPanel;
