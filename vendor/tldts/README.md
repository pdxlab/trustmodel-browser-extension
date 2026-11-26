# tldts 7.4.21 (vendored)

`index.umd.min.js` is `dist/index.umd.min.js` from the npm package `tldts@7.4.21`, unmodified
(the package's own `tldts-core` dependency is bundled into this file). It includes a snapshot of the
Public Suffix List. `background.js` uses it to reduce a hostname to its registrable domain before a
TrustScore lookup (TRUS-2617).

- Source: https://www.npmjs.com/package/tldts/v/7.4.21 (MIT, see `LICENSE`)
- Tarball integrity: `sha512-SomReMX1GpjzK4KzAMr8SKtn628eakKLlPWEEPOLnC2lfKXt5UZ5gh/y2I8cgRI2zWidULCx2p7vfYyjGSwnaw==`
- `index.umd.min.js` sha256: `f7c2c549c344c2307f3e11806747fe9057c9352025edaf721b105cfd835b75a4`

To update: `npm pack tldts@<version>`, check the integrity against `npm view tldts@<version> dist.integrity`,
copy `package/dist/index.umd.min.js` and `package/LICENSE` here, and update this file.
