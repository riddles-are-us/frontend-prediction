import { bnToHexLe } from 'delphinus-curves/src/altjubjub';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { LeHexBN } from 'zkwasm-minirollup-rpc';
import { useToast } from '../hooks/use-toast';
import PredictionMarketAPI from '../services/api';
import { ChartDataPoint, MarketData, PlayerData, UserHistoryResponse } from '../types/market';
import { MarketCalculations } from '../utils/market-calculations';
import { getWithdrawTransactionCommandArray, sendTransaction } from '../utils/transaction';
import { useWallet } from './WalletContext';
import { getRpcUrl } from 'zkwasm-minirollup-browser';

interface GlobalState {
  counter: number;
  market_ids: number[];
  next_market_id: number;
  total_players: number;
  txsize: number;
  txcounter: number;
}

interface MarketContextType {
  marketId: string | null;
  marketData: MarketData | null;
  playerData: PlayerData | null;
  chartData: ChartDataPoint[];
  userHistory: UserHistoryResponse | null;
  playerId: [string, string] | null;
  globalState: GlobalState | null;
  isLoading: boolean;
  isRefreshing: boolean;
  api: PredictionMarketAPI | null;
  initializeAPI: () => void;
  installPlayer: () => Promise<void>;
  placeBet: (betType: number, amount: string) => Promise<void>;
  sellShares: (betType: number, amount: string) => Promise<void>;
  claimWinnings: () => Promise<void>;
  resolveMarket: (outcome: boolean) => Promise<void>;
  withdrawFees: () => Promise<void>;
  depositFunds: (amount: number) => Promise<void>;
  withdrawFunds: (amount: number) => Promise<void>;
  refreshData: (isManualRefresh?: boolean) => Promise<void>;
  loadMarketHistory: () => Promise<void>;
  loadUserHistory: () => Promise<void>;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

export const useMarket = () => {
  const context = useContext(MarketContext);
  if (!context) {
    throw new Error('useMarket must be used within a MarketProvider');
  }
  return context;
};

interface MarketProviderProps {
  children: ReactNode;
}

// 移除 DEFAULT_CONFIG
// const DEFAULT_CONFIG = {
//   serverUrl: "https://rpc.prediction.zkwasm.ai", // RPC server URL
// };

// const DEFAULT_CONFIG = {
//   serverUrl: "http://localhost:3000"
// };

export const MarketProvider: React.FC<MarketProviderProps> = ({ children }) => {
  const { marketId } = useParams<{ marketId: string }>();
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [userHistory, setUserHistory] = useState<UserHistoryResponse | null>(null);
  const [globalState, setGlobalState] = useState<GlobalState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [api, setApi] = useState<PredictionMarketAPI | null>(null);
  const [playerInstalled, setPlayerInstalled] = useState(false);
  const [apiInitializing, setApiInitializing] = useState(false);
  
  const walletData = useWallet();
  const { l1Account, l2Account, playerId, setPlayerId, deposit, isConnected } = walletData;
  
  // L1 account should now be properly connected after the fix
  const effectiveL1Account = l1Account;
  

  const { toast } = useToast();



  // Initialize API when L2 account is available
  useEffect(() => {
    if (l2Account && l2Account.getPrivateKey && !api && !apiInitializing) {
      initializeAPI();
    }
  }, [l2Account, api, apiInitializing]);

  // Reset all state when wallet is disconnected
  useEffect(() => {
    // If both L1 and L2 accounts are disconnected, reset all state
    if (!l1Account && !l2Account) {
      setMarketData(null);
      setPlayerData(null);
      setChartData([]);
      setUserHistory(null);
      setGlobalState(null);
      setApi(null);
      setPlayerInstalled(false);
      setApiInitializing(false);
      setIsLoading(false);
    }
  }, [l1Account, l2Account]);

  // Auto-install player when L2 is connected and API is ready
  useEffect(() => {
    // If L2 is connected, API is ready, and player is not installed, install player
    if (l2Account && !playerInstalled && api) {
      
      // Generate player ID from L2 account's public key
      const generatePlayerIdFromL2 = (): [string, string] | null => {
        try {
          if (l2Account.pubkey) {
            const pubkey = l2Account.pubkey;
            const leHexBN = new LeHexBN(bnToHexLe(pubkey));
            const pkeyArray = leHexBN.toU64Array();
            const playerId: [string, string] = [pkeyArray[1].toString(), pkeyArray[2].toString()];
            console.log("Generated player ID from L2 account:", playerId);
            console.log("Original bigint values:", pkeyArray[1], pkeyArray[2]);
            return playerId;
          }
          return null;
        } catch (error) {
          console.error("Failed to generate player ID from L2:", error);
          return null;
        }
      };
      
      // Simple auto-install without dependencies
      const autoInstall = async () => {
        setIsLoading(true);
        try {
          console.log("Auto-installing player...");
          const response = await api.registerPlayer();
          console.log("Auto-install response:", response);
          
          // Generate player ID regardless of API response
          const generatedPlayerId = generatePlayerIdFromL2();
          if (generatedPlayerId) {
            setPlayerId(generatedPlayerId);
            console.log("Player ID set from L2 account:", generatedPlayerId);
          }
          
          setPlayerInstalled(true);
          
          if (response === null) {
            // Player already exists
            toast({
              title: "Player Connected",
              description: "Successfully connected to existing player account!",
            });
          } else {
            // New player created
            toast({
              title: "Player Installed",
              description: "Successfully created new player account!",
            });
          }
        } catch (error) {
          console.error('Auto-install failed:', error);
          toast({
            title: "Auto-connection Failed", 
            description: "Failed to auto-connect. Please try manually.",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      };
      
      autoInstall();
    }
  }, [l2Account, playerInstalled, api]);

  // Set up polling when API is ready, player is installed, and marketId is available
  useEffect(() => {
    if (api && playerInstalled && playerId && marketId) {
      console.log("Player installed and market selected, starting data polling...");
      // Load initial data
      loadInitialData();
      
      // Set up polling interval (every 5 seconds)
      const pollInterval = setInterval(() => {
        refreshData(false); // false = automatic refresh
      }, 5000);

      return () => {
        clearInterval(pollInterval);
      };
    }
  }, [api, playerInstalled, playerId, marketId]);

  const initializeAPI = () => {
    if (!l2Account?.getPrivateKey()) {
      console.warn('No L2 account private key available for API initialization');
      return;
    }

    if (apiInitializing || api) {
      console.log('API already initializing or initialized, skipping');
      return;
    }

    setApiInitializing(true);
    console.log('Starting API initialization...');

    // Log pkeyArray values during API initialization
    if (l2Account.pubkey) {
      try {
        const pubkey = l2Account.pubkey;
        const leHexBN = new LeHexBN(bnToHexLe(pubkey));
        const pkeyArray = leHexBN.toU64Array();
        console.log("API Init - pkeyArray[1]:", pkeyArray[1]);
        console.log("API Init - pkeyArray[2]:", pkeyArray[2]);
      } catch (error) {
        console.error("Failed to extract pkeyArray during API init:", error);
      }
    }

    // 直接用 getRpcUrl() 获取 serverUrl
    // const config = {
    //   serverUrl: getRpcUrl(),
    //   privkey: l2Account.getPrivateKey(),
    // };

    const config = {
      serverUrl: "http://172.23.84.199:3000", // Use the same server URL
      privkey: "00000000" // Dummy private key for read-only operations
    };
    console.log('Initializing real API connection to:', config.serverUrl);
    const apiInstance = new PredictionMarketAPI(config);
    setApi(apiInstance);
    setApiInitializing(false);
    console.log('API initialization completed');
  };

  const installPlayer = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log("Installing player via API...");
      console.log("API available:", !!api);
      
      if (!api) {
        throw new Error('API not ready yet');
      }

      console.log("Using API instance for player installation");
      
      // If we already have a playerId from localStorage, try to verify it first
      if (playerId) {
        console.log("Player ID exists, verifying with API:", playerId);
        try {
          const existingPlayerState = await api.queryPlayerState(playerId);
          if (existingPlayerState) {
            console.log("Existing player verified with API");
            setPlayerInstalled(true);
            toast({
              title: "Player Reconnected",
              description: "Successfully reconnected to existing player!",
            });
            return;
          }
        } catch (error) {
          console.log("Failed to verify existing player, will register new one:", error);
        }
      }
      
      // Generate player ID from L2 account
      if (!l2Account) {
        throw new Error('L2 account not connected');
      }

      const generatePlayerIdFromL2 = (): [string, string] | null => {
        try {
          if (l2Account.pubkey) {
            const pubkey = l2Account.pubkey;
            const leHexBN = new LeHexBN(bnToHexLe(pubkey));
            const pkeyArray = leHexBN.toU64Array();
            const playerId: [string, string] = [pkeyArray[1].toString(), pkeyArray[2].toString()];
            console.log("Generated player ID from L2 account:", playerId);
            console.log("Original bigint values:", pkeyArray[1], pkeyArray[2]);
            return playerId;
          }
          return null;
        } catch (error) {
          console.error("Failed to generate player ID from L2:", error);
          return null;
        }
      };

      // Call real API to register new player
      const response = await api.registerPlayer();
      console.log("Player registration response:", response);
      
      // Generate player ID regardless of API response
      const generatedPlayerId = generatePlayerIdFromL2();
      if (generatedPlayerId) {
        setPlayerId(generatedPlayerId);
        console.log("Player ID set from L2 account:", generatedPlayerId);
      } else {
        throw new Error('Failed to generate player ID from L2 account');
      }
      
      // Mark player as installed only after successful API call
      setPlayerInstalled(true);
      
      console.log("Player installed successfully via API");
      
      if (response === null) {
        // Player already exists
        toast({
          title: "Player Connected",
          description: "Successfully connected to existing player account!",
        });
      } else {
        // New player created
        toast({
          title: "Player Installed",
          description: "Successfully created new player account!",
        });
      }
    } catch (error) {
      console.error('Install player failed:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect to the prediction market. Retrying...",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [api, l2Account, playerId, setPlayerId, toast]);

  const handleAutoInstallPlayer = useCallback(async () => {
    try {
      await installPlayer();
    } catch (error) {
      console.error('Auto-install player failed:', error);
      // Let the useEffect retry when conditions change
    }
  }, [installPlayer]);

  const loadInitialData = async () => {
    console.log("Loading initial market and player data...");
    setIsLoading(true);
    try {
      if (api) {
        await refreshData();
        // Load market history after refreshing data
        await loadMarketHistory();
      } else {
        // Show loading message until API is ready
        console.log("API not ready yet, will load data when API initializes");
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const placeBet = async (betType: number, amount: string) => {
    if (!api || !marketId) {
      throw new Error('API not initialized or market ID missing');
    }

    setIsLoading(true);
    try {
      console.log("Placing bet via API:", { marketId, betType, amount });
      const response = await api.placeBetOnMarket(marketId, betType, amount);
      console.log("Bet response:", response);
      
      toast({
        title: "Bet Placed",
        description: `Successfully placed ${amount} on ${betType === 1 ? 'YES' : 'NO'}`,
      });
      
      // Refresh data after successful bet
      await refreshData();
    } catch (error) {
      console.error('Bet failed:', error);
      toast({
        title: "Bet Failed",
        description: "Failed to place bet. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const sellShares = async (betType: number, amount: string) => {
    if (!api || !marketId) {
      throw new Error('API not initialized or market ID missing');
    }

    setIsLoading(true);
    try {
      console.log("Selling shares via API:", { marketId, betType, amount });
      const response = await api.sellSharesOnMarket(marketId, betType, amount);
      console.log("Sell response:", response);
      
      toast({
        title: "Shares Sold",
        description: `Successfully sold ${amount} ${betType === 1 ? 'YES' : 'NO'} shares`,
      });
      
      // Refresh data after successful sell
      await refreshData();
    } catch (error) {
      console.error('Sell failed:', error);
      toast({
        title: "Sell Failed",
        description: "Failed to sell shares. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const claimWinnings = async () => {
    if (!api || !marketId) {
      throw new Error('API not initialized or market ID missing');
    }

    setIsLoading(true);
    try {
      console.log("Claiming winnings via API for market:", marketId);
      const response = await api.claimWinningsFromMarket(marketId);
      console.log("Claim response:", response);
      
      toast({
        title: "Winnings Claimed",
        description: "Successfully claimed your winnings!",
      });
      
      // Refresh data after successful claim
      await refreshData();
    } catch (error) {
      console.error('Claim failed:', error);
      toast({
        title: "Claim Failed",
        description: "Failed to claim winnings. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resolveMarket = async (outcome: boolean) => {
    if (!api) {
      throw new Error('API not initialized');
    }

    setIsLoading(true);
    try {
      if (!marketId) {
        throw new Error('Market ID is required to resolve market');
      }
      console.log("Resolving market via API:", { marketId, outcome });
      const response = await api.resolveMarket(marketId, outcome);
      console.log("Resolve response:", response);
      
      toast({
        title: "Market Resolved",
        description: `Market resolved with outcome: ${outcome ? 'YES' : 'NO'}`,
      });
      
      // Refresh data after resolution
      await refreshData();
    } catch (error) {
      console.error('Resolve failed:', error);
      toast({
        title: "Resolve Failed",
        description: "Failed to resolve market. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const withdrawFees = async () => {
    if (!api) {
      throw new Error('API not initialized');
    }

    setIsLoading(true);
    try {
      if (!marketId) {
        throw new Error('Market ID is required to withdraw fees');
      }
      console.log("Withdrawing fees via API for market:", marketId);
      const response = await api.withdrawFees(marketId);
      console.log("Withdraw fees response:", response);
      
      toast({
        title: "Fees Withdrawn",
        description: "Successfully withdrew platform fees!",
      });
      
      // Refresh data after withdrawal
      await refreshData();
    } catch (error) {
      console.error('Withdraw fees failed:', error);
      toast({
        title: "Withdraw Failed",
        description: "Failed to withdraw fees. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const depositFunds = async (amount: number) => {


    if (!deposit) {
      throw new Error('Deposit function is not available');
    }

    setIsLoading(true);
    try {
      console.log("Depositing funds:", amount);
      
      // Call deposit function from wallet context
      // The deposit function will handle L1/L2 account validation internally
      const result = await deposit({
        tokenIndex: 0,
        amount: Number(amount),
      });
      
      console.log("Deposit Success:", result);
      
      toast({
        title: "Deposit Success",
        description: `Successfully deposited ${amount} tokens!`,
      });
      
      // Refresh data after deposit
      await refreshData();
    } catch (error: any) {
      const message = `Deposit Failed: ${error?.message || "Unknown error"}`;
      console.error("Deposit error:", error);
      toast({
        title: "Deposit Failed",
        description: message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const withdrawFunds = async (amount: number) => {
    if (!api) throw new Error('API not ready');
    if (!l2Account || !effectiveL1Account) throw new Error('L1 and L2 accounts are required for withdrawal');
    if (!l2Account.getPrivateKey) throw new Error('L2 account private key is required for withdrawal');
    if (!playerData?.data?.nonce) throw new Error('Player nonce is required for withdrawal');

    setIsLoading(true);
    try {
      const nonce = parseInt(playerData.data.nonce);
      if (isNaN(nonce)) throw new Error('Invalid nonce value');
      const withdrawAmount = BigInt(amount);

      // 直接调用 API
      await api.withdrawFunds(nonce, withdrawAmount, effectiveL1Account, l2Account.getPrivateKey());

      toast({
        title: "Withdraw Success",
        description: `Successfully withdrew ${amount} tokens!`,
      });
      await refreshData();
    } catch (error: any) {
      const message = `Withdraw Error: ${error?.message || "Unknown error"}`;
      toast({
        title: "Withdraw Failed",
        description: message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async (isManualRefresh = false) => {
    if (!api) {
      console.warn('API not available for data refresh');
      return;
    }

    if (!playerId || !marketId) {
      console.warn('No player ID or market ID available for data refresh');
      return;
    }

    // Set appropriate loading state
    if (isManualRefresh) {
      setIsRefreshing(true);
    }

    try {
      console.log('Fetching market, player data and global state from API for market:', marketId);
      
      // Use market-specific API calls plus global state
      const [marketResponse, playerResponse, globalStateResponse] = await Promise.all([
        api.getMarket(marketId),
        api.getPlayerMarketPosition(playerId[0], playerId[1], marketId),
        api.queryMarketState()
      ]);
      console.log('Market response:', marketResponse);
      console.log('Player response:', playerResponse);
      console.log('Global state response:', globalStateResponse);
      
      if (marketResponse) {
        // Transform market data from the multi-market response structure
        const marketFromResponse = marketResponse;
        
        // Update global state
        if (globalStateResponse && globalStateResponse.state) {
          setGlobalState({
            counter: globalStateResponse.state.counter || 0,
            market_ids: globalStateResponse.state.market_ids || [],
            next_market_id: globalStateResponse.state.next_market_id || 1,
            total_players: globalStateResponse.state.total_players || 0,
            txsize: globalStateResponse.state.txsize || 0,
            txcounter: globalStateResponse.state.txcounter || 0,
          });
        }
        
        // Get current counter from global state
        const currentCounter: number = globalStateResponse?.state?.counter || 0;
        console.log('Counter extraction:', {
          hasGlobalState: !!globalStateResponse,
          hasState: !!globalStateResponse?.state,
          rawCounter: globalStateResponse?.state?.counter,
          finalCounter: currentCounter
        });
        
        const startTime = parseInt(marketFromResponse.startTime) || 0;
        const endTime = parseInt(marketFromResponse.endTime) || 0;
        const resolutionTime = parseInt(marketFromResponse.resolutionTime) || 0;
        const counterInterval = 5; // 5 seconds per counter increment
        
        // Import market calculations for status
        const { getMarketStatus } = await import('../utils/market-calculations.js');
        const marketStatus = getMarketStatus(
          currentCounter,
          startTime,
          endTime,
          resolutionTime,
          marketFromResponse.resolved || false,
          counterInterval
        );
        
        const parsedMarketData: MarketData = {
          marketId: marketFromResponse.marketId?.toString(),
          titleString: marketFromResponse.titleString || "Untitled Market",
          yes_liquidity: marketFromResponse.totalYesShares?.toString() || marketFromResponse.yesLiquidity?.toString() || "0",
          no_liquidity: marketFromResponse.totalNoShares?.toString() || marketFromResponse.noLiquidity?.toString() || "0", 
          b: marketFromResponse.b?.toString() || "1000000", // Default b = 1,000,000
          poolBalance: marketFromResponse.poolBalance?.toString() || "0",
          total_volume: marketFromResponse.totalVolume?.toString() || "0",
          resolved: marketFromResponse.resolved || false,
          outcome: marketFromResponse.outcome,
          total_fees_collected: marketFromResponse.totalFeesCollected?.toString() || "0",
          // Add time-related fields
          counter: currentCounter,
          start_time: startTime,
          end_time: endTime,
          resolution_time: resolutionTime,
          time_remaining: marketStatus.timeRemainingText,
          remaining_time: marketStatus.timeRemaining,
          market_status: marketStatus.status,
          market_status_text: marketStatus.statusText,
        };
        console.log('Parsed market data with time info:', {
          currentCounter,
          startTime,
          endTime,
          resolutionTime,
          marketStatus,
          timeRemaining: parsedMarketData.time_remaining
        });
        setMarketData(parsedMarketData);
      } else {
        console.log('No market data received from API');
      }

      // Transform player data from the response structure
      if (playerResponse && globalStateResponse) {
        const playerFromResponse = playerResponse;
        const globalPlayerData = globalStateResponse.player;
        
        const parsedPlayerData: PlayerData = {
          player_id: [parseInt(playerId[0]), parseInt(playerId[1])],
          data: {
            balance: globalPlayerData?.data?.balance?.toString() || "0", // Balance from global state
            yes_shares: playerFromResponse.yesShares?.toString() || "0",
            no_shares: playerFromResponse.noShares?.toString() || "0",
            claimed: playerFromResponse.claimed || false,
            nonce: globalPlayerData?.nonce?.toString() || "0", // Nonce from global state
          },
        };
        console.log('Parsed player data (balance from global state):', {
          globalBalance: globalPlayerData?.data?.balance,
          marketPosition: {
            yesShares: playerFromResponse.yesShares,
            noShares: playerFromResponse.noShares,
            claimed: playerFromResponse.claimed
          },
          finalPlayerData: parsedPlayerData
        });
        setPlayerData(parsedPlayerData);
      } else {
        console.log('No player data or global state received from API');
      }
    } catch (error) {
      console.error('Failed to refresh data from API:', error);
      
      // Show error toast only if this is not background polling
      if (!marketData && !playerData) {
        toast({
          title: "Connection Error",
          description: "Failed to connect to server. Make sure the server is running.",
          variant: "destructive",
        });
      }
    } finally {
      if (isManualRefresh) {
        setIsRefreshing(false);
      }
    }
  };

  const loadMarketHistory = async () => {
    if (!api || !marketId) {
      console.warn('API or market ID not available for market history');
      return;
    }

    try {
      console.log('Loading market history for market:', marketId);
      
      // Use market-specific liquidity history API
      const historyData = await api.getMarketLiquidityHistory(marketId);
      
      if (historyData && historyData.length > 0) {
        console.log('Market history loaded:', historyData.length, 'entries');
        
        // Convert to chart data format and calculate prices
        const chartPoints: ChartDataPoint[] = historyData.map((entry: any) => {
          const yesLiq = parseFloat(entry.yesLiquidity);
          const noLiq = parseFloat(entry.noLiquidity);
          const yesLiqBig = BigInt(Math.floor(yesLiq));
          const noLiqBig = BigInt(Math.floor(noLiq));
          
          // Use MarketCalculations for consistent price calculation with LMSR
          // Get b parameter from current market data or use default
          const b = marketData?.b ? BigInt(marketData.b) : BigInt(1000000);
          const prices = MarketCalculations.calculatePrices(yesLiqBig, noLiqBig, b);
          
          return {
            counter: parseInt(entry.counter),
            yesPrice: prices.yesPrice,
            noPrice: prices.noPrice,
            yesLiquidity: yesLiq,
            noLiquidity: noLiq,
            timestamp: new Date().toISOString(), // You might want to calculate actual timestamp based on counter
          };
        });
        
        // Sort by counter and keep only the last 100 entries for chart performance
        chartPoints.sort((a, b) => a.counter - b.counter);
        const last100Points = chartPoints.slice(-100);
        
        setChartData(last100Points);
        console.log('Chart data updated with', last100Points.length, 'points (last 100 for performance)');
      } else {
        console.log('No market history data received');
      }
    } catch (error) {
      console.error('Failed to load market history:', error);
    }
  };

  const loadUserHistory = async () => {
    if (!api || !playerId || !marketId) {
      console.warn('API, player ID, or market ID not available for user history');
      return;
    }

    try {
      console.log('Loading user history for player:', playerId, 'in market:', marketId);
      
      // Use market-specific user history API
      const historyData = await api.getPlayerMarketRecentTransactions(
        playerId[0], 
        playerId[1], 
        marketId,
        20 // Get last 20 transactions
      );
      
      if (historyData && historyData.length > 0) {
        console.log('User history loaded:', historyData.length, 'transactions');
        
        // Transform to match existing UserHistoryResponse structure
        const transformedHistory: UserHistoryResponse = {
          success: true,
          data: historyData.map((tx: any) => ({
            index: tx.index || '0',
            pid: [playerId[0], playerId[1]],
            betType: tx.betType || 0,
            amount: tx.amount || '0',
            shares: tx.shares || '0',
            counter: tx.counter || '0',
            __v: 0
          })),
          count: historyData.length
        };
        
        setUserHistory(transformedHistory);
      } else {
        console.log('No user history data received');
        // Set empty history
        setUserHistory({
          success: true,
          data: [],
          count: 0
        });
      }
    } catch (error) {
      console.error('Failed to load user history:', error);
      // Set empty history on error
      setUserHistory({
        success: false,
        data: [],
        count: 0
      });
    }
  };

  return (
          <MarketContext.Provider 
        value={{
          marketId: marketId || null,
        marketData,
        playerData,
        chartData,
        userHistory,
        playerId,
        globalState,
        isLoading,
        isRefreshing,
        api,
        initializeAPI,
        installPlayer,
        placeBet,
        sellShares,
        claimWinnings,
        resolveMarket,
        withdrawFees,
        depositFunds,
        withdrawFunds,
        refreshData,
        loadMarketHistory,
        loadUserHistory
      }}
    >
      {children}
    </MarketContext.Provider>
  );
}; 