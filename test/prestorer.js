var URL = require('url');
var fs = require('fs');
var overviewMap = {};
var curDateTime;
var curHour = new Date().getHours();
var stream;
//用于统计overview信息
exports.task = function(data, options) {

    options = options || {};
    var query = data.query;
    var overview = overviewMap[query.type] = overviewMap[query.type] || {};
    var pid = query.id;

    if (pid) {
        overview[pid] = overview[pid] || {
            count: 0
        };
        overview[pid].count++;
        var isp = data.isp;
        var province = data.province;

        if (isp) {
            overview[pid].isp = overview[pid].isp || {};
            overview[pid].isp[isp] = overview[pid].isp[isp] || 0;
            overview[pid].isp[isp]++;
        }
        if (province > 0) {
            overview[pid].province = overview[pid].province || {};
            overview[pid].province[province] = overview[pid].province[province] || 0;
            overview[pid].province[province]++;
        }

        var now = new Date();
        var dateTime = '.' + now.getFullYear() + (now.getMonth() + 1);

        if (curDateTime !== dateTime) {
            //每月一个文件
            var access_log = (options.filePath || './logs/hijack') + '.overview' + dateTime;
            stream && stream.end();
            //新开一个steam
            stream = fs.createWriteStream(access_log, {
                flags: 'a',
                encoding: 'utf8'
            });
            curDateTime = dateTime;
        }

        if (curHour !== now.getHours() && stream) {
            dateTime = dateTime.slice(1);
            var result = dateTime + now.getDate() + now.getHours() + '=';
            result += JSON.stringify(overviewMap) + '\n';
            stream.write(result);
            overviewMap[query.type] = {};
            curHour = now.getHours();
        }
    }


    if (query.type == 0) {
        return;
    }
    //处理劫持url的host
    if (query.files) {
        try {
            var content = decodeURIComponent(query.files);
        } catch (e) {
            content = query.files;
        }
        data.content = content;
        content = content.split(',');
        var unique = {};
        var hostArr = content.map(function(v) {
            v = v.trim();
            if (!v) {
                return '';
            }
            try {
                var a = URL.parse(v);
            } catch (e) {
                return '';
            }

            var host = a.hostname;
            if (unique[host]) {
                return '';
            } else {
                unique[host] = 1;
                return host;
            }
        }).filter(function(v) {
            return v;
        });


        data.host1 = hostArr[0];
        data.host2 = hostArr[1];
    } else {
        data.host1 = '';
        data.host2 = '';
    }
    return data;
}
