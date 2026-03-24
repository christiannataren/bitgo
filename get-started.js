const BitGoJS = require('bitgo');
require('dotenv').config();

async function main() {
    const bitgo = new BitGoJS.BitGo({
        env: 'test',
        accessToken: process.env.BITGO_ACCESS_TOKEN,
    });

    // Verify authentication by fetching your user profile
    const user = await bitgo.me();
    console.log('Authenticated as:', user.username);
    console.log('User ID:', user.id);
}



main().catch(console.error);