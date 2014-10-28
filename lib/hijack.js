var URL = require('url');
module.exports = function(data) {
    var query = data.query;
    var fields = data.data;
    if (query.files) {
        try {
            var content = decodeURIComponent(query.files);
        } catch (e) {
            content = query.files;
        }
        fields.content = content;
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


        fields.host1 = hostArr[0];
        fields.host2 = hostArr[1];
    } else {
        fields.host1 = '';
        fields.host2 = '';
    }

    return data;
};
