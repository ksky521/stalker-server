var detector = require('stalker-detector');
//添加data
exports.task = function(data, settings, which, globalSettings) {
    var types = settings.types;
    var uaData = detector.parse(data.userAgent, types);

    //批量处理
    types.forEach(function(v){
        data[v+'_name'] = uaData[v].name;
        data[v+'_version'] = uaData[v].version;
        data[v+'_fullversion'] = uaData[v].fullVersion;
    });

    // 处理android很多device_fullVersion为空的情况
    if ((!data.device_version || data.device_version == -1) &&
        (data.device_fullversion && data.device_fullversion != -1)
    ) {
        data.device_version = data.device_fullversion;
    }
    ['device_name', 'os_name', 'browser_name'].forEach(function(v) {
        if (data[v] === 'na') {
            data[v] = '';
        }
    });
    var query = data.query;
    //特殊处理iphone
    if (data.device_name && data.device_name.toLowerCase() === 'iphone' && query.ds) {
        data.device_version = getIphoneVersion(query.ds, query.dpr);
    }
    return data;
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
