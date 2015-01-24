
var chai = require('chai');
var assert = chai.assert;
var torrent = require('../torrent-xiv.js');
chai.should();

describe('instantiating', function()
{
	it('should throw on invalid input', function()
	{
		(function() {new torrent();}).should.throw(Error);
		(function() {new torrent(null);}).should.throw(Error);
		(function() {new torrent('test');}).should.throw(Error);
		(function() {new torrent(true);}).should.throw(Error);
		(function() {new torrent('https://www.google.com/');}).should.throw(Error);
	});

	it('should not throw on valid input', function()
	{
		var magnet = 'magnet:?xt=urn:btih:4d753474429d817b80ff9e0c441ca660ec5d2450&dn=Ubuntu+14.04+64+bit&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Ftracker.publicbt.com%3A80&tr=udp%3A%2F%2Ftracker.istole.it%3A6969&tr=udp%3A%2F%2Fopen.demonii.com%3A1337';
		(function() {new torrent(magnet);}).should.not.throw(Error);
	});
});