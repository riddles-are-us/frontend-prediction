import { ZKWasmAppRpc } from 'zkwasm-minirollup-rpc';
import { CommandType } from "../types/market";

interface ServerConfig {
  serverUrl: string;
  privkey: string;
}

class PredictionMarketAPI {
  private rpc: ZKWasmAppRpc;
  private privkey: string;

  constructor(config: ServerConfig) {
    this.privkey = config.privkey;
    this.rpc = new ZKWasmAppRpc(config.serverUrl);
  }

  // Helper function to create command array
  private createCommand(...args: (string | number)[]): BigUint64Array {
    return new BigUint64Array(args.map(arg => BigInt(arg)));
  }

  // Register a new player
  async registerPlayer(): Promise<any> {
    const command = this.createCommand(CommandType.INSTALL_PLAYER);
    const response = await this.rpc.sendTransaction(command, this.privkey);
    return response;
  }

  // Place a bet: BET command
  async placeBet(betType: number, amount: string): Promise<any> {
    const command = this.createCommand(
      CommandType.BET,
      betType,
      amount
    );
    const response = await this.rpc.sendTransaction(command, this.privkey);
    return response;
  }

  // Sell shares: SELL command
  async sellShares(betType: number, amount: string): Promise<any> {
    const command = this.createCommand(
      CommandType.SELL,
      betType,
      amount
    );
    const response = await this.rpc.sendTransaction(command, this.privkey);
    return response;
  }

  // Claim winnings: CLAIM command
  async claimWinnings(): Promise<any> {
    const command = this.createCommand(CommandType.CLAIM);
    const response = await this.rpc.sendTransaction(command, this.privkey);
    return response;
  }

  // Resolve market (admin only): RESOLVE command
  async resolveMarket(outcome: boolean): Promise<any> {
    const command = this.createCommand(
      CommandType.RESOLVE,
      outcome ? 1 : 0
    );
    const response = await this.rpc.sendTransaction(command, this.privkey);
    return response;
  }

  // Withdraw fees (admin only): WITHDRAW_FEES command
  async withdrawFees(): Promise<any> {
    const command = this.createCommand(CommandType.WITHDRAW_FEES);
    const response = await this.rpc.sendTransaction(command, this.privkey);
    return response;
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
  async queryPlayerState(playerId: [number, number]): Promise<any> {
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

  // Deposit funds: DEPOSIT command
  async depositFunds(playerId: [number, number], amount: string): Promise<any> {
    const command = this.createCommand(
      CommandType.DEPOSIT,
      playerId[0],
      playerId[1],
      amount
    );
    const response = await this.rpc.sendTransaction(command, this.privkey);
    return response;
  }

  // Withdraw funds: WITHDRAW command
  async withdrawFunds(amount: string): Promise<any> {
    const command = this.createCommand(
      CommandType.WITHDRAW,
      amount
    );
    const response = await this.rpc.sendTransaction(command, this.privkey);
    return response;
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
}

export default PredictionMarketAPI; 