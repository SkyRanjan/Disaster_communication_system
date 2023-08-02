var http = require('http').createServer(handler);
var fs = require('fs');
var url = require('url');
var path = require('path');
var io = require('socket.io')(http);
var Gpio = require('onoff').Gpio;

var LED26 = new Gpio(26, 'out');
var LED20 = new Gpio(20, 'out');
var LED21 = new Gpio(21, 'out');
var LED16 = new Gpio(16, 'out');

var GPIO26value = 0;
var GPIO20value = 0;
var GPIO21value = 0;
var GPIO16value = 0;

const WebPort = 80;

http.listen(WebPort, function () {
  LED26.writeSync(GPIO26value);
  LED20.writeSync(GPIO20value);
  LED21.writeSync(GPIO21value);
  LED16.writeSync(GPIO16value);
  console.log('Server running on Port ' + WebPort);
});

function handler(req, res) {
  var q = url.parse(req.url, true);
  var filename = "." + q.pathname;
  console.log('filename=' + filename);
  var extname = path.extname(filename);
  if (filename == './') {
    console.log('retrieving default index.html file');
    filename = './index.html';
  }

  var contentType = 'text/html';

  switch (extname) {
    case '.js':
      contentType = 'text/javascript';
      break;
    case '.css':
      contentType = 'text/css';
      break;
    case '.json':
      contentType = 'application/json';
      break;
    case '.png':
      contentType = 'image/png';
      break;
    case '.jpg':
      contentType = 'image/jpg';
      break;
    case '.ico':
      contentType = 'image/png';
      break;
  }

  fs.readFile(__dirname + '/public/' + filename, function (err, content) {
    if (err) {
      console.log('File not found. Filename=' + filename);
      fs.readFile(__dirname + '/public/404.html', function (err, content) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end(content, 'utf8');
      });
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      return res.end(content, 'utf8');
    }
  });
}

process.on('SIGINT', function () {
  LED26.writeSync(0);
  LED26.unexport();

  LED20.writeSync(0);
  LED20.unexport();

  LED21.writeSync(0);
  LED21.unexport();

  LED16.writeSync(0);
  LED16.unexport();

  process.exit();
});

io.sockets.on('connection', function (socket) {
  console.log('A new client has connected. Send LED status');
  socket.emit('GPIO26', GPIO26value);
  socket.emit('GPIO20', GPIO20value);
  socket.emit('GPIO21', GPIO21value);
  socket.emit('GPIO16', GPIO16value);

  socket.on('morseCode', function (morseCode) {
    console.log('Received Morse code:', morseCode);
    executeMorseCode(morseCode);
  });

  socket.on('disconnect', function () {
    console.log('A user disconnected');
  });
});

// Execute Morse code on the GPIO pins
function executeMorseCode(morseCode) {
  const dotDuration = 200;
  const dashDuration = dotDuration * 3; // Duration of a dash (3 times the dot duration)

  let index = 0;
  let timerId;

  function toggleGPIO26() {
    LED26.writeSync(GPIO26value);
    GPIO26value = GPIO26value === 1 ? 0 : 1;
  }

  function toggleGPIO20() {
    LED20.writeSync(GPIO20value);
    GPIO20value = GPIO20value === 1 ? 0 : 1;
  }

  function toggleGPIO21() {
    LED21.writeSync(GPIO21value);
    GPIO21value = GPIO21value === 1 ? 0 : 1;
  }

  function toggleGPIO16() {
    LED16.writeSync(GPIO16value);
    GPIO16value = GPIO16value === 1 ? 0 : 1;
  }

  function executeNextSymbol() {
    if (index >= morseCode.length) {
      clearTimeout(timerId);
      // Turn off all LEDs after the full translation is executed
      LED26.writeSync(0);
      LED20.writeSync(0);
      LED21.writeSync(0);
      LED16.writeSync(0);
      return;
    }

    const symbol = morseCode[index];
    index++;

    if (symbol === '.') {
      toggleGPIO26();
      toggleGPIO16();
      timerId = setTimeout(executeNextSymbol, dotDuration);
    } else if (symbol === '-') {
      toggleGPIO20();
      toggleGPIO21();
      timerId = setTimeout(executeNextSymbol, dashDuration);
    } else if (symbol === ' ') {
      timerId = setTimeout(executeNextSymbol, dotDuration);
    } else {
      timerId = setTimeout(executeNextSymbol, dotDuration);
    }
  }

  executeNextSymbol();
}