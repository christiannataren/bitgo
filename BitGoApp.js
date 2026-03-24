const dotenv = require('dotenv');
const { BitGoAPI } = require('@bitgo/sdk-api');
const { Tsol } = require('@bitgo/sdk-coin-sol');

dotenv.config();

class BitgoApp {

    async getBalance() {
        const bitgo = new BitGoAPI({
            env: 'test',
            accessToken: process.env.BITGO_ACCESS_TOKEN
        });

        const coin = 'tbtc';
        bitgo.register(coin, Tbtc.createInstance);

        const walletId = process.env.WALLET_ID;
        let wallet = await bitgo.coin(coin).wallets().get({ id: walletId });

        return wallet._wallet;
    }

    async sendMoney(walletSol, ammount) {

        const bitgo = new BitGoAPI({
            env: 'test',
            accessToken: process.env.BITGO_ACCESS_TOKEN
        });
        try {
            await bitgo.unlock({ otp: '0000000', duration: 3600 });
        } catch (e) {

        }
        bitgo.register("tsol", Tsol.createInstance);
        const coin = bitgo.coin("tsol");
        const destinatonAddress = walletSol;
        let wallet = await coin.wallets().get({ id: process.env.WALLET_ID });
        const sendAmount = wallet.balanceString() ?? 0;
        const res = await wallet.sendMany({
            walletPassphrase: process.env.WALLET_PASS_PHRASE,
            recipients: [{ address: destinatonAddress, amount: ammount }],
            type: "transfer",
        });
        console.log(res);
    }
}

module.exports = BitgoApp;