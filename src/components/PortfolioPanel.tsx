import { Award, DollarSign, Minus, Plus, TrendingUp, Wallet } from 'lucide-react';
import React, { useState } from 'react';
import { useToast } from '../hooks/use-toast';
import { MarketData, PlayerData } from '../types/market';
import { MarketCalculations } from '../utils/market-calculations';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';

interface PortfolioPanelProps {
  market: MarketData;
  playerData: PlayerData;
  onClaim: () => void;
  onWithdraw: (amount: number) => void;
  onDeposit: (amount: number) => void;
}

const PortfolioPanel: React.FC<PortfolioPanelProps> = ({ 
  market, 
  playerData, 
  onClaim, 
  onWithdraw,
  onDeposit 
}) => {
  const { toast } = useToast();
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  
  const balance = Number(playerData.data.balance);
  const yesShares = Number(playerData.data.yes_shares);
  const noShares = Number(playerData.data.no_shares);
  const claimed = playerData.data.claimed;

  // Provide default values to handle undefined market data
  const yesLiquidity = BigInt(market.yes_liquidity || 0);
  const noLiquidity = BigInt(market.no_liquidity || 0);
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

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    
    if (!withdrawAmount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount to withdraw",
        variant: "destructive"
      });
      return;
    }

    if (amount > balance) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough balance to withdraw this amount",
        variant: "destructive"
      });
      return;
    }

    try {
      await onWithdraw(amount);
      setWithdrawAmount('');
      setWithdrawDialogOpen(false);
      toast({
        title: "Withdrawal Initiated",
        description: `Withdrawing ${amount} tokens`,
      });
    } catch (error) {
      toast({
        title: "Withdrawal Failed",
        description: "Failed to initiate withdrawal. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    
    if (!depositAmount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount to deposit",
        variant: "destructive"
      });
      return;
    }

    try {
      await onDeposit(amount);
      setDepositAmount('');
      setDepositDialogOpen(false);
      toast({
        title: "Deposit Initiated",
        description: `Depositing ${amount} tokens`,
      });
    } catch (error) {
      toast({
        title: "Deposit Failed",
        description: "Failed to initiate deposit. Please try again.",
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

        {/* Fund Management */}
        <>
          <Separator />
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Fund Management
            </h3>
            
            <div className="flex gap-3">
              {/* Deposit Dialog */}
              <Dialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex-1 price-gradient-yes hover:opacity-90">
                    <Plus className="h-4 w-4 mr-2" />
                    Deposit
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      Deposit Funds
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="depositAmount">Amount to Deposit</Label>
                      <Input
                        id="depositAmount"
                        type="number"
                        placeholder="Enter amount"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="text-lg"
                      />
                      <div className="text-sm text-muted-foreground">
                        Add funds to your trading balance
                      </div>
                    </div>
                    
                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setDepositAmount('');
                          setDepositDialogOpen(false);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleDeposit}
                        disabled={!depositAmount || parseFloat(depositAmount) <= 0}
                        className="flex-1 price-gradient-yes hover:opacity-90"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Deposit {depositAmount ? `${depositAmount}` : 'Funds'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Withdraw Dialog */}
              <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    disabled={balance <= 0}
                  >
                    <Minus className="h-4 w-4 mr-2" />
                    Withdraw
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Minus className="h-5 w-5" />
                      Withdraw Funds
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="withdrawAmount">Amount to Withdraw</Label>
                      <Input
                        id="withdrawAmount"
                        type="number"
                        placeholder="Enter amount"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="text-lg"
                        max={balance}
                      />
                      <div className="text-sm text-muted-foreground">
                        Available balance: {balance.toLocaleString()} tokens
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setWithdrawAmount((balance * 0.25).toString())}
                      >
                        25%
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setWithdrawAmount((balance * 0.5).toString())}
                      >
                        50%
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setWithdrawAmount((balance * 0.75).toString())}
                      >
                        75%
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setWithdrawAmount(balance.toString())}
                      >
                        Max
                      </Button>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setWithdrawAmount('');
                          setWithdrawDialogOpen(false);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleWithdraw}
                        disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > balance}
                        variant="outline"
                        className="flex-1"
                      >
                        <Minus className="h-4 w-4 mr-2" />
                        Withdraw {withdrawAmount ? `${withdrawAmount}` : 'Funds'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </>
      </CardContent>
    </Card>
  );
};

export default PortfolioPanel;
