# torrent-xiv

A high level torrent client for node

## Usage
```
var Torrent = require('torrent-xiv');

var torrent = new Torrent('magnet:link-example');
torrent.on('complete', console.log);
```

## API

#### Methods
- ```new Torrent(source, opts)``` - constructs torrent and starts it, unless ```opts.start``` is false
- ```torrent.start()``` - activates the torrent. No need to call it unless you've paused. (creates engine)
- ```torrent.pause()``` - closes all connections (engine is destroyed)

```
opts:

{ connections: 100,      // Max number of connections
  uploads: 10,           // Max number of upload slots
  path: os.tmpdir(),     // Directory to save files to
  mkdir: true,           // Make a directory in opts.path? Name will be the info hash
  seed: false,           // NYI - Seed the torrent when done instead of quitting?
  start: true,           // Auto-start the download?
  statFrequency: 2000 }  // How often to broadcast 'stats'
```

#### Events  
- ```torrent.on('active', fn)``` - triggered by ```.start()```
- ```torrent.on('inactive', fn)``` - triggered by ```.pause()``` and on ```complete```
- ```torrent.on('progress', function(status){})``` - data was downloaded. At most, 1 per second
- ```torrent.on('stats', function(stats){})``` - emitted every ```opts.statFrequency``` while active
- ```torrent.on('complete', function(metadata){})``` - all files have been downloaded

```
on progress:

{ active:       (boolean),
  percentage:   (number: 23.87),
  infoHash:     (torrent hash) }
```
```
on stats:

{ infoHash:      (torrent hash),
  percentage:    (number: 23.87),
  downSpeed:     (number),
  upSpeed:       (number),
  downloaded:    (number),
  uploaded:      (number),
  peersTotal:    (number),
  peersUnchoked: (number) }
```

#### Properties  
- ```torrent.metadata``` general torrent data, does not change
- ```torrent.status``` whether it's paused or active, and percentage

```
metadata:

{ name:         (torrent name),
  source:       (magnet link || Buffer),
  infoHash:     (torrent hash),
  directory:    (path to directory with saved files),
  files: 
   [ { name:            (file name),
       bytes:           (number of bytes),
       humanBytes:      (human readable file size, e.g. '2.63 MB'),
       path:            (direct path to this file, may be absolute or relative),
       inTorrentPath:   (path of file relative to torrent directory) } ]}
```
```
status:

{ active:       (boolean),
  percentage:   (number: 23.87),
  infoHash:     (torrent hash) }
```

## Project status
Works but not mature, API is still evolving

## Planned features
- More versatile storage options
- streams?