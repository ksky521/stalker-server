var Server = require('./index');
var config = require('./config.json');

var cluster = require('cluster');
var http = require('http');
var numCPUs = config.worksLength || require('os').cpus().length;

if (cluster.isMaster) {
    for (var i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', function(worker, code, signal) {
        console.log('worker %d died (%s). restarting...',
            worker.process.pid, signal || code);
        cluster.fork();
    });
} else {
    var server = new Server(config);
}
