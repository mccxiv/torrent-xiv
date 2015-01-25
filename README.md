# torrent-xiv

A high level torrent client for node

## Usage

```npm install --save torrent-xiv```

```
var Torrent = require('torrent-xiv');

var torrent = new Torrent('magnet:link-example');
torrent.on('done', console.log);
```

## API

#### Methods
- ```new Torrent(source, opts)``` - constructs torrent and starts it, unless ```opts.start``` is false
- ```torrent.start()``` - activates the torrent. No need to call it unless you've paused. (creates engine)
- ```torrent.pause()``` - closes all connections (engine is destroyed)

#### Events  
- ```torrent.on('active', fn)``` - triggered by ```.start()```
- ```torrent.on('inactive', fn)``` - triggered by ```.pause()``` and on ```done```
- ```torrent.on('progress', function(status){})``` - a piece has been downloaded
- ```torrent.on('stats', function(stats){})``` - emitted every ```opts.statFrequency``` while active
- ```torrent.on('done', function(metadata){})``` - all files have been downloaded

```
On progress:

{ active:       (boolean,
  percentage:   (number: 23.87),
  infoHash:     (torrent hash) }
```
```
On stats:

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
Metadata:

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
Status:

{ active:       (boolean,
  percentage:   (number: 23.87),
  infoHash:     (torrent hash) }
```

## Project status
Works but not mature, API is still evolving