var fs = require('fs');
var URL = require('url');
var path = require('path');
//存储对象池
var pool = {};
var JSONer = function(filePath, hashMap, dimension) {
    dimension = dimension || 'Hours';
    this.dimension = dimension;
    filePath = path.resolve(process.cwd(), filePath);
    if (dimension) {
        var dateTime = this.getDateTime(dimension);
        var access_log = filePath + dateTime;
    } else {
        access_log = filePath;
    }
    this.filePath = filePath;
    this.curDateTime = dateTime;

    this.logStream = fs.createWriteStream(access_log, {
        flags: 'a',
        encoding: 'utf8'
    });
    this.hashMap = hashMap || {};
};
JSONer.prototype.getDateTime = function(dimension) {
    dimension = dimension || this.dimension;
    var now = new Date();
    var dateTime = '.' + now.getFullYear() + ('0' + (now.getMonth() + 1)).slice(-2);
    var arr = ['Date', 'Hours'];
    if (dimension !== 'Month') {
        for (var i = 0, len = arr.length; i < len; i++) {
            dateTime += ('0' + now['get' + arr[i]]()).slice(-2);
        }
    }
    return dateTime;
};
JSONer.prototype.task = function(data) {
    // console.log(data);
    if (!data || !data.query) {
        return;
    }
    var hashMap = this.hashMap;
    var stream;
    if (stream = this.logStream) {
        var query = data.query;
        var fields = data;
        //处理fields
        var result = {};
        for (var i in fields) {
            if (i !== 'query' && fields.hasOwnProperty(i)) {
                result[hashMap[i] ? hashMap[i] : i] = fields[i];
            }
        }
        //处理query
        for (var i in query) {
            if (query.hasOwnProperty(i) && !result[i]) {
                result[hashMap[i] ? hashMap[i] : i] = query[i];
            }
        }

        try {
            result = JSON.stringify(result);
        } catch (e) {
            return;
        }
        result += '\n';
        if (this.dimension) {
            var dateTime = this.getDateTime(this.dimension);
            if (this.curDateTime === dateTime) {
                stream.write(result);
            } else {
                stream.end(result);
                var access_log = this.filePath + dateTime;
                this.logStream = fs.createWriteStream(access_log, {
                    flags: 'a',
                    encoding: 'utf8'
                });
                this.curDateTime = dateTime;
            }
        } else {
            stream.write(result);
        }


    }
};
exports.init = function(settings, which) {
    pool[which] = new JSONer(settings.filePath, settings.hashMap || {}, settings.dimension);
}

exports.task = function(data, settings, which, globalSettings) {
    if (pool[which]) {
        pool[which].task(data, settings, which);
    }
}
