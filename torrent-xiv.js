
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
 * @emits Torrent#active			Started downloading and uploading			Passes getInfo()
 * @emits Torrent#inactive			Stopped downloading and uploading			Passes getInfo()
 * @emits Torrent#progress			The torrent has downloaded a piece. 		Passes getInfo()
 * @emits Torrent#stats				Periodic update. (opts.statFrequency)		Passes getStats()
 * @emits Torrent#complete			Torrent has finished. Can override ready	Passes getInfo()
 */
function Torrent(source, options)
{
    var opts = 		options || {};
    var busy = 		false;
    var cache = 	{}; // used by various functions
    var ready = 	false;
    var paused = 	true; // initial state must be true
    var engine = 	{};
    var torrent =	this;
    var complete = 	false;
    var verified = 	0;
    var defaults =	{connections: 100, uploads: 10, path: os.tmpdir(), mkdir: true, seed: false, start: true, statFrequency: 2000};

    this.metadata = {};
    this.status =	{};

    this.pause = function(cb)
    {
        if (paused || busy) return;
        busy = true;
        engine.destroy(function()
        {
            paused = true;
            ready = false;
            busy = false;
            torrent.status = getStatus();
            torrent.emit('inactive');
            if (cb) cb();
        });
    };

    this.start = function()
    {
        if (!paused || busy) return;
        paused = false;
        torrent.status = getStatus();
        startEngine();
    };

    /**
     * Starts a torrent-stream instance and immediately begins the download
     */
    function startEngine()
    {
        engine = new TorrentStream(source, opts);

        engine.on('ready', function()
        {
            ready = true;
            torrent.metadata = getMetadata();
            torrent.status = getStatus();
            if (!complete) engine.files.forEach(function(file) {file.select();});
            torrent.emit('_engineReady');
            torrent.emit('active');
        });

        engine.on('download', function()
        {
            torrent.status = getStatus();
            emitProgressThrottled();
        });

        engine.on('verify', function()
        {
            verified++;
            torrent.status = getStatus(); // inefficient during initial verify
            if (verified === engine.torrent.pieces.length) finish();
        });
    }

    /**
     * Obtain torrent metadata
     * @returns {{
     * 		name: string,
     * 		files: Array,
     * 		infoHash: string
     * 		directory: string,
     * 		source: Buffer | string,
     * }}
     */
    function getMetadata()
    {
        var meta = {
            source: source,
            files: getFiles(),
            directory: engine.path,
            name: engine.torrent.name,
            infoHash: engine.torrent.infoHash
        };
        return jsonCopy(meta);
    }

    /**
     * Obtain torrent status
     * @returns {{active: boolean, percentage: number, infoHash: string}}
     */
    function getStatus()
    {
        var status = {
            active: !paused,
            percentage: getPercentage(),
            infoHash: torrent.metadata.infoHash
        };
        return jsonCopy(status);
    }

    /**
     * Obtain network traffic status of the torrent.
     * Only returns data when the torrent is active.
     * i.e. not while paused or complete.
     * @returns {{
     * 		percentage: 	number,
     * 		downSpeed: 		number,
     * 		upSpeed: 		number,
     *      downloaded: 	number,
     *      uploaded: 		number,
     *      peersTotal: 	number,
     * 		peersUnchoked:	number
     * }}
     */
    function getTrafficStats()
    {
        var s = ready? engine.swarm : null;
        return {
            infoHash:		torrent.metadata.infoHash,
            percentage: 	getPercentage(),
            downSpeed: 		ready? s.downloadSpeed() : 0,
            upSpeed: 		ready? s.uploadSpeed() : 0,
            downloaded:		ready? s.downloaded : 0,
            uploaded: 		ready? s.uploaded : 0,
            peersTotal: 	ready? s.wires.length : 0,
            peersUnchoked: 	ready? s.wires.reduce(function(prev, wire) {return prev + !wire.peerChoking;}, 0) : 0
        };
    }

    /**
     * Obtain overall torrent percentage as a float, 2 decimal places
     * @returns {number}
     */
    function getPercentage()
    {
        return ready? Math.floor((verified/engine.torrent.pieces.length) * 10000)/100 : torrent.status.percentage;
    }

    function finish()
    {
        complete = true;
        if (ready)
        {
            torrent.pause(function()
            {
                torrent.emit('complete');
            });
        }
        else
        {
            torrent.once('_engineReady', finish)
        }
    }

    function emitProgressThrottled()
    {
        if (!cache.emitProgressThrottled)
        {
            function emit() {torrent.emit('progress', torrent.status);}
            cache.emitProgressThrottled = _(emit).throttle(1000, {trailing: false});
        }

        cache.emitProgressThrottled();
    }

    /**
     * Returns a copy of torrent-stream's files converted to our format
     * @returns {{}} TODO document
     */
    function getFiles()
    {
        var fileList = engine.files.map(function(file)
        {
            return {
                name: file.name,
                bytes: file.length,
                inTorrentPath: file.path,
                humanBytes: filesize(file.length),
                path: path.join(engine.path, file.path)
            };
        });

        return jsonCopy(fileList);
    }

    /**
     * Checks that the torrent source from the user is valid and
     * applies defaults to the options parameter that the user provided
     */
    function processInput()
    {
        var parsed = parseTorrent(source);
        if (!parsed || !parsed.infoHash) throw new Error('Please provide a valid torrent');
        _(opts).defaults(defaults);
        if (opts.mkdir) opts.path = path.join(opts.path, parsed.infoHash);
    }

    function jsonCopy(obj)
    {
        return JSON.parse(JSON.stringify(obj));
    }

    function startBroadcastingStats()
    {
        cache.statsInterval = setInterval(function()
        {
            torrent.emit('stats', getTrafficStats());
        }, opts.statFrequency)
    }

    function stopBroadcastingStats()
    {
		clearInterval(cache.statsInterval);
    }

    processInput();
    if (opts.start) this.start();
    torrent.on('active', startBroadcastingStats);
    torrent.on('inactive', stopBroadcastingStats);
}

util.inherits(Torrent, EventEmitter);

module.exports = Torrent;