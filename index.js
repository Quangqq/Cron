var express = require('express');
var request = require('request');
var cron = require('node-cron');
var fs = require("fs");
var os = require("os");
var moment = require("moment-timezone");

var app = express();
var port = 3000;
var startTime = new Date();
moment.tz.setDefault("Asia/Ho_Chi_Minh");

// Thông tin bot Telegram
var TELEGRAM_BOT_TOKEN = "7343934780:AAFQw9Eskp3x1YR911iv8zmr5E6xIiiiDtc";  
var TELEGRAM_CHAT_ID = "-1002467025729";      

// Đọc danh sách URL từ tệp input.txt
var data = fs.readFileSync('input.txt', 'utf8').toString().split('\n').map(url => url.trim()).filter(url => url);

var i = 1;
var sessionLog = [];
var requestStats = {}; 

// Hàm lấy thông tin hệ thống
function getSystemInfo() {
    let uptimeSeconds = os.uptime();
    let uptimeFormatted = new Date(uptimeSeconds * 1000).toISOString().substr(11, 8); 

    return {
        current_time: moment().format("HH:mm:ss DD/MM/YYYY"),
        uptime: uptimeFormatted,
        cpu_load: os.loadavg()[0].toFixed(2),
        total_ram: `${(os.totalmem() / 1024 / 1024).toFixed(2)} MB`,
        used_ram: `${((os.totalmem() - os.freemem()) / 1024 / 1024).toFixed(2)} MB`,
        session_count: i - 1
    };
}

// Gửi tin nhắn đến Telegram
function sendTelegramMessage(text) {
    let url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    let options = {
        url: url,
        method: "POST",
        json: true,
        body: { chat_id: TELEGRAM_CHAT_ID, text: text }
    };

    request(options, () => {});
}

// Kiểm tra từng URL định kỳ
data.forEach((url) => {
    requestStats[url] = { success: 0, fail: 0 };

    cron.schedule('*/1 * * * * *', () => { 
        let sessionId = i++;
        request(url, function(error, response) {
            if (!error && response.statusCode == 200) {
                requestStats[url].success++; 
                sessionLog.push({
                    session: sessionId,
                    url: url,
                    status: response.statusCode,
                    timestamp: moment().format("HH:mm:ss DD/MM/YYYY")
                });
            } else {
                requestStats[url].fail++;
            }
        });
    });
});

// API hiển thị thông tin chi tiết
app.get('/', (req, res) => {
    res.json({
        current_time: moment().format("HH:mm:ss DD/MM/YYYY"),
        total_sessions: i - 1,
        monitored_urls: data,
        request_stats: requestStats,
        server_uptime: getSystemInfo().uptime,
        logs: sessionLog.slice(-10),
        system_info: getSystemInfo()
    });
});

// Cron job gửi báo cáo Telegram mỗi phút
cron.schedule('*/1 * * * *', () => {
    request(`http://localhost:${port}`, (error, response) => {
        if (!error && response.statusCode == 200) {
            let systemInfo = getSystemInfo();
            let message = `✅ [PING] Server hoạt động!\n\n` +
                          `🕒 Thời gian: ${systemInfo.current_time}\n` +
                          `⏳ Uptime: ${systemInfo.uptime}\n` +
                          `💻 Session: ${systemInfo.session_count}\n` +
                          `⚡ CPU Load: ${systemInfo.cpu_load}\n` +
                          `💾 RAM: ${systemInfo.used_ram} / ${systemInfo.total_ram}`;
            sendTelegramMessage(message);
        }
    });
});

// Chạy server
app.listen(port);
