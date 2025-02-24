var express = require('express');
var request = require('request');
var cron = require('node-cron');
var fs = require("fs");
var os = require("os");
var moment = require("moment-timezone");

var app = express();
var port = 3000; // Chọn cổng tùy ý
var startTime = new Date(); // Thời gian server bắt đầu chạy

// Cấu hình múi giờ (có thể đổi thành "Asia/Ho_Chi_Minh" nếu cần)
moment.tz.setDefault("Asia/Ho_Chi_Minh");

// Thông tin bot Telegram
var TELEGRAM_BOT_TOKEN = "7343934780:AAFQw9Eskp3x1YR911iv8zmr5E6xIiiiDtc";  // 🔹 Thay bằng token bot của bạn
var TELEGRAM_CHAT_ID = "-1002467025729";      // 🔹 Thay bằng chat ID để nhận tin nhắn

// Đọc danh sách URL từ tệp input.txt
var data = fs.readFileSync('input.txt', 'utf8').toString().split('\n').map(url => url.trim()).filter(url => url);

var i = 1;
var sessionLog = [];
var requestStats = {}; // Thống kê request

// Hàm lấy thông tin hệ thống (CPU, RAM, uptime)
function getSystemInfo() {
    let uptimeSeconds = os.uptime();
    let uptimeFormatted = new Date(uptimeSeconds * 1000).toISOString().substr(11, 8); // hh:mm:ss

    return {
        current_time: moment().format("HH:mm:ss DD/MM/YYYY"),
        uptime: uptimeFormatted,
        cpu_load: os.loadavg()[0].toFixed(2), // Load trung bình CPU trong 1 phút
        total_ram: `${(os.totalmem() / 1024 / 1024).toFixed(2)} MB`, // Tổng RAM
        free_ram: `${(os.freemem() / 1024 / 1024).toFixed(2)} MB`, // RAM còn trống
        used_ram: `${((os.totalmem() - os.freemem()) / 1024 / 1024).toFixed(2)} MB`, // RAM đã sử dụng
    };
}

// Gửi tin nhắn đến Telegram
function sendTelegramMessage(text) {
    let url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    let options = {
        url: url,
        method: "POST",
        json: true,
        body: {
            chat_id: TELEGRAM_CHAT_ID,
            text: text
        }
    };

    request(options, (error, response) => {
        if (error) {
            console.log("[❌] Lỗi gửi Telegram:", error);
        } else {
            console.log("[✅] Đã gửi Telegram:", text);
        }
    });
}

// Kiểm tra từng URL theo thời gian định kỳ
data.forEach((url) => {
    requestStats[url] = { success: 0, fail: 0 }; // Khởi tạo bộ đếm

    cron.schedule('*/1 * * * * *', () => { // Chạy mỗi giây
        let sessionId = i++;
        request(url, function(error, response, body) {
            if (!error && response.statusCode == 200) {
                requestStats[url].success++; // Tăng số lần thành công
                let logEntry = {
                    session: sessionId,
                    url: url,
                    status: response.statusCode,
                    response: body.substring(0, 200), // Giới hạn phản hồi (200 ký tự)
                    timestamp: moment().format("HH:mm:ss DD/MM/YYYY")
                };
                sessionLog.push(logEntry);
                console.log(logEntry);
            } else {
                requestStats[url].fail++; // Tăng số lần thất bại
                console.log(`[❌] ${moment().format("HH:mm:ss DD/MM/YYYY")} - Lỗi khi request đến: ${url}`);
            }
        });
    });
});

// API hiển thị thông tin chi tiết
app.get('/', (req, res) => {
    res.json({
        current_time: moment().format("HH:mm:ss DD/MM/YYYY"),
        total_sessions: i - 1,
        monitored_urls: data, // Danh sách URL đang theo dõi
        request_stats: requestStats, // Thống kê request thành công/thất bại
        server_uptime: getSystemInfo().uptime, // Thời gian server chạy
        logs: sessionLog.slice(-10), // Hiển thị 10 log mới nhất
        system_info: getSystemInfo() // Thêm thông tin hệ thống
    });
});

// Cron job gửi "ping" mỗi phút + Gửi thông tin hệ thống đến Telegram
cron.schedule('*/1 * * * *', () => {
    request(`http://localhost:${port}`, (error, response) => {
        if (!error && response.statusCode == 200) {
            console.log(`[✅] ${moment().format("HH:mm:ss DD/MM/YYYY")} - Server vẫn hoạt động!`);

            let systemInfo = getSystemInfo();
            let message = `✅ [PING] Server hoạt động!\n\n` +
                          `🕒 Thời gian: ${systemInfo.current_time}\n` +
                          `⏳ Uptime: ${systemInfo.uptime}\n` +
                          `⚡ CPU Load: ${systemInfo.cpu_load}\n` +
                          `💾 RAM: ${systemInfo.used_ram} / ${systemInfo.total_ram} MB`;

            sendTelegramMessage(message);
        } else {
            console.log(`[❌] ${moment().format("HH:mm:ss DD/MM/YYYY")} - Lỗi khi ping server!`);
        }
    });
});

// Chạy server
app.listen(port, () => {
    console.log(`🚀 Server đang lắng nghe tại http://localhost:${port}`);
});
