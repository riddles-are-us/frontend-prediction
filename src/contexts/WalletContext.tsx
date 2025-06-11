import { bnToHexLe } from 'delphinus-curves/src/altjubjub';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { AccountSlice } from 'zkwasm-minirollup-browser';
import { LeHexBN } from 'zkwasm-minirollup-rpc';
import { useAppDispatch, useAppSelector } from '../app/hooks';

interface WalletContextType {
  isConnected: boolean;
  isL2Connected: boolean;
  l1Account: any;
  l2Account: any;
  playerId: [number, number] | null;
  connectL1: () => Promise<void>;
  connectL2: () => Promise<void>;
  disconnect: () => void;
  setPlayerId: (id: [number, number]) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [playerId, setPlayerIdState] = useState<[number, number] | null>(null);
  
  const dispatch = useAppDispatch();
  const l1Account = useAppSelector(AccountSlice.selectL1Account);
  const l2Account = useAppSelector(AccountSlice.selectL2Account);

  // Load saved player ID from localStorage
  useEffect(() => {
    const savedPlayerId = localStorage.getItem('player_id');
    if (savedPlayerId) {
      setPlayerIdState(JSON.parse(savedPlayerId));
    }
  }, []);

  const connectL1 = async () => {
    console.log("Attempting to connect L1 wallet..."); // Debug log
    
    // 调试环境变量
    console.log("Environment variables:", {
      REACT_APP_CHAIN_ID: process.env.REACT_APP_CHAIN_ID,
      NODE_ENV: process.env.NODE_ENV,
      windowEthereum: !!window.ethereum
    });
    
    try {
      // Check if MetaMask is installed
      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
      }

      // Check current network before connecting
      if ((window.ethereum as any).networkVersion) {
        console.log("Current MetaMask network:", (window.ethereum as any).networkVersion);
      }

      // Dispatch the login action and wait for it to complete
      const resultAction = await dispatch(AccountSlice.loginL1AccountAsync());
      
      if (AccountSlice.loginL1AccountAsync.fulfilled.match(resultAction)) {
        console.log("L1 wallet connected successfully:", resultAction.payload);
        
        // Store connection status
        localStorage.setItem('wallet_connected', 'true');
        
        return Promise.resolve();
      } else if (AccountSlice.loginL1AccountAsync.rejected.match(resultAction)) {
        console.error("L1 wallet connection failed:", resultAction.error);
        throw new Error(resultAction.error?.message || 'Failed to connect to wallet');
      }
    } catch (error) {
      console.error("Connect L1 error:", error);
      throw error;
    }
  };

  const connectL2 = async () => {
    if (l1Account) {
      console.log("Attempting to connect L2 account..."); // Debug log
      
      try {
        const resultAction = await dispatch(AccountSlice.loginL2AccountAsync("ZKWASM-PREDICTION-MARKET"));
        
        if (AccountSlice.loginL2AccountAsync.fulfilled.match(resultAction)) {
          console.log("L2 account connected successfully:", resultAction.payload);
          
          // Log pkeyArray values for debugging
          if (resultAction.payload && resultAction.payload.pubkey) {
            try {
              const pubkey = resultAction.payload.pubkey;
              const leHexBN = new LeHexBN(bnToHexLe(pubkey));
              const pkeyArray = leHexBN.toU64Array();
              console.log("pkeyArray[1]:", pkeyArray[1]);
              console.log("pkeyArray[2]:", pkeyArray[2]);
            } catch (error) {
              console.error("Failed to extract pkeyArray:", error);
            }
          }
          
          return Promise.resolve();
        } else if (AccountSlice.loginL2AccountAsync.rejected.match(resultAction)) {
          console.error("L2 account connection failed:", resultAction.error);
          throw new Error(resultAction.error?.message || 'Failed to connect to L2 account');
        }
      } catch (error) {
        console.error("Connect L2 error:", error);
        throw error;
      }
    } else {
      throw new Error('L1 account must be connected first');
    }
  };

  const disconnect = () => {
    // Clear local storage
    localStorage.removeItem('l1Account');
    localStorage.removeItem('l2Account');
    localStorage.removeItem('wallet_connected');
    localStorage.removeItem('player_id');
    
    // Clear other wallet-related items
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.includes('wallet') || key.includes('account') || key.includes('web3')) {
        localStorage.removeItem(key);
      }
    }
    
    setPlayerIdState(null);
    
    // Refresh page to reset state
    window.location.reload();
  };

  const setPlayerId = (id: [number, number]) => {
    setPlayerIdState(id);
    localStorage.setItem('player_id', JSON.stringify(id));
  };

  const isConnected = !!l1Account;
  const isL2Connected = !!l2Account;

  return (
    <WalletContext.Provider 
      value={{
        isConnected,
        isL2Connected,
        l1Account,
        l2Account,
        playerId,
        connectL1,
        connectL2,
        disconnect,
        setPlayerId
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}; 