const TelegramBot = require('node-telegram-bot-api');
const request = require('request');
const cron = require('node-cron');
const fs = require('fs');

// Thay YOUR_TELEGRAM_BOT_TOKEN bằng token bot của bạn
const TOKEN = '7429272887:AAEPoofuO1bgsrCEFLEG7E-gse-Vm-sJEuI';
const bot = new TelegramBot(TOKEN, { polling: true });

let cronJobs = {}; // Lưu trữ cron job của từng người dùng

// Lệnh /start
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(
        msg.chat.id,
        `Chào ${msg.from.first_name || 'bạn'}! Tôi là bot hỗ trợ chạy cronjob. Sử dụng /help để xem hướng dẫn.`
    );
});

// Lệnh /help
bot.onText(/\/help/, (msg) => {
    bot.sendMessage(
        msg.chat.id,
        `Hướng dẫn sử dụng:\n` +
        `/cron <url> <second>: Chạy cronjob với <url> mỗi <second> giây.\n` +
        `Ví dụ: /cron https://domain.com/cron.php 5 (chạy mỗi 5 giây).\n` +
        `/stop <url>: Dừng cronjob cho <url>.\n`
    );
});

// Lệnh /cron
bot.onText(/\/cron (.+) (\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const url = match[1];
    const seconds = parseInt(match[2]);

    if (cronJobs[chatId] && cronJobs[chatId][url]) {
        bot.sendMessage(chatId, `Cronjob cho URL ${url} đã tồn tại.`);
        return;
    }

    if (!cronJobs[chatId]) {
        cronJobs[chatId] = {};
    }

    const job = cron.schedule(`*/${seconds} * * * * *`, () => {
        request(url, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                console.log(`User ${msg.from.username || msg.from.first_name} đang chạy cronjob: ${url}`);
            } else {
                console.error(`Lỗi khi gọi URL ${url}:`, error);
            }
        });
    });

    cronJobs[chatId][url] = job;

    bot.sendMessage(chatId, `Đã bắt đầu cronjob cho URL ${url} mỗi ${seconds} giây.`);
});

// Lệnh /stop
bot.onText(/\/stop (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const url = match[1];

    if (cronJobs[chatId] && cronJobs[chatId][url]) {
        cronJobs[chatId][url].stop();
        delete cronJobs[chatId][url];

        bot.sendMessage(chatId, `Đã dừng cronjob cho URL ${url}.`);
        const adminId = '6081972689'; // Thay bằng ID admin
        bot.sendMessage(
            adminId,
            `Người dùng ${msg.from.username || msg.from.first_name} (ID: ${msg.from.id}) vừa dừng cronjob cho URL: ${url}.`
        );
    } else {
        bot.sendMessage(chatId, `Không tìm thấy cronjob cho URL ${url}.`);
    }
});

// Xử lý khi bot nhận tin nhắn không xác định
bot.on('message', (msg) => {
    if (!msg.text.startsWith('/')) {
        bot.sendMessage(msg.chat.id, `Tôi không hiểu lệnh này. Sử dụng /help để xem hướng dẫn.`);
    }
});
