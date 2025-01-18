const express = require('express');
const request = require('request');
const cron = require('node-cron');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.get('/cron', (req, res) => {
    const { url, time } = req.query;

    if (!url || !time) {
        return res.status(400).send('Thiếu thông tin URL hoặc thời gian (time).');
    }

    let cronTime;

    // Kiểm tra nếu `time` là số giây
    const isNumber = /^\d+$/.test(time);
    if (isNumber) {
        const seconds = parseInt(time, 10);
        if (seconds < 1 || seconds > 59) {
            return res.status(400).send('Thời gian (time) phải nằm trong khoảng 1-59 giây.');
        }
        cronTime = `*/${seconds} * * * * *`; // Biểu thức cron tương ứng với số giây
    } else {
        // Nếu không phải số, kiểm tra xem có phải biểu thức cron hợp lệ không
        const cronRegex = /^(\*|\d+|([0-5]?\d)(-[0-5]?\d)?(\/[0-5]?\d)?) ?(\*|\d+|([0-5]?\d)(-[0-5]?\d)?(\/[0-5]?\d)?){4}$/;
        if (!cronRegex.test(time)) {
            return res.status(400).send('Định dạng cron không hợp lệ.');
        }
        cronTime = time; // Sử dụng trực tiếp biểu thức cron
    }

    try {
        // Tạo cron job
        cron.schedule(cronTime, () => {
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

        // Lưu URL vào input.txt
        fs.appendFileSync('input.txt', url + '\n');
        res.send(`Đã lên lịch và lưu URL: ${url} với thời gian: ${time} giây (cron: ${cronTime})`);
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

// Chạy server
app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
