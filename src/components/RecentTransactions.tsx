import { Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useMarket } from '../contexts/MarketContext';
import { TransactionData } from '../types/market';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const RecentTransactions = () => {
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { api, globalState } = useMarket();

  const fetchTransactions = async (showLoading = true) => {
    if (!api) {
      console.log('API not ready yet');
      return;
    }
    
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      // Use market ID from the context - get it from URL or market data
      const marketIdFromUrl = window.location.pathname.split('/')[1];
      if (marketIdFromUrl) {
        console.log('Fetching transactions for market:', marketIdFromUrl);
        const recentTransactions = await api.getMarketRecentTransactions(marketIdFromUrl);
        console.log("Recent 20 transactions for market:", marketIdFromUrl, recentTransactions);
        setTransactions(recentTransactions || []);
      } else {
        console.log('No market ID found in URL');
        setError('No market ID found in URL');
      }
    } catch (err) {
      console.error('Failed to fetch recent transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Fetch transactions when API is ready
  useEffect(() => {
    if (api) {
      fetchTransactions(false); // Don't show loading for initial load
    }
  }, [api]);

  // Also fetch when global counter changes (for real-time updates)
  useEffect(() => {
    if (api && globalState?.counter !== undefined) {
      fetchTransactions(false); // Don't show loading for background updates
    }
  }, [globalState?.counter]);

  const getTransactionTypeLabel = (transactionType: string) => {
    switch (transactionType) {
      case 'BET_YES':
        return { label: 'Buy YES', color: 'bg-green-500' };
      case 'BET_NO':
        return { label: 'Buy NO', color: 'bg-red-500' };
      case 'SELL_YES':
        return { label: 'Sell YES', color: 'bg-green-400' };
      case 'SELL_NO':
        return { label: 'Sell NO', color: 'bg-red-400' };
      default:
        return { label: transactionType, color: 'bg-gray-500' };
    }
  };

  const formatAmount = (amount: string) => {
    try {
      const num = parseFloat(amount);
      return num.toLocaleString();
    } catch {
      return amount;
    }
  };

  const formatShares = (shares: string) => {
    try {
      const num = parseFloat(shares);
      return num.toFixed(2);
    } catch {
      return shares;
    }
  };

  const formatAddress = (pid: string[]) => {
    if (pid.length >= 2) {
      return `${pid[0].slice(0, 4)}...${pid[1].slice(-4)}`;
    }
    return pid[0] || 'Unknown';
  };

  // Only show loading if we have no data and are actually loading
  if (loading && transactions.length === 0 && !error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Recent Transactions
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Recent Transactions
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fetchTransactions(true)}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500 py-4">
            Error: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Recent Transactions ({transactions.length})
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchTransactions(true)}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            {loading ? 'Loading transactions...' : 'No recent transactions found'}
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {transactions.map((tx, index) => {
              const typeInfo = getTransactionTypeLabel(tx.transactionType);
              return (
                <div 
                  key={`${tx.index}-${index}`}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge className={`${typeInfo.color} text-white`}>
                      {typeInfo.label}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      {formatAddress(tx.pid)}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-medium">
                      {formatAmount(tx.amount)} tokens
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatShares(tx.shares)} shares
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Counter #{tx.counter}
                    </div>
                  </div>
                </div>
              );
            })}
            {/* Show subtle loading indicator if updating in background */}
            {loading && transactions.length > 0 && (
              <div className="text-center text-xs text-muted-foreground py-2">
                <RefreshCw className="h-3 w-3 animate-spin inline mr-1" />
                Updating...
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
  };
  
export default RecentTransactions; 