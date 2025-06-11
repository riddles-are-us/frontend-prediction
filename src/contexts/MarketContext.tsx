import { bnToHexLe } from 'delphinus-curves/src/altjubjub';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { LeHexBN } from 'zkwasm-minirollup-rpc';
import { useToast } from '../hooks/use-toast';
import PredictionMarketAPI from '../services/api';
import { MarketData, PlayerData } from '../types/market';
import { useWallet } from './WalletContext';

interface MarketContextType {
  marketData: MarketData | null;
  playerData: PlayerData | null;
  isLoading: boolean;
  api: PredictionMarketAPI | null;
  initializeAPI: () => void;
  installPlayer: () => Promise<void>;
  placeBet: (betType: number, amount: string) => Promise<void>;
  sellShares: (betType: number, amount: string) => Promise<void>;
  claimWinnings: () => Promise<void>;
  resolveMarket: (outcome: boolean) => Promise<void>;
  withdrawFees: () => Promise<void>;
  refreshData: () => Promise<void>;
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

// Default server configuration
const DEFAULT_CONFIG = {
  serverUrl: "http://localhost:3000", // RPC server URL
};

export const MarketProvider: React.FC<MarketProviderProps> = ({ children }) => {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [api, setApi] = useState<PredictionMarketAPI | null>(null);
  const [playerInstalled, setPlayerInstalled] = useState(false);
  
  const { l1Account, l2Account, playerId, setPlayerId } = useWallet();
  const { toast } = useToast();

  // Initialize API when L2 account is available
  useEffect(() => {
    if (l2Account && l2Account.getPrivateKey && !api) {
      initializeAPI();
    }
  }, [l2Account]);

  // Auto-install player when API is ready
  useEffect(() => {
    if (api && !playerInstalled && !playerId) {
      console.log("API ready, auto-installing player...");
      handleAutoInstallPlayer();
    }
  }, [api, playerInstalled, playerId]);

  // Set up polling when player is installed
  useEffect(() => {
    if (playerInstalled && api) {
      console.log("Player installed, starting data polling...");
      // Load initial data
      loadInitialData();
      
      // Set up polling interval (every 5 seconds)
      const pollInterval = setInterval(() => {
        refreshData();
      }, 5000);

      return () => {
        clearInterval(pollInterval);
      };
    }
  }, [playerInstalled, api]);

  const initializeAPI = () => {
    if (!l2Account?.getPrivateKey()) {
      console.warn('No L2 account private key available for API initialization');
      return;
    }

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

    const config = {
      ...DEFAULT_CONFIG,
      privkey: l2Account.getPrivateKey(),
    };

    console.log('Initializing API with config:', { serverUrl: config.serverUrl });
    const apiInstance = new PredictionMarketAPI(config);
    setApi(apiInstance);
  };

  const handleAutoInstallPlayer = async () => {
    try {
      await installPlayer();
      setPlayerInstalled(true);
    } catch (error) {
      console.error('Auto-install player failed:', error);
      // Retry after 3 seconds
      setTimeout(() => {
        handleAutoInstallPlayer();
      }, 3000);
    }
  };

  const loadInitialData = async () => {
    console.log("Loading initial market and player data from API...");
    setIsLoading(true);
    try {
      await refreshData();
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const installPlayer = async () => {
    if (!api) {
      throw new Error('API not initialized');
    }

    setIsLoading(true);
    try {
      console.log("Installing player via API...");
      
      const response = await api.registerPlayer();
      console.log("Player registration response:", response);
      
      // Extract player ID from response
      const mockPlayerId: [number, number] = [1, Date.now()];
      setPlayerId(mockPlayerId);
      
      console.log("Player installed successfully with ID:", mockPlayerId);
      
      toast({
        title: "Player Installed",
        description: "Successfully connected to the prediction market!",
      });
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
  };

  const placeBet = async (betType: number, amount: string) => {
    if (!api) {
      throw new Error('API not initialized');
    }

    setIsLoading(true);
    try {
      console.log("Placing bet via API:", { betType, amount });
      const response = await api.placeBet(betType, amount);
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
    if (!api) {
      throw new Error('API not initialized');
    }

    setIsLoading(true);
    try {
      console.log("Selling shares via API:", { betType, amount });
      const response = await api.sellShares(betType, amount);
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
    if (!api) {
      throw new Error('API not initialized');
    }

    setIsLoading(true);
    try {
      console.log("Claiming winnings via API...");
      const response = await api.claimWinnings();
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
      console.log("Resolving market via API:", { outcome });
      const response = await api.resolveMarket(outcome);
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
      console.log("Withdrawing fees via API...");
      const response = await api.withdrawFees();
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

  const refreshData = async () => {
    if (!api) {
      console.warn('API not available for data refresh');
      return;
    }

    try {
      console.log('Fetching market and player data from API...');
      
      // Query market state
      const marketState = await api.queryMarketState();
      console.log('Market state response:', marketState);
      
      if (marketState) {
        // Parse and set market data based on API response structure
        const parsedMarketData: MarketData = {
          title: marketState.title || "Will Bitcoin reach $100,000 USD by December 31, 2024?",
          yes_liquidity: marketState.yes_liquidity || "0",
          no_liquidity: marketState.no_liquidity || "0", 
          total_volume: marketState.total_volume || "0",
          resolved: marketState.resolved || false,
          outcome: marketState.outcome || false,
          total_fees_collected: marketState.total_fees_collected || "0",
        };
        setMarketData(parsedMarketData);
      }

      // Query player state if player ID is available
      if (playerId) {
        const playerState = await api.queryPlayerState(playerId);
        console.log('Player state response:', playerState);
        
        if (playerState) {
          // Parse and set player data based on API response structure
          const parsedPlayerData: PlayerData = {
            player_id: playerId,
            data: {
              balance: playerState.balance || "0",
              yes_shares: playerState.yes_shares || "0",
              no_shares: playerState.no_shares || "0",
              claimed: playerState.claimed || false,
              nonce: playerState.nonce || "0",
            },
          };
          setPlayerData(parsedPlayerData);
        }
      }
    } catch (error) {
      console.error('Failed to refresh data from API:', error);
      
      // Show error toast only if this is not background polling
      if (!marketData && !playerData) {
        toast({
          title: "Connection Error",
          description: "Failed to connect to localhost:3000. Make sure the server is running.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <MarketContext.Provider 
      value={{
        marketData,
        playerData,
        isLoading,
        api,
        initializeAPI,
        installPlayer,
        placeBet,
        sellShares,
        claimWinnings,
        resolveMarket,
        withdrawFees,
        refreshData
      }}
    >
      {children}
    </MarketContext.Provider>
  );
}; 