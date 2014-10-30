var EventEmitter = require('events').EventEmitter;
var util = require('util');
var fs = require('fs');
var URL = require('url');
var path = require('path');
var curRoot = process.cwd();

var Loger = function(options) {

    this.options = options = options || {};
    var logs = options.logs || {};
    var settings = this.settings = options.settings || {};
    var logObj = {};
    var er = ['parser', 'processor', 'prestorer', 'storer'];
    for (var i in logs) {
        if (logs.hasOwnProperty(i)) {
            var setting = settings[i];

            var module = logs[i] || {};
            var tmp = {};
            //解析器
            //处理器
            //预打包
            //打包
            er.forEach(function(v) {
                if (!v) {
                    return;
                }
                var a = [];
                //取出config中的配置
                var jsonArr = module[v];
                if (!jsonArr) {
                    return;
                }
                if (!util.isArray(jsonArr)) {
                    jsonArr = [jsonArr];
                }
                jsonArr.forEach(function(val) {
                    var p = path.resolve(curRoot, val);
                    var m;
                    if (fs.existsSync(p)) {
                        m = require(p);
                    } else if (fs.existsSync(path.resolve(__dirname, './' + v + '.' + val + '.js'))) {
                        m = require(path.resolve(__dirname, './' + v + '.' + val + '.js'));
                    }
                    if (!m) {
                        return;
                    }
                    if (typeof m.init === 'function') {
                        //初始化
                        m.init(setting[val] || {}, i);
                    }
                    if (typeof m.task === 'function') {
                        m.__name = val;
                        a.push(m);
                    }
                });
                tmp[v] = a;
            });
            logObj[i] = tmp;
        }
    }
    this.logs = logObj;
    EventEmitter.call(this);
    this.init();
};
util.inherits(Loger, EventEmitter);
module.exports = Loger;

Loger.prototype.init = function() {
    var self = this;
    this.on('error', function(error) {
        console.log(error);
    });
    this.on('access_log', this.access);
};
Loger.prototype.parser = function(req, res) {
    var ip = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;
    var url = req.url;
    var ipArr = ip.split(',');
    if (ipArr.length > 1) {
        ip = ipArr.slice(-1)[0];
        ip = ip || '';
    }

    return {
        ip: ip,
        access_time: Math.ceil(Date.now() / 1e3),
        url: url,
        method: req.method,
        referer: req.headers.referer || '',
        userAgent: req.headers['user-agent'],
        query: URL.parse(url, true).query
    };
};
Loger.prototype.access = function(req, res) {
    var basename = path.basename(req.url.split('?')[0]);
    var er = this.logs[basename];
    var self = this;
    //先进行统一预处理
    if (!er) {
        return;
    }
    var data = this.parser(req, res);
    var settings = this.settings[basename] || {};
    var options = this.options;
    var pp = ['parser', 'processor', 'prestorer', 'storer'];
    for (var m = 0, len = pp.length; m < len; m++) {
        var i = pp[m];
        var parser = er[i];
        if (parser && util.isArray(parser) && parser.length !== 0) {
            var args = [data];
            if (i === 'parser') {
                args.push(req, res);
            }
            for (var j = 0, ll = parser.length; j < ll; j++) {
                try {
                    var _parser = parser[j];
                    args.push(settings[_parser.__name], basename, options);
                    data = _parser.task.apply(global, args);
                } catch (e) {
                    self.emit('error', '[' + i + '] parser error: ' + String(e.stack || e));
                    return;
                }

                if (!data) {
                    //任何一方返回data为空，则停止下面所有流程
                    return;
                }
            }
        }
    }
};
