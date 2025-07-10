import { AlertTriangle, TrendingUp, Clock } from 'lucide-react';
import React, { useState } from 'react';
import { useToast } from '../hooks/use-toast';
import { MarketData, PlayerData } from '../types/market';
import { MarketCalculations, MarketStatus } from '../utils/market-calculations';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';

interface TradingPanelProps {
  market: MarketData;
  playerData: PlayerData;
  onTrade: (type: 'BUY' | 'SELL', betType: 0 | 1, amount: number) => void;
}

const TradingPanel: React.FC<TradingPanelProps> = ({ market, playerData, onTrade }) => {
  const { toast } = useToast();
  const [buyAmount, setBuyAmount] = useState('');
  const [sellShares, setSellShares] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<'YES' | 'NO'>('YES');
  const [isLoading, setIsLoading] = useState(false);

  // Check market status for trading eligibility
  const marketStatus = market.market_status as MarketStatus;
  const canTrade = marketStatus === MarketStatus.ACTIVE_TRADING;
  const isWaitingToStart = marketStatus === MarketStatus.WAIT_START;
  const isWaitingResolution = marketStatus === MarketStatus.WAIT_RESOLUTION;
  const isPendingResolution = marketStatus === MarketStatus.PENDING_RESOLUTION;
  const isResolved = market.resolved || marketStatus === MarketStatus.RESOLVED;

  // Provide default values to handle undefined market data
  const yesLiquidity = BigInt(market.yes_liquidity || 0);
  const noLiquidity = BigInt(market.no_liquidity || 0);
  const balance = Number(playerData.data.balance);
  const yesShares = Number(playerData.data.yes_shares);
  const noShares = Number(playerData.data.no_shares);

  const prices = MarketCalculations.calculatePrices(yesLiquidity, noLiquidity);
  
  // Calculate effective prices
  const testAmount = 100; // Small test amount
  const yesEffectivePrice = MarketCalculations.getBuyPrice(1, testAmount, yesLiquidity, noLiquidity);
  const noEffectivePrice = MarketCalculations.getBuyPrice(0, testAmount, yesLiquidity, noLiquidity);

  // Calculate trading preview
  const buyAmountNum = parseFloat(buyAmount) || 0;
  const sellSharesNum = parseFloat(sellShares) || 0;
  const betType = selectedPosition === 'YES' ? 1 : 0;

  // Calculate fees first (1% of total amount)
  const fees = buyAmountNum > 0 ? MarketCalculations.calculateFees(buyAmountNum) : 0;
  
  // Amount actually used for buying shares (after deducting fees)
  const amountAfterFees = buyAmountNum - fees;

  const sharesReceived = amountAfterFees > 0 ? 
    MarketCalculations.calculateSharesForBet(betType, amountAfterFees, yesLiquidity, noLiquidity) : 0;
  
  const sellAmount = sellSharesNum > 0 ? 
    MarketCalculations.calculateAmountForShares(betType, sellSharesNum, yesLiquidity, noLiquidity) : 0;

  // Calculate fees for selling (1% of the gross amount)
  const sellFees = sellAmount > 0 ? MarketCalculations.calculateFees(sellAmount) : 0;
  
  // Net amount after deducting fees
  const sellAmountAfterFees = sellAmount - sellFees;

  const buyImpact = amountAfterFees > 0 ? 
    MarketCalculations.calculateMarketImpact(betType, amountAfterFees, yesLiquidity, noLiquidity) : null;

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

    if (amountAfterFees <= 0) {
      toast({
        title: "Amount Too Small",
        description: "Amount after fees must be greater than 0",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Pass the total amount (including fees) to the backend
      // The backend will handle fee deduction internally
      await onTrade('BUY', betType, buyAmountNum);
      setBuyAmount('');
      toast({
        title: "Trade Submitted",
        description: `Buying ${selectedPosition} shares for ${buyAmountNum} tokens (${amountAfterFees.toFixed(2)} + ${fees.toFixed(2)} fee)`,
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
        description: `Selling ${sellSharesNum} ${selectedPosition} shares for ${sellAmountAfterFees.toFixed(2)} tokens (${sellAmount.toFixed(2)} - ${sellFees.toFixed(2)} fee)`,
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

  const quickBuyAmounts = [10000, 50000, 100000, 250000];

  return (
    <Card className="gradient-card animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Trading Panel
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Market Status Alert */}
        {!canTrade && (
          <Alert className="mb-4">
            <Clock className="h-4 w-4" />
            <AlertDescription>
              {isWaitingToStart && (
                <>Trading has not started yet. Trading will begin in {market.time_remaining}.</>
              )}
              {isWaitingResolution && (
                <>Trading has ended. Waiting for market resolution in {market.time_remaining}.</>
              )}
              {isPendingResolution && (
                <>Trading has ended. Market is awaiting resolution.</>
              )}
              {isResolved && (
                <>This market has been resolved. No more trading is allowed.</>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="buy" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buy" disabled={!canTrade}>Buy Shares</TabsTrigger>
            <TabsTrigger value="sell" disabled={!canTrade}>Sell Shares</TabsTrigger>
          </TabsList>

          <TabsContent value="buy" className="space-y-4">
            {/* Position Selection */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={selectedPosition === 'YES' ? "default" : "outline"}
                className={selectedPosition === 'YES' ? "price-gradient-yes text-white" : ""}
                onClick={() => setSelectedPosition('YES')}
                disabled={!canTrade}
              >
                YES
              </Button>
              <Button
                variant={selectedPosition === 'NO' ? "default" : "outline"}
                className={selectedPosition === 'NO' ? "price-gradient-no text-white" : ""}
                onClick={() => setSelectedPosition('NO')}
                disabled={!canTrade}
              >
                NO
              </Button>
            </div>

            {/* Price Note */}
            <div className="text-sm text-muted-foreground italic">
              Note: Current price is theoretical. Actual trading price may vary due to slippage.
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
                    disabled={!canTrade || amount > balance}
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
                placeholder={canTrade ? "Enter amount" : "Trading not available"}
                value={buyAmount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBuyAmount(e.target.value)}
                className="text-lg"
                disabled={!canTrade}
              />
              <div className="text-sm text-muted-foreground">
                Balance: {balance.toLocaleString()} tokens
              </div>
            </div>

            {/* Trade Preview */}
            {buyAmountNum > 0 && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between">
                  <span>Amount for Shares:</span>
                  <span className="font-medium">{amountAfterFees.toFixed(2)} tokens</span>
                </div>
                <div className="flex justify-between">
                  <span>Shares Received:</span>
                  <span className="font-medium">{sharesReceived.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Effective Price:</span>
                  <span className="font-medium">
                    {sharesReceived > 0 ? (amountAfterFees / sharesReceived).toFixed(3) : "0"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Fee (1%):</span>
                  <span className="font-medium">{fees.toFixed(2)} tokens</span>
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
                  <span>{buyAmountNum.toFixed(2)} tokens</span>
                </div>
              </div>
            )}

            <Button 
              onClick={handleBuy}
              disabled={!canTrade || !buyAmount || buyAmountNum <= 0 || buyAmountNum > balance || amountAfterFees <= 0 || isLoading}
              className="w-full price-gradient-yes hover:opacity-90"
            >
              {isLoading ? "Processing..." : 
               !canTrade ? "Trading Not Available" : 
               `Buy ${selectedPosition} Shares`}
            </Button>
          </TabsContent>

          <TabsContent value="sell" className="space-y-4">
            {/* Position Selection for Selling */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={selectedPosition === 'YES' ? "default" : "outline"}
                className={selectedPosition === 'YES' ? "price-gradient-yes text-white" : ""}
                onClick={() => setSelectedPosition('YES')}
                disabled={!canTrade || yesShares === 0}
              >
                YES ({yesShares} shares)
              </Button>
              <Button
                variant={selectedPosition === 'NO' ? "default" : "outline"}
                className={selectedPosition === 'NO' ? "price-gradient-no text-white" : ""}
                onClick={() => setSelectedPosition('NO')}
                disabled={!canTrade || noShares === 0}
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
                placeholder={canTrade ? "Enter shares" : "Trading not available"}
                value={sellShares}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSellShares(e.target.value)}
                className="text-lg"
                max={selectedPosition === 'YES' ? yesShares : noShares}
                disabled={!canTrade}
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
                        disabled={!canTrade || sharesToSell === 0}
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
                  <span>Gross Amount:</span>
                  <span className="font-medium">{sellAmount.toFixed(2)} tokens</span>
                </div>
                <div className="flex justify-between">
                  <span>Effective Price:</span>
                  <span className="font-medium">
                    {sellSharesNum > 0 ? (sellAmount / sellSharesNum).toFixed(3) : "0"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Fee (1%):</span>
                  <span className="font-medium">{sellFees.toFixed(2)} tokens</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Amount Received:</span>
                  <span>{sellAmountAfterFees.toFixed(2)} tokens</span>
                </div>
              </div>
            )}

            <Button 
              onClick={handleSell}
              disabled={!canTrade || !sellShares || sellSharesNum <= 0 || isLoading}
              className="w-full price-gradient-no hover:opacity-90"
            >
              {isLoading ? "Processing..." : 
               !canTrade ? "Trading Not Available" : 
               `Sell ${selectedPosition} Shares`}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TradingPanel;
