import { createCommand, PlayerConvention, ZKWasmAppRpc } from 'zkwasm-minirollup-rpc';
import { CommandType, TransactionData } from "../types/market";

interface ServerConfig {
  serverUrl: string;
  privkey: string;
}

class PredictionMarketAPI extends PlayerConvention {
  public rpc: ZKWasmAppRpc;
  private privkey: string;

  constructor(config: ServerConfig) {
    const rpc = new ZKWasmAppRpc(config.serverUrl);
    super(config.privkey, rpc, BigInt(CommandType.DEPOSIT), BigInt(CommandType.WITHDRAW));
    this.privkey = config.privkey;
    this.rpc = rpc;
    this.processingKey = config.privkey;
  }

  private normalizeMarket(m: any) {
    if (!m) return m;
    return {
      ...m,
      totalYesShares: m.totalYesShares ?? m.total_yes_shares ?? "0",
      totalNoShares:  m.totalNoShares  ?? m.total_no_shares  ?? "0",
      poolBalance:    m.poolBalance    ?? m.pool_balance     ?? "0",
      totalVolume:    m.totalVolume    ?? m.total_volume     ?? "0",
      totalFeesCollected: m.totalFeesCollected ?? m.total_fees_collected ?? "0",
      b: m.b ?? "0",
      yesPrice: (m.yesPrice ?? m.yes_price),
      noPrice:  (m.noPrice  ?? m.no_price),
    };
  }

  async sendTransactionWithCommand(cmd: BigUint64Array) {
    try {
      let result = await this.rpc.sendTransaction(cmd, this.processingKey);
      return result;
    } catch (e) {
      if (e instanceof Error) {
        console.log(e.message);
      }
      throw e;
    }
  }

  // Register a new player
  async registerPlayer(): Promise<any> {
    try {
      const command = createCommand(0n, BigInt(CommandType.INSTALL_PLAYER), []);
      return await this.sendTransactionWithCommand(command);
    } catch (e) {
      if (e instanceof Error && e.message === "PlayerAlreadyExists") {
        console.log("Player already exists, skipping installation");
        return null; // Not an error, just already exists
      }
      throw e; // Re-throw other errors
    }
  }

  // Place a bet: BET command
  async placeBet(betType: number, amount: string): Promise<any> {
    let nonce = await this.getNonce();
    const command = createCommand(nonce, BigInt(CommandType.BET), [BigInt(betType), BigInt(amount)]);
    return await this.sendTransactionWithCommand(command);
  }

  // Sell shares: SELL command
  async sellShares(betType: number, amount: string): Promise<any> {
    let nonce = await this.getNonce();
    const command = createCommand(nonce, BigInt(CommandType.SELL), [BigInt(betType), BigInt(amount)]);
    return await this.sendTransactionWithCommand(command);
  }

  // Claim winnings: CLAIM command
  async claimWinnings(): Promise<any> {
    let nonce = await this.getNonce();
    const command = createCommand(nonce, BigInt(CommandType.CLAIM), []);
    return await this.sendTransactionWithCommand(command);
  }

  // Resolve market (admin only): RESOLVE command
  async resolveMarket(outcome: boolean): Promise<any> {
    let nonce = await this.getNonce();
    const command = createCommand(nonce, BigInt(CommandType.RESOLVE), [outcome ? 1n : 0n]);
    return await this.sendTransactionWithCommand(command);
  }

  // Withdraw fees (admin only): WITHDRAW_FEES command
  async withdrawFees(): Promise<any> {
    let nonce = await this.getNonce();
    const command = createCommand(nonce, BigInt(CommandType.WITHDRAW_FEES), []);
    return await this.sendTransactionWithCommand(command);
  }

  // Deposit funds: DEPOSIT command
  async depositFunds(playerId: [string, string], amount: string): Promise<any> {
    let nonce = await this.getNonce();
    const command = createCommand(nonce, BigInt(CommandType.DEPOSIT), [
      BigInt(playerId[0]),
      BigInt(playerId[1]),
      0n,
      BigInt(amount)
    ]);
    return await this.sendTransactionWithCommand(command);
  }

  // Withdraw funds: WITHDRAW command
  async withdrawFunds(amount: string): Promise<any> {
    let nonce = await this.getNonce();
    const command = createCommand(nonce, BigInt(CommandType.WITHDRAW), [0n, BigInt(amount), 0n, 0n]);
    return await this.sendTransactionWithCommand(command);
  }

  // Query market state
  async queryMarketState(): Promise<any> {
    try {
      const response: any = await this.rpc.queryState(this.privkey);
      if (response && response.data) {
        return JSON.parse(response.data);
      }
      return null;
    } catch (error) {
      console.error('Failed to query market state:', error);
      throw error;
    }
  }

  // Query player state by player ID  
  async queryPlayerState(playerId: [string, string]): Promise<any> {
    try {
      const response: any = await this.rpc.queryState(this.privkey);
      if (response && response.data) {
        const data = JSON.parse(response.data);
        // Filter for specific player data if needed
        return data;
      }
      return null;
    } catch (error) {
      console.error('Failed to query player state:', error);
      throw error;
    }
  }

  // Query configuration
  async queryConfig(): Promise<any> {
    try {
      const response: any = await this.rpc.queryConfig();
      if (response && response.data) {
        return JSON.parse(response.data);
      }
      return null;
    } catch (error) {
      console.error('Failed to query config:', error);
      throw error;
    }
  }

  // Query market liquidity history for the last N counters
  async queryMarketHistory(upToCounter: number): Promise<any> {
    try {
      const response: any = await this.rpc.queryData(`market/${upToCounter}`);
      return response;
    } catch (error) {
      console.error('Failed to query market history:', error);
      throw error;
    }
  }

  // Query user transaction history
  async queryUserHistory(playerId: [string, string]): Promise<any> {
    try {
      const response: any = await this.rpc.queryData(`history/${playerId[0]}/${playerId[1]}`);
      return response;
    } catch (error) {
      console.error('Failed to query user history:', error);
      throw error;
    }
  }

  // Get player recent transactions across all markets
  async getPlayerRecentTransactions(playerId1: string, playerId2: string, count: number = 20): Promise<any[]> {
    try {
      const response = await this.rpc.queryData(`player/${playerId1}/${playerId2}/recent`);
      const result = response as any;
      if (!result.success) {
        throw new Error(result.message || 'Failed to get player transactions');
      }
      return result.data;
    } catch (error) {
      console.error('Failed to get player recent transactions:', error);
      throw error;
    }
  }

  // Get player recent transactions for specific market
  async getPlayerMarketRecentTransactions(playerId1: string, playerId2: string, marketId: string, count: number = 20): Promise<any[]> {
    try {
      const response = await this.rpc.queryData(`player/${playerId1}/${playerId2}/market/${marketId}/recent`);
      const result = response as any;
      if (!result.success) {
        throw new Error(result.message || 'Failed to get player market transactions');
      }
      return result.data;
    } catch (error) {
      console.error('Failed to get player market recent transactions:', error);
      throw error;
    }
  }

  // Get recent transactions
  async getRecentTransactions(count: number = 20): Promise<TransactionData[]> {
    try {
      const response = await this.rpc.queryData(`recent/${count}`);
      const result = response as any;
      if (!result.success) {
        throw new Error(result.message || 'Failed to get recent transactions');
      }  
      return result.data;
    } catch (error) {
      console.error('Failed to get recent transactions:', error);
      throw error;
    }
  }

  // === Multi-Market API Methods ===
  
  // Get all markets
  async getAllMarkets(): Promise<any[]> {
    try {
      const response = await this.rpc.queryData('markets');
      const result = response as any;
      if (!result.success) {
        throw new Error(result.message || 'Failed to get markets');
      }
      return (result.data || []).map((m: any) => this.normalizeMarket(m));
    } catch (error) {
      console.error('Failed to get all markets:', error);
      throw error;
    }
  }

  // Get specific market details
  async getMarket(marketId: string): Promise<any> {
    try {
      const response = await this.rpc.queryData(`market/${marketId}`);
      const result = response as any;
      if (!result.success) {
        throw new Error(result.message || 'Failed to get market');
      }
      return this.normalizeMarket(result.data);
    } catch (error) {
      console.error('Failed to get market:', error);
      throw error;
    }
  }

  // Get recent transactions for specific market
  async getMarketRecentTransactions(marketId: string, count: number = 20): Promise<TransactionData[]> {
    try {
      const response = await this.rpc.queryData(`market/${marketId}/recent`);
      const result = response as any;
      if (!result.success) {
        throw new Error(result.message || 'Failed to get market transactions');
      }
      return result.data;
    } catch (error) {
      console.error('Failed to get market recent transactions:', error);
      throw error;
    }
  }

  // Get player position in specific market
  async getPlayerMarketPosition(playerId1: string, playerId2: string, marketId: string): Promise<any> {
    try {
      const response = await this.rpc.queryData(`player/${playerId1}/${playerId2}/market/${marketId}`);
      const result = response as any;
      if (!result.success) {
        throw new Error(result.message || 'Failed to get player position');
      }
      return result.data;
    } catch (error) {
      console.error('Failed to get player market position:', error);
      throw error;
    }
  }

  // Get market liquidity history for recent 100 counters (only liquidity data)
  async getMarketLiquidityHistory(marketId: string): Promise<any[]> {
    try {
      const response = await this.rpc.queryData(`market/${marketId}/liquidity`);
      const result = response as any;
      if (!result.success) {
        throw new Error(result.message || 'Failed to get market liquidity history');
      }
      return result.data;
    } catch (error) {
      console.error('Failed to get market liquidity history:', error);
      throw error;
    }
  }

  // === Market-specific transaction methods (updated to include marketId) ===
  
  // Place a bet on specific market: BET command
  async placeBetOnMarket(marketId: string, betType: number, amount: string): Promise<any> {
    let nonce = await this.getNonce();
    const command = createCommand(nonce, BigInt(CommandType.BET), [
      BigInt(marketId), 
      BigInt(betType), 
      BigInt(amount)
    ]);
    return await this.sendTransactionWithCommand(command);
  }

  // Sell shares on specific market: SELL command
  async sellSharesOnMarket(marketId: string, betType: number, amount: string): Promise<any> {
    let nonce = await this.getNonce();
    const command = createCommand(nonce, BigInt(CommandType.SELL), [
      BigInt(marketId), 
      BigInt(betType), 
      BigInt(amount)
    ]);
    return await this.sendTransactionWithCommand(command);
  }

  // Claim winnings from specific market: CLAIM command
  async claimWinningsFromMarket(marketId: string): Promise<any> {
    let nonce = await this.getNonce();
    const command = createCommand(nonce, BigInt(CommandType.CLAIM), [BigInt(marketId)]);
    return await this.sendTransactionWithCommand(command);
  }
}

export default PredictionMarketAPI; 