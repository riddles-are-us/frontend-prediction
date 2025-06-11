import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
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

// Default server configuration - these should be configurable
const DEFAULT_CONFIG = {
  serverUrl: "http://localhost:3000", // Default RPC server URL
};

// Mock data for development
const MOCK_MARKET_DATA: MarketData = {
  title: "Will Bitcoin reach $100,000 USD by December 31, 2024?",
  resolved: false,
  outcome: false,
  yes_liquidity: "1000000",
  no_liquidity: "1000000",
  total_volume: "50000",
  total_fees_collected: "500",
};

const MOCK_PLAYER_DATA: PlayerData = {
  player_id: [1, 123456789],
  data: {
    balance: "10000",
    yes_shares: "0",
    no_shares: "0",
    claimed: false,
    nonce: "0",
  },
};

export const MarketProvider: React.FC<MarketProviderProps> = ({ children }) => {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [api, setApi] = useState<PredictionMarketAPI | null>(null);
  const [playerInstalled, setPlayerInstalled] = useState(false);
  
  const { l1Account, l2Account, playerId, setPlayerId } = useWallet();
  const { toast } = useToast();

  // Auto-install player and start polling when L2 is connected
  useEffect(() => {
    if (l2Account && !playerInstalled) {
      console.log("L2 account connected, auto-installing player...");
      handleAutoInstallPlayer();
    }
  }, [l2Account, playerInstalled]);

  // Set up polling when player is installed
  useEffect(() => {
    if (playerInstalled) {
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
  }, [playerInstalled]);

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
    console.log("Loading initial market and player data...");
    setMarketData(MOCK_MARKET_DATA);
    setPlayerData(MOCK_PLAYER_DATA);
  };

  const initializeAPI = () => {
    // For now, we'll use mock data instead of real API
    console.log('API initialization skipped - using mock data');
    
    // TODO: Replace with real API initialization when backend is ready
    /*
    if (!l2Account?.getPrivateKey()) {
      console.warn('No L2 account private key available for API initialization');
      return;
    }

    const config = {
      ...DEFAULT_CONFIG,
      privkey: l2Account.getPrivateKey(),
    };

    const apiInstance = new PredictionMarketAPI(config);
    setApi(apiInstance);
    */
  };

  const installPlayer = async () => {
    setIsLoading(true);
    try {
      console.log("Installing player...");
      
      // Mock player installation (like minority's install_player)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
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
      throw error; // Re-throw so auto-retry can handle it
    } finally {
      setIsLoading(false);
    }
  };

  const placeBet = async (betType: number, amount: string) => {
    setIsLoading(true);
    try {
      // Mock bet placement
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast({
        title: "Bet Placed",
        description: `Successfully placed ${amount} on ${betType === 1 ? 'YES' : 'NO'}`,
      });
      
      // Update mock data
      if (playerData) {
        const updatedPlayerData = { ...playerData };
        const currentBalance = parseInt(updatedPlayerData.data.balance);
        const betAmount = parseInt(amount);
        
        updatedPlayerData.data.balance = (currentBalance - betAmount).toString();
        
        if (betType === 1) {
          const currentYesShares = parseInt(updatedPlayerData.data.yes_shares);
          updatedPlayerData.data.yes_shares = (currentYesShares + betAmount).toString();
        } else {
          const currentNoShares = parseInt(updatedPlayerData.data.no_shares);
          updatedPlayerData.data.no_shares = (currentNoShares + betAmount).toString();
        }
        
        setPlayerData(updatedPlayerData);
      }
    } catch (error) {
      console.error('Bet failed:', error);
      toast({
        title: "Bet Failed",
        description: "Failed to place bet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sellShares = async (betType: number, amount: string) => {
    setIsLoading(true);
    try {
      // Mock share selling
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Shares Sold",
        description: `Successfully sold ${amount} ${betType === 1 ? 'YES' : 'NO'} shares`,
      });
      
      // Update mock data
      if (playerData) {
        const updatedPlayerData = { ...playerData };
        const sellAmount = parseInt(amount);
        const currentBalance = parseInt(updatedPlayerData.data.balance);
        
        updatedPlayerData.data.balance = (currentBalance + sellAmount * 0.95).toString(); // 5% fee
        
        if (betType === 1) {
          const currentYesShares = parseInt(updatedPlayerData.data.yes_shares);
          updatedPlayerData.data.yes_shares = (currentYesShares - sellAmount).toString();
        } else {
          const currentNoShares = parseInt(updatedPlayerData.data.no_shares);
          updatedPlayerData.data.no_shares = (currentNoShares - sellAmount).toString();
        }
        
        setPlayerData(updatedPlayerData);
      }
    } catch (error) {
      console.error('Sell failed:', error);
      toast({
        title: "Sell Failed",
        description: "Failed to sell shares. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const claimWinnings = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Winnings Claimed",
        description: "Successfully claimed your winnings!",
      });
    } catch (error) {
      console.error('Claim failed:', error);
      toast({
        title: "Claim Failed",
        description: "Failed to claim winnings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resolveMarket = async (outcome: boolean) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update mock market data
      if (marketData) {
        const updatedMarketData = { ...marketData };
        updatedMarketData.resolved = true;
        updatedMarketData.outcome = outcome;
        setMarketData(updatedMarketData);
      }
      
      toast({
        title: "Market Resolved",
        description: `Market resolved with outcome: ${outcome ? 'YES' : 'NO'}`,
      });
    } catch (error) {
      console.error('Resolve failed:', error);
      toast({
        title: "Resolve Failed",
        description: "Failed to resolve market. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const withdrawFees = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Fees Withdrawn",
        description: "Successfully withdrew platform fees!",
      });
    } catch (error) {
      console.error('Withdraw fees failed:', error);
      toast({
        title: "Withdraw Failed",
        description: "Failed to withdraw fees. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      // Mock data refresh with slight variations
      if (marketData && playerData) {
        console.log('Polling data...');
        
        // Simulate market liquidity changes
        const yesLiq = parseInt(marketData.yes_liquidity);
        const noLiq = parseInt(marketData.no_liquidity);
        const variation = Math.random() * 10000 - 5000; // ±5000 variation
        
        const updatedMarketData = {
          ...marketData,
          yes_liquidity: Math.max(100000, yesLiq + variation).toString(),
          no_liquidity: Math.max(100000, noLiq - variation).toString(),
          total_volume: (parseInt(marketData.total_volume) + Math.random() * 1000).toString(),
        };
        
        setMarketData(updatedMarketData);
      }
    } catch (error) {
      console.error('Failed to refresh data:', error);
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