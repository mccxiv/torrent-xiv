# torrent-xiv

High level torrent client for node.js

## Usage
```
var Torrent = require('torrent-xiv');

var torrent = new Torrent('magnet:link-example');
torrent.on('progress', console.log); // prints torrent.status()
torrent.on('complete', console.log); // prints torrent.metadata
```


## API

#### Constructor
- ```new Torrent(source, opts)``` - creates torrent and starts it, ```opts``` defaults:

```
{ connections: 100,      // Max number of connections
  uploads: 10,           // Max number of upload slots
  path: os.tmpdir(),     // Directory to save files to
  mkdir: true,           // Make a directory in opts.path? Name will be the info hash
  seed: false,           // NYI - Seed the torrent when done instead of quitting?
  start: true,           // Auto-start the download?
  statFrequency: 2000 }  // How often to broadcast 'stats'
```

#### Events  

- ```torrent.on('metadata', fn)``` - obtained torrent info from peers, passes ```.metadata``` to ```fn```

- ```torrent.on('progress', fn)``` - data was downloaded, passes ```.status()``` to ```fn```

- ```torrent.on('stats', fn)``` - emits periodically while active, passes ```.stats()``` to ```fn```

- ```torrent.on('complete', fn)``` - all files have been downloaded, passes ```.metadata``` to ```fn```


- ```torrent.on('active', fn)``` - triggered by ```.start()``` once the download begins
- ```torrent.on('inactive', fn)``` - triggered by ```.pause()``` and on ```complete```

#### Properties & Methods
- ```torrent.metadata``` general torrent data, available after ```metadata``` event fires

```
{ name:         (torrent name),
  source:       (magnet link || Buffer, as provided by user),
  infoHash:     (torrent hash),
  directory:    (path to directory with saved files),
  files: 
   [ { name:            (file name),
       bytes:           (number of bytes),
       humanBytes:      (human readable file size, e.g. '2.63 MB'),
       path:            (direct path to this file, may be absolute or relative),
       torrentPath:     (path of file relative to torrent directory) } ]}
```

- ```torrent.status()``` - returns whether it's paused or active, and percentage.

```
{ active:       (boolean),
  percentage:   (number: 23.87),
  infoHash:     (torrent hash) }
```

- ```torrent.stats()``` returns transfer speeds, number of peers, etc.

```
{ infoHash:      (torrent hash),
  downSpeed:     (number),
  upSpeed:       (number),
  downloaded:    (number),
  uploaded:      (number),
  peersTotal:    (number),
  peersUnchoked: (number) }
```

- ```torrent.start()``` - activates the torrent. No need to call this unless you've paused.
- ```torrent.pause()``` - closes all connections.


## Project status
Works but not mature, API is still evolving

## Planned features
- More versatile storage options
- streams?
- promise interface?