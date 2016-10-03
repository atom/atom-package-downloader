# atom-package-downloader

Downloads all Atom packages so we can search for patterns.

```
git clone https://github.com/atom/atom-package-downloader
cd atom-package-downloader
npm install
script/update.js
```

* Packages will be downloaded to `./packages` in the repository directory.
* Metadata will be updated every time.
* Existing packages will be fetched when re-run.
