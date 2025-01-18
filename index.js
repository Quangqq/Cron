var request = require('request')
var cron = require('node-cron');
var http = require('http');
var fs = require("fs"); 
var data = fs.readFileSync('input.txt','utf8').toString().split('\n');

var i = 1;
data.forEach(function(value){
    cron.schedule('*/1 * * * * * *', () => {
      request(value, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log("Phiên thứ: "+i++);
            console.log("Response: "+body);
            console.log("--------------------------");
        }
    })
    });
});
const PORT = 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Server is running\n');
}).listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
