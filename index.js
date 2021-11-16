const http = require('http');
const https = require('https');
const httpProxy = require('http-proxy');

const RuntimeValidator = require('./services/RuntimeValidator');
const Logger = require('./services/reportConsole');

global._ = require('lodash');
global.ERROR = require('./services/errorCodes');
global.$ = new Logger();

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const runtimeValidator = new RuntimeValidator();

const agent = new http.Agent({ path: process.env.TARGET, rejectUnauthorized: false });
const proxyServer = httpProxy.createProxyServer({
    target: process.env.TARGET,
    selfHandleResponse: true,
    changeOrigin: true,
    agent
});

proxyServer.on('proxyRes',(proxyRes, req, res) => {
    runtimeValidator.validate(proxyRes, req, res);
});

const httpServer = http.createServer((req, res)=>proxyServer.web(req, res));

httpServer.listen(process.env.PORT || 5050,()=>{
    console.log('SERVER', `listining on port ${process.env.PORT || 5050}`);
});
