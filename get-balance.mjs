import * as dotenv from "dotenv";
import { EnvironmentName } from "bitgo";
import { BitGoAPI } from "@bitgo/sdk-api";
import { Tbtc4 } from "@bitgo/sdk-coin-btc";

dotenv.config();

/**
 * Get wallet balance for a Bitcoin testnet wallet
 * @param {string} [walletId] - Wallet ID (defaults to process.env.WALLET_ID)
 * @param {string} [coin] - Coin type (defaults to 'tbtc4' for Bitcoin testnet)
 * @returns {Promise<Object>} The wallet object containing balance and details
 * @throws {Error} If walletId is not provided or API call fails
 */
export async function getBalance(walletId = process.env.WALLET_ID, coin = 'tbtc4') {
    // Validate required parameters
    if (!walletId) {
        throw new Error('Wallet ID is required. Provide as parameter or set WALLET_ID environment variable.');
    }

    // Initialize BitGo API with environment configuration
    const bitgo = new BitGoAPI({
        env: process.env.ENV || 'test',
        accessToken: process.env.BITGO_ACCESS_TOKEN || process.env.TESTNET_ACCESS_TOKEN
    });

    // Register the coin type
    bitgo.register(coin, Tbtc4.createInstance);

    // Fetch the wallet
    const wallet = await bitgo.coin(coin).wallets().get({ id: walletId });
    
    // Return the wallet object (contains balance, addresses, etc.)
    return wallet._wallet;
}

/**
 * Example usage (commented out):
 * 
 * ```javascript
 * import { getBalance } from './get-balance.mjs';
 * 
 * async function main() {
 *     try {
 *         const wallet = await getBalance();
 *         console.log('Wallet balance:', wallet.balance);
 *         console.log('Wallet details:', wallet);
 *     } catch (error) {
 *         console.error('Failed to get balance:', error.message);
 *     }
 * }
 * 
 * main();
 * ```
 */