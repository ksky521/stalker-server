var finalhandler = require('finalhandler')
var http = require('http')
var serveStatic = require('serve-static')
var Loger = require('./loger');



function Server(options, loger) {
    loger = this.loger = new Loger(options);
    this.options = options || {};
    var self = this;
    var serve = serveStatic(options.staticPath || './public', options.serverOptions || {});
    var server = http.createServer(function(req, res) {
        var done = finalhandler(req, res, {
            onerror: function(err) {
                self.logerror(err);
            }
        });
        serve(req, res, done)
        loger.emit('access_log', req, res);
    });
    server.listen(options.port || 8800);

}
Server.prototype.logerror = function(err) {
    this.loger.emit('error', err.stack || err.toString());
};

module.exports = Server;
