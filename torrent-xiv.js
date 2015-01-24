
var _ =				require('underscore');
var os =			require('os');
var path =			require('path');
var util = 			require('util');
var filesize = 		require('filesize');
var EventEmitter = 	require('events').EventEmitter;
var parseTorrent = 	require('parse-torrent');
var TorrentStream = require('torrent-stream');

/**
 * Downloads a torrent
 *
 * @constructor
 * @param source 	{Buffer | string | {source: Buffer | string}}
 * @param options 	{Object}
 *
 * @emits Torrent#progress			The torrent has downloaded a piece. 		Passes getInfo()
 * @emits Torrent#done				Torrent has finished. Can override ready	Passes getInfo()
 * @emits Torrent#pause				Stopped downloading and uploading			Passes getInfo()
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
	var thrEmit = 	_(emitInfo).throttle(1000, {trailing: false});
	var torrent =	this;
	var verified = 	0;
	var defaults =	{connections: 100, uploads: 10, path: os.tmpdir(), mkdir: true, seed: false};
	var infoCache = {};

	/**
	 *
	 * @returns {{
	 * 		source: 	Buffer |string | {source: Buffer | string},
	 * 		infoHash: 	string,
	 * 		name: 		string,
	 * 		directory: 	string,
	 * 		active:		boolean,
	 *		percentage: number,
	 * 		files: {
	 * 			name: string,
     *  		bytes: number,
     *  		inTorrentPath: string,
     *  		humanBytes: string,
     *  		path: string
	 *		}[]
	 * }}
	 */
	this.getInfo = function()
	{
		return ready? {
			source: source,
			infoHash: engine.torrent.infoHash,
			name: engine.torrent.name,
			directory: engine.path,
			files: files,
			active: paused,
			percentage: getPercentage()
		} : infoCache;
	};

	/**
	 * Obtain network traffic status of the torrent.
	 * Only returns data when the torrent is active.
	 * i.e. not while paused or done.
	 *
	 * @returns {{
	 * 		percentage: 	number,
	 * 		downSpeed: 		number,
	 * 		upSpeed: 		number,
	 *      downloaded: 	number,
	 *      uploaded: 		number,
	 *      peersTotal: 	number,
	 * 		peersUnchoked:	number
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
	 * Stops all downloading and uploading.
	 * Current implementation destroys the engine and thus all connections
	 * because torrent-stream hasn't implemented pausing yet.
	 * So resuming (.start) will be slow.
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
			emitInfo('pause');
			if (cb) cb(torrent.getInfo());
		});
	};

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
	 * Emits event and passes getInfo() to it
	 * @param eventName {string}
	 * @param [throttled] {boolean} - Use the throttled version?
	 * 		  Throttled version only fires at most once every second
	 */
	function emitInfo(eventName, throttled)
	{
		if (throttled) thrEmit(eventName);
		else torrent.emit(eventName, torrent.getInfo());
	}

	/**
	 * Calls a function now if ready, or later when ready
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
		files = engine.files.map(function(file)
		{
			return {
				name: file.name,
				bytes: file.length,
				inTorrentPath: file.path,
				humanBytes: filesize(file.length),
				path: path.join(engine.path, file.path)
			};
		});
	}

	/**
	 * Checks that the source from the user is valid and
	 * applies defaults to the options parameter that the user provided
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