# Media boundary

`public/assets/` is the canonical, versioned runtime-media boundary. A clean checkout must be able to run the website from these files without access to local creative masters.

`src/content/mediaManifest.json` is the only runtime path manifest. Run `npm run validate:assets` to prove that every declared file exists and is non-empty.

## Character stills

`prepare_media.py` regenerates the declared character WebP derivatives from the locally archived `绿幕图/` masters. That source directory is intentionally outside the versioned runtime boundary because it contains large creative masters.

Install its pinned dependencies outside the repository:

```powershell
python -m pip install --cache-dir D:\Tools\pip-cache -r requirements-media.txt
python scripts\prepare_media.py
npm run validate:assets
```

The script owns only the outputs listed in its `ASSETS` tuple. It must not rewrite video, audio, gallery, or Works assets.

Retired derivatives that are no longer consumed by the website live in `archive/unused-runtime-assets/`. They are intentionally absent from both `ASSETS` and `public/assets/`; the validator rejects undeclared files so archived experiments cannot silently return to the deployable boundary.

## Authored video and audio

Hero MP4, transparent WebM, gallery WebM, and the BGM are treated as reviewed web masters rather than build outputs. Their editable project files remain in the local creative archive; the checked-in web masters are the deployable source of truth. Replacing one requires updating the file in `public/assets/`, verifying browser playback, and running both the asset validator and browser acceptance test.
