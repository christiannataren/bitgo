import * as dotenv from "dotenv";
import { BitGoAPI } from "@bitgo/sdk-api";
import { Tbtc4 } from "@bitgo/sdk-coin-btc";

dotenv.config();

/**
 * Get wallet balance for a Bitcoin testnet wallet
 * @returns {Promise<Object>} The wallet object containing balance and details
 * @throws {Error} If walletId is not provided or API call fails
 */
export async function getBalance() {
    const bitgo = new BitGoAPI({
        env: process.env.ENV,
        accessToken: process.env.BITGO_ACCESS_TOKEN
    });

    const coin = 'tbtc4';
    bitgo.register(coin, Tbtc4.createInstance);

    const walletId = process.env.WALLET_ID;
    const wallet = await bitgo.coin(coin).wallets().get({ id: walletId });

    return wallet._wallet;
}
