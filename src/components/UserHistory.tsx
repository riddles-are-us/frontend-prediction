import { Clock, TrendingDown, TrendingUp } from 'lucide-react';
import React, { useEffect } from 'react';
import { useMarket } from '../contexts/MarketContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const UserHistory: React.FC = () => {
  const { userHistory, loadUserHistory, api, playerId } = useMarket();

  // Load user history when component mounts
  useEffect(() => {
    if (api && playerId) {
      loadUserHistory();
    }
  }, [api, playerId]);

  const formatBetType = (betType: number) => {
    if (betType === 11) return 'Sell YES';
    if (betType === 12) return 'Sell NO';
    return betType === 1 ? 'Bet YES' : 'Bet NO';
  };

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    return num.toLocaleString();
  };

  const getBetTypeIcon = (betType: number) => {
    // For sell transactions (11, 12), use different logic
    if (betType === 11) return <TrendingDown className="h-4 w-4 text-green-500" />; // Sell YES
    if (betType === 12) return <TrendingDown className="h-4 w-4 text-red-500" />; // Sell NO
    
    // For bet transactions (0, 1)
    return betType === 1 ? 
      <TrendingUp className="h-4 w-4 text-green-500" /> : 
      <TrendingUp className="h-4 w-4 text-red-500" />;
  };

  const getBetTypeColor = (betType: number) => {
    // For sell transactions
    if (betType === 11) return 'text-green-600'; // Sell YES
    if (betType === 12) return 'text-red-600';   // Sell NO
    
    // For bet transactions
    return betType === 1 ? 'text-green-600' : 'text-red-600';
  };

  const getTransactionAction = (betType: number) => {
    if (betType === 11 || betType === 12) return 'Sell';
    return 'Bet';
  };

  const getTransactionType = (betType: number) => {
    if (betType === 11) return 'YES';
    if (betType === 12) return 'NO';
    return betType === 1 ? 'YES' : 'NO';
  };

  if (!userHistory || userHistory.data.length === 0) {
    return (
      <Card className="gradient-card animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No transactions yet</p>
            <p className="text-sm">Your betting history will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gradient-card animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Transactions
          </div>
          <div className="text-sm text-muted-foreground">
            {userHistory.count} total transactions
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {userHistory.data.map((transaction, index) => (
            <div
              key={transaction.index}
              className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/50 hover:bg-background/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                {getBetTypeIcon(transaction.betType)}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{getTransactionAction(transaction.betType)}</span>
                    <span className={`font-semibold ${getBetTypeColor(transaction.betType)}`}>
                      {getTransactionType(transaction.betType)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Counter #{transaction.counter}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-semibold">
                  {formatAmount(transaction.amount)} tokens
                </div>
                <div className="text-sm text-muted-foreground">
                  {transaction.betType === 11 || transaction.betType === 12 ? (
                    `← ${formatAmount(transaction.shares)} shares`
                  ) : (
                    `→ ${formatAmount(transaction.shares)} shares`
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {userHistory.data.length === 10 && (
          <div className="mt-4 text-center">
            <button
              onClick={loadUserHistory}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Showing last 10 transactions • Click to refresh
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserHistory; 