import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import TelegramBot from 'node-telegram-bot-api';
dotenv.config();

const app = express();
const port = 3000;
const walletAddress = process.env.WALLET_ADDRESS;
const apiUrl = `https://api.mainnet-beta.solana.com`;

const telegramToken = process.env.TELEGRAM_TOKEN;
const chatId = process.env.CHAT_ID;
const mybot = new TelegramBot(telegramToken, { polling: true });

//Fetching Transaction Data 
const fetchComfirmedTransactions = async(walletAddress) => {
    try {
        const response = await axios.post(apiUrl, {
            jsonrpc: "2.0",
            id: 1,
            method: "getConfirmedSignaturesForAddress2",
            params: [
                walletAddress,
                {limit: 1000}
            ]
        });
        return response.data.result;
    } catch (error) {
        console.error("Error while fetching Transactions Data: ", error);
    }
};

const MAX_MESSAGE_LENGTH = 4096; //Maximum allowed length of message on telegram
function splitMessage(message) {
    const messageChunks = [];
    while (message.length > 0) {
        let chunk = message.slice(0, MAX_MESSAGE_LENGTH);
        messageChunks.push(chunk);
        message = message.slice(MAX_MESSAGE_LENGTH);
    }
    return messageChunks;
}

const sendTelegramMessage = async (message) => {
    const messagechunks = splitMessage(message);
    try {
        for (const chunk of messagechunks){
            await mybot.sendMessage(chatId, chunk);
        }
        console.log()
    } catch (error) {
        console.error("Cant Send Message to Bot", error);
    }
}

const formatTransactionData = (transactions) => {
    return transactions.map(transaction => {
        return {
            uuid: transaction.signature,
            network: "Solana",
            timestamp: new Date(transaction.blockTime * 1000).toISOString(),
            type: transaction.err ? 'failed_transaction' : 'send_token', // Adjust based on the presence of `err`
            wallet_address: walletAddress,
            transaction_hash: transaction.signature,
            metadata: {
                amount: transaction.memo ? transaction.memo.trim() : "0" // Adjust amount based on memo; placeholder if memo is not useful
            },
            token: {
                network: "Solana",
                name: "Wrapped SOL",
                symbol: "SOL",
                decimals: 9,
                display_decimals: 2,
            },
            explorer_url: `https://solscan.io/tx/${transaction.signature}?cluster=mainnet-beta`
        };
    });
};




app.get('/transactiondata', async(req, res) => {
    try {
        const transactions = await fetchComfirmedTransactions(walletAddress);
        const outputData = formatTransactionData(transactions);
        const responseMessage = JSON.stringify({
            status: "success",
            data: outputData,
            message: "Activity retrieve successfully"
        }, null, 2);
        await sendTelegramMessage(responseMessage);
        res.json({
            status: "success",
            message: "Activity retrieved successfully",
            data: outputData
        });
    } catch (error) {
        res.status(500).json({error: "FAILED TRANSACTION FETCHING"});
    }
});

app.listen(port, ()=>{
    console.log("server is running successfully");
})