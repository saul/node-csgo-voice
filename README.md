# node-csgo-voice

A sample Node application for reading CELT encoded voice data from CSGO demos, and decoding them to .wav files.

It uses FFI to invoke exported CELT methods on `vaudio_celt_client.so`. This is available in the Linux distribution of the CSGO dedicated server.

Usage:

```
LD_LIBRARY_PATH=path/to/csgo/bin/linux64 node index.js voice-76561197966986733.bin
```
