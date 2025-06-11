
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { MarketData, PlayerData } from '../types/market';
import { MarketCalculations } from '../utils/market-calculations';
import { useToast } from '@/hooks/use-toast';

interface TradingPanelProps {
  market: MarketData;
  playerData: PlayerData;
  onTrade: (type: 'BUY' | 'SELL', betType: 0 | 1, amount: number) => void;
}

const TradingPanel: React.FC<TradingPanelProps> = ({ market, playerData, onTrade }) => {
  const [buyAmount, setBuyAmount] = useState('');
  const [sellShares, setSellShares] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<'YES' | 'NO'>('YES');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const yesLiquidity = BigInt(market.yes_liquidity);
  const noLiquidity = BigInt(market.no_liquidity);
  const balance = Number(playerData.data.balance);
  const yesShares = Number(playerData.data.yes_shares);
  const noShares = Number(playerData.data.no_shares);

  const prices = MarketCalculations.calculatePrices(yesLiquidity, noLiquidity);
  
  // Calculate trading preview
  const buyAmountNum = parseFloat(buyAmount) || 0;
  const sellSharesNum = parseFloat(sellShares) || 0;
  const betType = selectedPosition === 'YES' ? 1 : 0;

  const sharesReceived = buyAmountNum > 0 ? 
    MarketCalculations.calculateSharesForBet(betType, buyAmountNum, yesLiquidity, noLiquidity) : 0;
  
  const sellAmount = sellSharesNum > 0 ? 
    MarketCalculations.calculateAmountForShares(betType, sellSharesNum, yesLiquidity, noLiquidity) : 0;

  const buyImpact = buyAmountNum > 0 ? 
    MarketCalculations.calculateMarketImpact(betType, buyAmountNum, yesLiquidity, noLiquidity) : null;

  const fees = buyAmountNum > 0 ? MarketCalculations.calculateFees(buyAmountNum) : 0;

  const handleBuy = async () => {
    if (!buyAmount || buyAmountNum <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount to buy",
        variant: "destructive"
      });
      return;
    }

    if (buyAmountNum > balance) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough balance for this trade",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      await onTrade('BUY', betType, buyAmountNum);
      setBuyAmount('');
      toast({
        title: "Trade Submitted",
        description: `Buying ${selectedPosition} shares for ${buyAmountNum} tokens`,
      });
    } catch (error) {
      toast({
        title: "Trade Failed",
        description: "Failed to submit trade. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSell = async () => {
    if (!sellShares || sellSharesNum <= 0) {
      toast({
        title: "Invalid Shares",
        description: "Please enter a valid number of shares to sell",
        variant: "destructive"
      });
      return;
    }

    const availableShares = selectedPosition === 'YES' ? yesShares : noShares;
    if (sellSharesNum > availableShares) {
      toast({
        title: "Insufficient Shares",
        description: `You only have ${availableShares} ${selectedPosition} shares`,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      await onTrade('SELL', betType, sellSharesNum);
      setSellShares('');
      toast({
        title: "Sell Order Submitted",
        description: `Selling ${sellSharesNum} ${selectedPosition} shares`,
      });
    } catch (error) {
      toast({
        title: "Sell Failed",
        description: "Failed to submit sell order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const quickBuyAmounts = [100, 500, 1000, 2500];

  return (
    <Card className="gradient-card animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Trading Panel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="buy" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buy">Buy Shares</TabsTrigger>
            <TabsTrigger value="sell">Sell Shares</TabsTrigger>
          </TabsList>

          <TabsContent value="buy" className="space-y-4">
            {/* Position Selection */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={selectedPosition === 'YES' ? "default" : "outline"}
                className={selectedPosition === 'YES' ? "price-gradient-yes text-white" : ""}
                onClick={() => setSelectedPosition('YES')}
              >
                YES ({MarketCalculations.formatPrice(prices.yesPrice)})
              </Button>
              <Button
                variant={selectedPosition === 'NO' ? "default" : "outline"}
                className={selectedPosition === 'NO' ? "price-gradient-no text-white" : ""}
                onClick={() => setSelectedPosition('NO')}
              >
                NO ({MarketCalculations.formatPrice(prices.noPrice)})
              </Button>
            </div>

            {/* Quick Buy Amounts */}
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Quick Amounts</Label>
              <div className="grid grid-cols-4 gap-2">
                {quickBuyAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => setBuyAmount(amount.toString())}
                    disabled={amount > balance}
                  >
                    {amount}
                  </Button>
                ))}
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="buyAmount">Amount to Spend</Label>
              <Input
                id="buyAmount"
                type="number"
                placeholder="Enter amount"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                className="text-lg"
              />
              <div className="text-sm text-muted-foreground">
                Balance: {balance.toLocaleString()} tokens
              </div>
            </div>

            {/* Trade Preview */}
            {buyAmountNum > 0 && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between">
                  <span>Shares Received:</span>
                  <span className="font-medium">{sharesReceived.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Effective Price:</span>
                  <span className="font-medium">
                    {MarketCalculations.formatPrice(buyAmountNum / sharesReceived)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Fee (1%):</span>
                  <span className="font-medium">{fees} tokens</span>
                </div>
                {buyImpact && buyImpact.slippage > 0.02 && (
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">
                      High slippage: {(buyImpact.slippage * 100).toFixed(2)}%
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total Cost:</span>
                  <span>{(buyAmountNum + fees).toFixed(2)} tokens</span>
                </div>
              </div>
            )}

            <Button 
              onClick={handleBuy}
              disabled={!buyAmount || buyAmountNum <= 0 || buyAmountNum > balance || isLoading}
              className="w-full price-gradient-yes hover:opacity-90"
            >
              {isLoading ? "Processing..." : `Buy ${selectedPosition} Shares`}
            </Button>
          </TabsContent>

          <TabsContent value="sell" className="space-y-4">
            {/* Position Selection for Selling */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={selectedPosition === 'YES' ? "default" : "outline"}
                className={selectedPosition === 'YES' ? "price-gradient-yes text-white" : ""}
                onClick={() => setSelectedPosition('YES')}
                disabled={yesShares === 0}
              >
                YES ({yesShares} shares)
              </Button>
              <Button
                variant={selectedPosition === 'NO' ? "default" : "outline"}
                className={selectedPosition === 'NO' ? "price-gradient-no text-white" : ""}
                onClick={() => setSelectedPosition('NO')}
                disabled={noShares === 0}
              >
                NO ({noShares} shares)
              </Button>
            </div>

            {/* Shares Input */}
            <div className="space-y-2">
              <Label htmlFor="sellShares">Shares to Sell</Label>
              <Input
                id="sellShares"
                type="number"
                placeholder="Enter shares"
                value={sellShares}
                onChange={(e) => setSellShares(e.target.value)}
                className="text-lg"
                max={selectedPosition === 'YES' ? yesShares : noShares}
              />
              <div className="text-sm text-muted-foreground">
                Available: {selectedPosition === 'YES' ? yesShares : noShares} {selectedPosition} shares
              </div>
            </div>

            {/* Quick Sell Options */}
            {(selectedPosition === 'YES' ? yesShares : noShares) > 0 && (
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Quick Sell</Label>
                <div className="grid grid-cols-4 gap-2">
                  {[25, 50, 75, 100].map((percentage) => {
                    const maxShares = selectedPosition === 'YES' ? yesShares : noShares;
                    const sharesToSell = Math.floor(maxShares * percentage / 100);
                    return (
                      <Button
                        key={percentage}
                        variant="outline"
                        size="sm"
                        onClick={() => setSellShares(sharesToSell.toString())}
                        disabled={sharesToSell === 0}
                      >
                        {percentage}%
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sell Preview */}
            {sellSharesNum > 0 && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between">
                  <span>Shares to Sell:</span>
                  <span className="font-medium">{sellSharesNum}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount Received:</span>
                  <span className="font-medium">{sellAmount.toFixed(2)} tokens</span>
                </div>
                <div className="flex justify-between">
                  <span>Effective Price:</span>
                  <span className="font-medium">
                    {MarketCalculations.formatPrice(sellAmount / sellSharesNum)}
                  </span>
                </div>
              </div>
            )}

            <Button 
              onClick={handleSell}
              disabled={!sellShares || sellSharesNum <= 0 || isLoading}
              className="w-full price-gradient-no hover:opacity-90"
            >
              {isLoading ? "Processing..." : `Sell ${selectedPosition} Shares`}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TradingPanel;
