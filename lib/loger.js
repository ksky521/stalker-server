var EventEmitter = require('events').EventEmitter;
var util = require('util');
var fs = require('fs');
var URL = require('url');
var path = require('path');
var curRoot = process.cwd();
var detector = require('stalker-detector');
var ipfinder = require('stalker-ipfind');

var Loger = function(options) {
    options = options || {
        error_log: path.join(curRoot, './error.log'),
        access_log: path.join(curRoot, './access.log')
    };
    this.options = options;
    //log stream
    this.logsStream = {};
    this.logsHandler = {};

    var logs = this.options.logs || {};
    for (var i in logs) {
        var access_log = logs[i].access_log;
        this.logsStream[i] = fs.createWriteStream(access_log, {
            flag: 'a'
        });
        if (logs[i].handler) {
            var p = path.resolve(curRoot, logs[i].handler);
            if (fs.existsSync(p)) {
                this.logsHandler[i] = require(p);
            }
        }

    }

    this.error_log = fs.createWriteStream(options.error_log || path.join(curRoot, './error.log'), {
        flag: 'a'
    });

    ipfinder.loadData(options.ipdata || './ip.dat');

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
Loger.prototype.access = function(req) {
    var basename = path.basename(req.url.split('?')[0]);
    var stream;
    if (stream = this.logsStream[basename]) {
        var data = this._getData(req);
        if (typeof this.logsHandler[basename] === 'function') {
            data = this.logsHandler[basename](data);
        }
        if (!data) {
            return;
        }
        var logOptions = this.options.logs[basename];
        var query = data.query;
        var fields = data.data;
        for (var i in fields) {
            if (fields.hasOwnProperty(i)) {
                fields[i] = getValue(fields[i]);
            }
        }
        var queryMap = logOptions.hash_map || {};
        for (var i in queryMap) {
            if (queryMap.hasOwnProperty(i)) {
                fields[queryMap[i].field] = getValue(query[i]);
                // console.log(queryMap[i].field);
            }
        }
        var orderMap = logOptions.fields || [];
        var result = orderMap.map(function(key) {
            return fields[key] ? fields[key] : getValue();
        }).join(',') + '\n';
        // console.log(result);
        stream.write(result);
    }
};
/**
 * 处理公共参数
 * @param  {[type]} req [description]
 * @return {[type]}     [description]
 */
Loger.prototype._getData = function(req) {
    var now = Math.ceil(Date.now() / 1e3);
    var ip = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;
    var url = req.url;
    var method = req.method;
    var referer = req.headers['referer'];
    var userAgentString = req.headers['user-agent'];
    var userAgent = detector.parse(userAgentString);

    var query = URL.parse(url, true).query;
    var fields = {
        // 'user_agent': getValue(data.http_user_agent),
        'access_time': now,
        'ip': ip,
        'device_name': userAgent.device.name,
        'device_version': userAgent.device.version,
        'device_fullversion': userAgent.device.fullVersion,
        'os_name': userAgent.os.name,
        'os_version': userAgent.os.version,
        'os_fullversion': userAgent.os.fullVersion,
        'browser_name': userAgent.browser.name,
        'browser_version': userAgent.browser.version,
        'browser_fullversion': userAgent.browser.fullVersion
    };

    // 处理android很多device_fullVersion为空的情况
    if ((!userAgent.device.version || userAgent.device.version == -1) &&
        (userAgent.device.fullVersion && userAgent.device.fullVersion != -1)
    ) {
        fields.device_version = userAgent.device.fullVersion;
    }
    if (userAgent.device.version == -1 && userAgent.device.name !== 'iphone') {
        fields.user_agent = userAgentString;
    } else {
        fields.user_agent = ''; //保持数据库体积
    }
    if (userAgent.device.name === 'na') {
        fields.device_name = '';
    }
    if (userAgent.browser.name === 'na') {
        fields.browser_name = '';
    }
    if (userAgent.os.name === 'na') {
        fields.os_name = '';
    }

    var ipArr = ip.split(',');
    if (ipArr.length > 1) {
        ip = ipArr[1];
    }
    ipArr = ip.split('.');
    var ipData = ['', '', '', ''];
    if (ipArr[0] == 10 || (ipArr[0] == 192 && ipArr[1] == 168)) {} else {
        ip = String(ip);
        ipData = ipfinder.findSync(ip.trim());
    }
    fields.isp = ipData[0];
    fields.province = ipData[1];
    fields.city = ipData[2];
    fields.county = ipData[3];

    //特殊处理iphone
    if (userAgent.device.name.toLowerCase() === 'iphone' && query.ds) {
        fields.device_version = getIphoneVersion(query.ds, query.dpr);
    }


    return {
        data: fields,
        url: url,
        query: query,
        userAgent: userAgentString,
        ip: ip,
        time: now
    };
};

function getValue(v) {
    if ((typeof v === 'number' && isNaN(v)) || typeof v === 'undefined' || v === '') {
        return '""';
    }
    v = String(v).trim().replace(/"/g, '\"');
    return '"' + v + '"';
}

function getIphoneVersion(screen, dpr) {
    if (!screen || !dpr) {
        return '';
    }
    screen = screen.toLowerCase();
    var version = '';
    switch (screen) {
        case '320x480':
            if (dpr == 1) {
                version = '3GS';
                break;
            }
            version = '4';
            break;
        case '320x568':
            version = '5';
            break;
        case '375x667':
            version = '6';
            break;
        case '414x736':
            version = '6plus';
    }
    return version;
}
