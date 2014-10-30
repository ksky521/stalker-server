var fs = require('fs');
var URL = require('url');
var path = require('path');
//存储对象池
var pool = {};
var Csver = function(filePath, fields, dimension) {
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
    this.fields = fields || {};
};
Csver.prototype.getDateTime = function(dimension) {
    dimension = dimension || this.dimension;
    var now = new Date();
    var dateTime = '.' + now.getFullYear() + (now.getMonth() + 1);
    var arr = ['Date', 'Hours'];
    if (dimension !== 'Month') {
        for (var i = 0, len = arr.length; i < len; i++) {
            dateTime += now['get' + arr[i]]();
        }
    }
    return dateTime;
};
Csver.prototype.task = function(data) {
    // console.log(data);
    if (!data) {
        return;
    }
    var stream;
    if (stream = this.logStream) {
        var query = data.query;
        var fields = data;
        //处理fields
        var orderMap = this.fields;
        var result = orderMap.map(function(key) {
            if (fields[key]) {
                return getValue(fields[key]);
            }
            if (query[key]) {
                return getValue(query[key]);
            }
            return getValue();
        }).join(',') + '\n';
        // console.log(result);

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
    pool[which] = new Csver(settings.filePath, settings.fields || {}, settings.dimension);
}

exports.task = function(data, settings, which, globalSettings) {
    if (pool[which]) {
        pool[which].task(data, settings, which);
    }
}

function getValue(v) {
    if ((typeof v === 'number' && isNaN(v)) || typeof v === 'undefined' || v === '') {
        return '""';
    }
    v = String(v).trim().replace(/"/g, '\"');
    return '"' + v + '"';
}
