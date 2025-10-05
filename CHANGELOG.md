## [1.4.0] (2025-10-04)


### Major Features

* **🎵 Multiple Download Tools:** Implemented triple-redundancy for YouTube downloads (ytdl-core → play-dl → yt-dlp)
* **📡 Direct Streaming Support:** Added StreamingExtractor for direct YouTube and SoundCloud streaming without downloads
* **🔄 Hybrid Playback System:** Downloads prioritized for reliability, direct streaming as ultimate fallback
* **🎼 Native SoundCloud Streaming:** SoundCloud now uses direct streaming instead of YouTube search conversion
* **⚡ Enhanced Fallback Chain:** Multiple layers of redundancy ensure maximum playback reliability

### Performance Improvements

* **Better Reliability:** Triple download tools (ytdl-core, play-dl, yt-dlp) ensure higher success rate
* **Faster Recovery:** Direct streaming fallback activates when all downloads fail
* **Reduced Latency:** SoundCloud direct streaming eliminates YouTube search conversion delay
* **Smart Fallbacks:** PlayDLExtractor automatically switches between download and streaming based on availability

### Bug Fixes

* **SoundCloud Enhancement:** Now uses direct streaming with YouTube search as fallback (reversed priority)
* **Download Manager:** Added yt-dlp as third download option for maximum coverage
* **Stream Method:** Enhanced with direct streaming fallback when downloads fail
* **Source Detection:** Improved source tracking (youtube/soundcloud) for proper streaming method selection

### Code Improvements

* Created new StreamingExtractor class for direct streaming support
* Enhanced MusicDownloadManager with yt-dlp integration and better error handling
* Updated PlayDLExtractor to support both download and direct streaming modes
* Added source tracking in track metadata for intelligent streaming decisions
* Improved logging to show which method (download/stream) and tool is being used
* Better error messages showing all attempted methods and their failure reasons

### Dependencies

* **Added:** yt-dlp-wrap v2.3.12 for additional YouTube download/streaming support
* **Updated:** Version bumped to 1.4.0

## [1.3.1] (2025-10-04)


### Bug Fixes

* **Deezer Removed:** Completely removed Deezer extractor and dependency due to missing decryption key requirement - was causing all fallback streams to fail
* **Empty Query Fix:** Fixed critical issue where fallback streaming received empty queries, now properly extracts title from track metadata
* **Multi-Platform Racing:** Removed non-functional Deezer from platform racing, now uses YouTube + SoundCloud only
* **SoundCloud Fallback:** Improved fallback logic when SoundCloud URLs fail to stream - now properly searches YouTube with track title
* **Queue Display:** Fixed CombinedError validation issue with empty thumbnail URLs in queue embeds

### Performance Improvements

* **Reduced Failures:** Removing broken Deezer integration significantly reduces stream failure rate
* **Better Fallbacks:** Enhanced metadata extraction ensures fallback searches have valid queries
* **Faster Recovery:** Streamlined platform racing without failed Deezer attempts

### Code Improvements

* Simplified stream() method by removing Deezer search attempts
* Enhanced empty query validation with multiple fallback fields (title → author → description)
* Improved logging for fallback streaming scenarios
* Better error handling for invalid or missing track metadata

## [1.3.0] (2025-10-04)


### Features

* **High Quality Audio:** Force highest quality (quality: 2) streaming for all platforms
* **Parallel Platform Search:** Implement simultaneous search across YouTube and SoundCloud with Promise.any race
* **Fast Fallback:** Fastest platform to respond wins, ensuring minimal wait time for users
* **Timeout Handling:** Add 15-second timeout per platform with automatic failover to prevent long waits
* **Direct URL Optimization:** Direct YouTube URLs stream immediately, SoundCloud URLs race with YouTube fallback

### Performance Improvements

* **Faster Playback:** Parallel search reduces average song load time by racing multiple platforms
* **Resource Management:** Proper timeout cleanup with clearTimeout to prevent memory leaks
* **Stream Quality:** All streams now use highest available quality setting

### Bug Fixes

* **Timeout Leak:** Fix memory leak by properly clearing timeout handles on success and failure
* **SoundCloud Validation:** Fixed so_validate() to check URL instead of title for proper SoundCloud detection
* **Error Aggregation:** Improved error messages showing detailed failure reasons from all platforms

### Code Improvements

* Refactored stream() method with three distinct paths: direct YouTube, direct SoundCloud, and parallel search
* Added streamFromPlatform() helper with timeout wrapper for consistent platform handling
* Enhanced logging to show platform race winners and detailed failure diagnostics

## [1.2.3] (2025-10-04)


### Bug Fixes

* **PlayDLExtractor:** Fix critical `createTrack is not a function` error by migrating to discord-player v7 Track API
* **PlayDLExtractor:** Fix empty query bug in fallback streaming by extracting track title from context
* **PlayDLExtractor:** Fix audio stream skipping at 120ms by wrapping play-dl stream with createStream() for proper discord-player compatibility
* **PlayDLExtractor:** Replace console.log statements with proper logger.debug/logger.syserr for cleaner logging
* **Webserver:** Improve Express server error handling and logging

### Features

* **YouTube Integration:** Re-enable YouTube support as primary metadata source for accurate song searches
* **Intelligent Ranking:** Add relevance scoring system prioritizing official audio, verified channels, and Topic channels
* **Multi-Platform:** Enhanced validate() method to properly route SoundCloud, Spotify, Apple Music, and Vimeo URLs to respective extractors
* **Search Accuracy:** Implement smart YouTube search that ranks official/verified content higher for better song matching

### Code Improvements

* Migrated PlayDLExtractor to use `new Track()` constructor instead of deprecated `createTrack()` method
* Added proper ExtractorInfo return type `{ playlist: null, tracks: [] }` for discord-player v7 compatibility
* Improved logging consistency in PlayDLExtractor using project logger
* Enhanced error handling and debugging capabilities for audio streaming
* Added formatDuration() helper method for proper time formatting
* Added proper error event handler for Express webserver

## [1.2.2](https://github.com/QIHeena/QIHeena-music-bot/compare/v1.2.1...v1.2.2) (2024-08-10)


### Bug Fixes

* remove support for YouTube and Spotify ([872d2e5](https://github.com/QIHeena/QIHeena-music-bot/commit/872d2e5bf340dec7836c349f354d46256465d866))

## [1.1.9](https://github.com/QIHeena/QIHeena-music-bot/compare/v1.1.8...v1.1.9) (2024-07-16)


### Bug Fixes

* catch ffmpeg toggle exception ([e34e06f](https://github.com/QIHeena/QIHeena-music-bot/commit/e34e06f059e14fed5f29214942f2d917ca7cc2d9))

## [1.1.8](https://github.com/QIHeena/QIHeena-music-bot/compare/v1.1.7...v1.1.8) (2024-07-11)


### Bug Fixes

* regenerate package-lock ([6f8cdd5](https://github.com/QIHeena/QIHeena-music-bot/commit/6f8cdd5af02075bc52db5f52a9396492388a9a05))
* set min node version to 18 ([d56cd61](https://github.com/QIHeena/QIHeena-music-bot/commit/d56cd615888340c2fdf21e3da57e987e4dfb03ff))
* use new youtube extractor provider ([2e98af1](https://github.com/QIHeena/QIHeena-music-bot/commit/2e98af11217b22c0103449cbbf837d3b8b629c2a))

## [1.1.7](https://github.com/QIHeena/QIHeena-music-bot/compare/v1.1.6...v1.1.7) (2024-06-21)


### Bug Fixes

* correct bot id ([33e1c37](https://github.com/QIHeena/QIHeena-music-bot/commit/33e1c37e16a7138e66f284f83d62982a6b479c66))

## [1.1.6](https://github.com/QIHeena/QIHeena-music-bot/compare/v1.1.5...v1.1.6) (2024-06-21)


### Bug Fixes

* remove tem db file from docker compose ([593e0e9](https://github.com/QIHeena/QIHeena-music-bot/commit/593e0e957c163da7956cbb7e7a32f3c89d899365))

## [1.1.4](https://github.com/QIHeena/QIHeena-music-bot/compare/v1.1.3...v1.1.4) (2024-03-29)


### Bug Fixes

* **Docker:** more unique container name for client ([4a07b4d](https://github.com/QIHeena/QIHeena-music-bot/commit/4a07b4dbc17ac4bd08a4483b7f4c36d978dece38))
* **docker:** remove empty environmental value declaration in docker-compose ([8d86017](https://github.com/QIHeena/QIHeena-music-bot/commit/8d8601714ed5801bdd55ee631f869621e0a9610d))
* remove bad docker compose volumes ([ebaa7f4](https://github.com/QIHeena/QIHeena-music-bot/commit/ebaa7f4b1450f90028cbd9b8d6902c9945ebc79e))
* update docker-compose file ([e8819e2](https://github.com/QIHeena/QIHeena-music-bot/commit/e8819e2e48feedf18c03e460b11bc875d1927eb7))

## [1.1.3](https://github.com/QIHeena/QIHeena-music-bot/compare/v1.1.2...v1.1.3) (2023-12-20)


### Bug Fixes

* add error listener to discord-player ([6d28619](https://github.com/QIHeena/QIHeena-music-bot/commit/6d28619710c160f257f90f2cef17dc0913a20c92))
* check DEBUG_ENABLED environmental for player debugging ([8d45d7a](https://github.com/QIHeena/QIHeena-music-bot/commit/8d45d7a1f5575d225df1a0239c48086436bdf5a5))
* crash when extracting stream fails ([0264817](https://github.com/QIHeena/QIHeena-music-bot/commit/026481723624e291d75f9a0b1710f70a98de987f))
* logic for checking isMusicChannel when threadSessions are enabled ([e46ecb6](https://github.com/QIHeena/QIHeena-music-bot/commit/e46ecb69212d86e71efe1d6197fbd0f4583361fa))
* remove preview dependencies ([4da4826](https://github.com/QIHeena/QIHeena-music-bot/commit/4da4826eb0deb55eb45e730863edc3a0a08326a3))

## [1.1.1](https://github.com/QIHeena/QIHeena-music-bot/compare/v1.1.0...v1.1.1) (2023-07-21)


### Bug Fixes

* discriminator deprecation ([78c9545](https://github.com/QIHeena/QIHeena-music-bot/commit/78c9545b1dc789337c9470afef929b76df7bf32e))
* wrong command data being display on command API errors ([61de626](https://github.com/QIHeena/QIHeena-music-bot/commit/61de6265389455e1f27277286457d92d19b711bb))

# [1.1.0](https://github.com/QIHeena/QIHeena-music-bot/compare/v1.0.0...v1.1.0) (2023-06-14)


### Bug Fixes

* check threads availability ([a8f3095](https://github.com/QIHeena/QIHeena-music-bot/commit/a8f3095c713b133bd4adddd213c09a33cb2a489c))


### Features

* configurable leaveOnEmpty status + cooldown ([dbad3d0](https://github.com/QIHeena/QIHeena-music-bot/commit/dbad3d0009ece308ae274f732ca6cee5a4e37916))

# 1.0.0 (2023-06-12)


### Bug Fixes

* avoid additional packages and delete apt-get lists ([8477ec3](https://github.com/QIHeena/QIHeena-music-bot/commit/8477ec3fe212a7caf3d6d25a295ddfba96e35f72))
* check dotenv file path ([cc71231](https://github.com/QIHeena/QIHeena-music-bot/commit/cc7123115a97d6b1572e2373f0828dbdfc6e04d0))


### Features

* initial commit 🥳 ([5a70e0e](https://github.com/QIHeena/QIHeena-music-bot/commit/5a70e0ee3c715256d8ec9ee2f591496b3f51f0d))
