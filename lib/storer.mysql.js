var fs = require('fs');
var URL = require('url');
var path = require('path');

var mysql = require('mysql');

exports.init = function(settings, which) {

}

exports.task = function(data, settings, which, globalSettings) {
    if (settings.server && settings.keys.length && settings.sql) {
        var connection = mysql.createConnection(settings.server);
        var result = {};
        var query = data.query;
        //保证使用url里面的query.url
        delete data.url;
        var hashMap = settings.hashMap;
        settings.keys.forEach(function(v) {
            var val = data[v] ? data[v] : query[v];
            result[hashMap[v] ? hashMap[v] : v] = val ? val : '';
        });
        var query = connection.query(settings.sql, result, function(err) {
            // if(err){
            //     throw err;
            // }
            connection.destroy()
        });
        // console.log(query.sql);
    }

}
