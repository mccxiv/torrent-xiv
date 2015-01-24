# torrent-xiv

A high level torrent package.

## Usage

```npm install --save torrent-xiv```

```
var Torrent = require('torrent-xiv');

var torrent = new Torrent('magnet:link-example');

torrent.on('done', console.log);
```

## Status
Not quite production ready