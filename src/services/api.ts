import { createCommand, PlayerConvention, ZKWasmAppRpc } from 'zkwasm-minirollup-rpc';
import { CommandType } from "../types/market";

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
}

export default PredictionMarketAPI; 