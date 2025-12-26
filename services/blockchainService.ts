
/**
 * BITCOIN BLOCKCHAIN VERIFICATION SERVICE
 * Interfaces with the public Blockstream API to verify BTC transfers.
 */

const API_BASE = "https://blockstream.info/api";
const WALLET_ADDRESS = "15yoEV6mcc1gmP3pnfQzJubaoUwzDYnrNR";

export interface VerificationResult {
  success: boolean;
  amount?: string;
  timestamp?: string;
  error?: string;
  confirmations?: number;
}

export const verifyBitcoinTransaction = async (): Promise<VerificationResult> => {
  try {
    // 1. Fetch recent transactions for the BTC address
    const response = await fetch(`${API_BASE}/address/${WALLET_ADDRESS}/txs`);
    if (!response.ok) throw new Error("Bitcoin Node unreachable");
    
    const txs = await response.json();

    if (!txs || txs.length === 0) {
      return { success: false, error: "No transactions found for this address on the ledger." };
    }

    // 2. Find the most recent transaction that sends to our address
    // We look for a transaction where one of the outputs is our WALLET_ADDRESS
    const incomingTx = txs.find((tx: any) => 
      tx.vout.some((out: any) => out.scriptpubkey_address === WALLET_ADDRESS)
    );

    if (!incomingTx) {
      return { success: false, error: "No incoming payments detected for this address." };
    }

    // 3. Extract the amount sent to us
    const output = incomingTx.vout.find((out: any) => out.scriptpubkey_address === WALLET_ADDRESS);
    const amountSats = output.value;
    const amountBTC = (amountSats / 100000000).toFixed(8);

    // 4. Check confirmations (Status)
    const isConfirmed = incomingTx.status.confirmed;
    const timestamp = isConfirmed 
      ? new Date(incomingTx.status.block_time * 1000).toISOString() 
      : "Unconfirmed (Pending)";

    // 5. Freshness check (within last 24 hours)
    if (isConfirmed) {
      const txTime = incomingTx.status.block_time * 1000;
      const now = Date.now();
      if (now - txTime > 86400000) {
        return { success: false, error: "The most recent transaction is older than 24 hours. Please send a new one." };
      }
    }

    return {
      success: true,
      amount: amountBTC,
      timestamp: timestamp,
      confirmations: isConfirmed ? 1 : 0 // Blockstream basic check
    };

  } catch (error: any) {
    console.error("Bitcoin verification error:", error);
    return { success: false, error: "Network error during blockchain audit." };
  }
};
