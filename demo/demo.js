var path = require('path');
var Torrent = require('./../torrent-xiv.js');
var ubuntu = 'magnet:?xt=urn:btih:743BC6FAD39E3A35460D31AF5322C131DD196AC2';

var t = new Torrent(ubuntu, {path: path.join(__dirname, 'torrents')});

console.log('Torrent is starting...');

t.on('active', function() {
	console.log('Active event:', t.metadata.name);
});

t.on('inactive', function() {
	console.log('Inactive');
});

t.on('progress', function(status) {
	console.log('Progress', status);
});

t.on('stats', function(stats) {
	console.log('Stats', stats);
});

t.on('complete', function(metadata) {
	console.log('complete', metadata);
});