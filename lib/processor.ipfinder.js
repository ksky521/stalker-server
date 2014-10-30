//将ip转成省市县和isp
var ipfinder = require('stalker-ipfind');
var path = require('path');

exports.init = function(options) {
    if (options.database) {

        ipfinder.loadData(path.resolve(process.cwd(), options.database));
    }

}
exports.task = function(data, settings, which, globalSettings) {
    var ip = String(data.ip);
    var ipData = ['', '', '', ''];
    if (isIp(ip)) {
        var ipArr = ip.split('.');
        if (ipArr[0] == 10 || (ipArr[0] == 192 && ipArr[1] == 168)) {} else {
            ip = String(ip);
            ipData = ipfinder.findSync(ip.trim());
        }
    }
    data.isp = ipData[0];
    data.province = ipData[1];
    data.city = ipData[2];
    data.county = ipData[3];

    return data;
}

function isIp(ip) {
    if (typeof ip !== 'string') {
        return false;
    }
    var reg = /^\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}$/;
    return reg.test(ip);
}
