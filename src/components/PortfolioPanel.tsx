
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Wallet, TrendingUp, TrendingDown, Award, DollarSign } from 'lucide-react';
import { MarketData, PlayerData } from '../types/market';
import { MarketCalculations } from '../utils/market-calculations';
import { useToast } from '@/hooks/use-toast';

interface PortfolioPanelProps {
  market: MarketData;
  playerData: PlayerData;
  onClaim: () => void;
  onWithdraw: (amount: number) => void;
}

const PortfolioPanel: React.FC<PortfolioPanelProps> = ({ 
  market, 
  playerData, 
  onClaim, 
  onWithdraw 
}) => {
  const { toast } = useToast();
  
  const balance = Number(playerData.data.balance);
  const yesShares = Number(playerData.data.yes_shares);
  const noShares = Number(playerData.data.no_shares);
  const claimed = playerData.data.claimed;

  const yesLiquidity = BigInt(market.yes_liquidity);
  const noLiquidity = BigInt(market.no_liquidity);
  const prices = MarketCalculations.calculatePrices(yesLiquidity, noLiquidity);

  // Calculate current position value
  const yesValue = yesShares * prices.yesPrice;
  const noValue = noShares * prices.noPrice;
  const totalPortfolioValue = balance + yesValue + noValue;

  // Calculate potential winnings if market resolves
  const potentialYesWinnings = market.resolved && market.outcome ? yesShares : 0;
  const potentialNoWinnings = market.resolved && !market.outcome ? noShares : 0;
  const totalPotentialWinnings = potentialYesWinnings + potentialNoWinnings;

  // Position breakdown
  const positions = [
    {
      type: 'YES' as const,
      shares: yesShares,
      currentValue: yesValue,
      currentPrice: prices.yesPrice,
      color: 'bull'
    },
    {
      type: 'NO' as const,
      shares: noShares,
      currentValue: noValue,
      currentPrice: prices.noPrice,
      color: 'bear'
    }
  ];

  const handleClaimWinnings = async () => {
    if (!market.resolved) {
      toast({
        title: "Market Not Resolved",
        description: "Wait for the market to be resolved before claiming",
        variant: "destructive"
      });
      return;
    }

    if (claimed) {
      toast({
        title: "Already Claimed",
        description: "You have already claimed your winnings",
        variant: "destructive"
      });
      return;
    }

    if (totalPotentialWinnings === 0) {
      toast({
        title: "No Winnings",
        description: "You don't have any winning positions to claim",
        variant: "destructive"
      });
      return;
    }

    try {
      await onClaim();
      toast({
        title: "Winnings Claimed!",
        description: `Successfully claimed ${totalPotentialWinnings} tokens`,
      });
    } catch (error) {
      toast({
        title: "Claim Failed",
        description: "Failed to claim winnings. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleWithdrawAll = async () => {
    if (balance === 0) {
      toast({
        title: "No Balance",
        description: "You don't have any balance to withdraw",
        variant: "destructive"
      });
      return;
    }

    try {
      await onWithdraw(balance);
      toast({
        title: "Withdrawal Initiated",
        description: `Withdrawing ${balance} tokens`,
      });
    } catch (error) {
      toast({
        title: "Withdrawal Failed",
        description: "Failed to initiate withdrawal. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="gradient-card animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Portfolio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Balance Overview */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Available Balance</span>
            <span className="text-2xl font-bold">{balance.toLocaleString()} tokens</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Portfolio Value</span>
            <span className="text-lg font-semibold">
              {totalPortfolioValue.toFixed(2)} tokens
            </span>
          </div>
        </div>

        <Separator />

        {/* Current Positions */}
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Current Positions
          </h3>
          
          {positions.map(({ type, shares, currentValue, currentPrice, color }) => (
            shares > 0 && (
              <div key={type} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={`${color === 'bull' ? 'border-bull-500 text-bull-600' : 'border-bear-500 text-bear-600'}`}
                    >
                      {type}
                    </Badge>
                    <span className="font-medium">{shares.toLocaleString()} shares</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{currentValue.toFixed(2)} tokens</div>
                    <div className="text-sm text-muted-foreground">
                      @ {MarketCalculations.formatPrice(currentPrice)}
                    </div>
                  </div>
                </div>
                <Progress 
                  value={(currentValue / totalPortfolioValue) * 100} 
                  className="h-2"
                />
              </div>
            )
          ))}

          {yesShares === 0 && noShares === 0 && (
            <p className="text-muted-foreground text-center py-4">
              No active positions
            </p>
          )}
        </div>

        {/* Market Resolution & Claims */}
        {market.resolved && (
          <>
            <Separator />
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Award className="h-4 w-4" />
                Market Resolution
              </h3>
              
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span>Winning Outcome:</span>
                  <Badge 
                    variant="outline"
                    className={market.outcome ? 'border-bull-500 text-bull-600' : 'border-bear-500 text-bear-600'}
                  >
                    {market.outcome ? 'YES' : 'NO'}
                  </Badge>
                </div>
                
                {totalPotentialWinnings > 0 && (
                  <div className="flex justify-between items-center mb-3">
                    <span>Your Winnings:</span>
                    <span className="font-bold text-lg">
                      {totalPotentialWinnings.toLocaleString()} tokens
                    </span>
                  </div>
                )}

                <Button
                  onClick={handleClaimWinnings}
                  disabled={claimed || totalPotentialWinnings === 0}
                  className="w-full price-gradient-yes hover:opacity-90"
                >
                  {claimed ? 'Already Claimed' : 
                   totalPotentialWinnings === 0 ? 'No Winnings' : 
                   `Claim ${totalPotentialWinnings} Tokens`}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Withdrawal */}
        {balance > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Withdraw Funds
              </h3>
              <Button
                onClick={handleWithdrawAll}
                variant="outline"
                className="w-full"
              >
                Withdraw All ({balance.toLocaleString()} tokens)
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PortfolioPanel;
