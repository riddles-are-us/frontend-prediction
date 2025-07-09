import { createAsyncThunk } from "@reduxjs/toolkit";
import type { L1AccountInfo } from "zkwasm-minirollup-browser";
import {
  createCommand,
  createWithdrawCommand,
  ZKWasmAppRpc,
} from "zkwasm-minirollup-rpc";
import { getRpcUrl, setRpcUrl } from "zkwasm-minirollup-browser";


export const fullUrl = getRpcUrl();
const rpc = new ZKWasmAppRpc(fullUrl);

// Command constants
const CMD_WITHDRAW = 2n;

// Send transaction function (direct implementation without Redux)
export const sendTransaction = async (params: { cmd: BigUint64Array; prikey: string }) => {
  try {
    const { cmd, prikey } = params;
    console.log("Sending transaction with command:", cmd);
    console.log("Private key length:", prikey.length);
    const state: any = await rpc.sendTransaction(cmd, prikey);
    console.log("fullUrl is", fullUrl);
    console.log("(Data-Transaction)", state);
    return state;
  } catch (err: any) {
    console.error("Transaction error details:", {
      message: err.message,
      response: err.response,
      status: err.response?.status,
      data: err.response?.data
    });
    throw new Error(err.message || "UnknownError");
  }
};

// Get withdraw transaction command array
export function getWithdrawTransactionCommandArray(
  nonce: number,
  amount: bigint,
  account: L1AccountInfo
): BigUint64Array {
  console.log("withdraw address", account);
  const address = account!.address.slice(2);
  console.log("address is", address);
  console.log("address be is", Array.from(address).map(c => c.charCodeAt(0)));
  console.log("withdraw parameters:", { nonce, amount: amount.toString() });
  
  const command = createWithdrawCommand(
    BigInt(nonce),
    CMD_WITHDRAW,
    address,
    0n,
    amount
  );
  
  console.log("withdraw command created:", command);
  return command;
}

// Query state function
async function queryStateI(prikey: string) {
  try {
    const data: any = await rpc.queryState(prikey);
    return JSON.parse(data.data);
  } catch (error: any) {
    if (error.response) {
      if (error.response.status === 500) {
        throw new Error("QueryStateError");
      } else {
        throw new Error("UnknownError");
      }
    } else if (error.request) {
      throw Error(
        "No response was received from the server, please check your network connection."
      );
    } else {
      throw Error("UnknownError");
    }
  }
}

export const queryState = createAsyncThunk(
  "client/queryState",
  async (key: string, { rejectWithValue }) => {
    try {
      const state: any = await queryStateI(key);
      console.log("(Data-QueryState)", state);
      return state;
    } catch (err: any) {
      return rejectWithValue(err);
    }
  }
); 