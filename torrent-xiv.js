
var _ =				require('underscore');
var os =			require('os');
var path =			require('path');
var util = 			require('util');
var EventEmitter = 	require('events').EventEmitter;
var parseTorrent = 	require('parse-torrent');
var TorrentStream = require('torrent-stream');

/**
 * Provides documentation for the Torrent class
 *
 * @interface
 */
function TorrentInterface()
{
	/**
	 * Obtain metadata and progress and status of a torrent.
	 *
	 * @returns {{source: *, infoHash: string, name: string, paused: boolean, files: string[]}}
	 */
	this.getInfo = function() {};


	this.getTrafficStats = function() {};

	/**
	 * Stop downloading and uploading
	 * Deselects all files in the torrent
	 */
	this.pause = function() {};

	/**
	 * Start downloading and uploading
	 * Selects all files for download
	 */
	this.start = function() {};

	this.getLargestFile = function() {};

	this.destroy = function() {};
}

/**
 * Downloads a torrent
 *
 * @constructor
 * @implements TorrentInterface
 * @param source 	{Buffer | string | {source: Buffer | string}}
 * @param options 	{Object}
 *
 * @emits Torrent#progress			The torrent has downloaded a piece. 		Passes getInfo()
 * @emits Torrent#done				Torrent has finished. Can override ready	Passes getInfo()
 * @emits Torrent#stop				Stopped downloading and uploading			Passes getInfo()
 * @emits Torrent#start				Started downloading and uploading			Passes getInfo()
 * @emits Torrent#stats				Periodic update. (opts.updateFrequency)		Passes getStats()
 */
function Torrent(source, options)
{
	var opts = 		options || {};
	var done = 		false;
	var busy = 		false;
	var files = 	{};
	var ready = 	false;
	var paused = 	true; // initial state must be true.
	var engine = 	{};
	var thrEmit = 	_(emitInfo).throttle(1000);
	var torrent =	this;
	var verified = 	0;
	var defaults =	{connections: 100, uploads: 10, path: os.tmpdir(), mkdir: true, seed: false};
	var infoCache = {};

	this.getInfo = function()
	{
		return !paused? {
			source: source,
			infoHash: engine.torrent.infoHash,
			name: engine.torrent.name,
			directory: engine.path,
			files: files,
			percentage: getPercentage()
		} : infoCache;
	};

	/**
	 * Obtain network traffic status of the torrent
	 *
	 * @returns {{
	 * 		percentage: number,
	 * 		downSpeed: number,
	 * 		upSpeed: number,
	 *      downloaded: number,
	 *      uploaded: number,
	 *      peersTotal: number,
	 * 		peersUnchoked: number
	 * } | {}}
	 */
	this.getTrafficStats = function()
	{
		if (!ready) return {};

		var s = engine.swarm;
		return {
			percentage: getPercentage(),
			downSpeed: s.downloadSpeed(),	upSpeed: s.uploadSpeed(),
			downloaded: s.downloaded,		uploaded: s.uploaded,
			peersTotal: s.wires.length,		peersUnchoked: s.wires.reduce(function(prev, wire) {return prev + !wire.peerChoking;}, 0)
		};
	};

	/**
	 * Completely stops all downloading and uploading
	 */
	this.pause = function(cb)
	{
		if (paused || busy) return;
		busy = true;
		infoCache = torrent.getInfo();
		engine.destroy(function()
		{
			paused = true;
			ready = false;
			busy = false;
			cb(torrent.getInfo());
			emitInfo('pause');
		});
	};

	/**
	 * Starts the engine and the downloading
	 */
	this.start = function()
	{
		if (!paused || busy) return;
		paused = false;
		startEngine();
	};

	function startEngine()
	{
		engine = new TorrentStream(source, opts);

		engine.on('ready', function()
		{
			ready = true;
			makeUserFiles();
			if (!done) selectFiles();
			emitInfo('ready');
			emitInfo('start');
		});

		engine.on('download', function()
		{
			emitInfo('progress', true);
		});

		engine.on('verify', function()
		{
			verified++;
			if (verified === engine.torrent.pieces.length) finish();
		});
	}

	function getPercentage()
	{
		return Math.floor((verified/engine.torrent.pieces.length) * 10000)/100;
	}

	function selectFiles()
	{
		engine.files.forEach(function(file)
		{
			file.select();
		});
	}

	function finish()
	{
		console.log('!finish');
		done = true;
		whenReady(function()
		{
			torrent.pause(function()
			{
				emitInfo('done');
			});
		});
	}

	/**
	 * Emit event and pass getInfo()
	 * @param eventName {string}
	 * @param [throttled] {boolean} - Use the throttled version? (at most every second)
	 */
	function emitInfo(eventName, throttled)
	{
		if (throttled) thrEmit(eventName);
		else torrent.emit(eventName, torrent.getInfo());
	}

	/**
	 * Call a function now if ready, or when ready
	 * @param fn {function}
	 */
	function whenReady(fn)
	{
		if (ready) fn();
		// notice we're using torrent, not engine.
		// engine might not exist yet so we're proxying
		else {torrent.once('ready', fn)}
	}

	/**
	 * Convert torrent-stream files to our files
	 * @returns {string[]}
	 */
	function makeUserFiles()
	{
		console.log('making user files');
		console.log('paused', paused);
		console.log('ready', ready);

		return engine.files.map(function(file)
		{
			return {
				torrentPath: file.path,
				path: path.join(engine.path, file.path)
			};
		});
	}

	/**
	 * Checks that the source is valid and
	 * applies defaults to the options parameter
	 */
	function processInput()
	{
		var parsed = parseTorrent(source);
		if (!parsed || !parsed.infoHash) throw new Error('Please provide a valid torrent');
		_(opts).defaults(defaults);
		if (opts.mkdir) opts.path = path.join(opts.path, parsed.infoHash);
	}

	processInput();
	this.start();
}

util.inherits(Torrent, EventEmitter);

module.exports = Torrent;