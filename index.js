const express = require('express');
const request = require('request');
const cron = require('node-cron');
const fs = require('fs');

const app = express();
const PORT = 4000;

app.get('/cron', (req, res) => {
    const { url, time } = req.query;

    if (!url || !time) {
        return res.status(400).send('Thiếu thông tin URL hoặc thời gian (time).');
    }

    // Kiểm tra định dạng cron
    const cronRegex = /^(\*|\d+|([0-5]?\d)(-[0-5]?\d)?(\/[0-5]?\d)?) ?(\*|\d+|([0-5]?\d)(-[0-5]?\d)?(\/[0-5]?\d)?){4}$/;
    if (!cronRegex.test(time)) {
        return res.status(400).send('Định dạng cron không hợp lệ.');
    }

    try {
        cron.schedule(time, () => {
            request(url, (error, response, body) => {
                if (!error && response.statusCode === 200) {
                    console.log(`Response from ${url}:`);
                    console.log(body);
                    console.log('--------------------------');
                } else {
                    console.error(`Error requesting ${url}:`, error);
                }
            });
        });

        res.send(`Đã lên lịch chạy cron job cho URL: ${url} với thời gian: ${time}`);
    } catch (error) {
        res.status(500).send('Có lỗi xảy ra khi tạo cron job.');
    }
});

// Endpoint thêm URL vào tệp input.txt
app.get('/add-url', (req, res) => {
    const { url } = req.query;
    if (!url) {
        return res.status(400).send('Thiếu thông tin URL.');
    }

    fs.appendFileSync('input.txt', url + '\n');
    res.send(`Đã thêm URL: ${url} vào danh sách.`);
});

app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
