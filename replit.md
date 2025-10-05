# Overview

This Discord music bot, built with Discord.js and Lavalink (via Kazagumo), provides a high-performance music playback solution for Discord servers. Lavalink offers superior speed and reliability by offloading audio processing to a dedicated server, supporting all major platforms (YouTube, Spotify, SoundCloud, Apple Music, etc.). Key features include interactive music control buttons, advanced music controls, queue management, customizable server settings, DJ roles, and persistent configuration. The bot is designed for self-hosting with Lavalink integration and offers thread-based music sessions with auto-cleanup of temporary messages.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Application Framework
- **Runtime**: Node.js (v22.0.0+) - Updated October 5, 2025
- **Bot Framework**: Discord.js v14.22.1
- **Music Engine**: Lavalink v4.x (via Kazagumo client)
- **Lavalink Client**: Kazagumo (built on Shoukaku)
- **Database**: LokiJS (in-memory with filesystem persistence)
- **Supported Sources**: YouTube, Spotify, SoundCloud, Apple Music, Bandcamp, Twitch, Vimeo, HTTP streams

## Command Architecture
- **Pattern**: Class-based, prefix-only command system with guild-specific prefixes.
- **Loading**: Dynamic file-based command loader.

## Permission System
- **Levels**: User, Moderator, Administrator, Server Owner, Developer, Bot Owner (hierarchical).
- **Enforcement**: Pre-execution validation based on `permLevel` property. Bot owner bypasses all restrictions.

## Music Session Management
- **State Management**: Guild-based queue system for independent sessions.
- **Interactive Controls**: Live music control buttons (Pause/Resume, Skip, Stop, Queue, Shuffle) on playback messages.
- **Smart Message Management**: Single persistent control message per session that updates with each track, preventing button clutter.
- **Auto-Cleanup**: Temporary notifications auto-delete after 15-60 seconds to keep channels clean.
- **Features**: Optional dedicated thread channels for music events, voice channel validation.

## Configuration System
- **Static Config**: `config.js` for defaults.
- **Dynamic Config**: Guild-specific settings stored in LokiJS, persisting across restarts.
- **YouTube Optimization**: Non-YouTube sources are disabled in the configuration.

## Audio Processing
- **Lavalink Server**: External audio processing server hosted on Render (https://lavalink-bn8u.onrender.com)
- **Architecture**: Lavalink handles all audio extraction, streaming, and processing
- **Sources**: Native support for YouTube, Spotify (converted to YouTube), SoundCloud, Apple Music, and more
- **Search Engine**: Default YouTube search with support for direct URLs from all platforms
- **Performance**: Fast track loading and playback with Lavalink's optimized streaming
- **Reliability**: Server-side processing ensures consistent playback across all sources

## Interaction Flow
- User invokes prefix command.
- Command handler validates permissions and cooldowns.
- Music commands validate voice state.
- Kazagumo sends requests to Lavalink server for audio processing.
- Lavalink streams audio directly to Discord voice channels.
- Responses sent via Discord messages/embeds.

## Data Persistence
- **Database File**: `QIHeena-music-bot.db` (LokiJS)
- **Collections**: `guilds` for per-guild settings.
- **Auto-save**: Database saves every 3600 seconds.

## Error Handling
- **Mechanism**: Try-catch blocks.
- **User Feedback**: Descriptive error messages.
- **Logging**: Errors logged via custom logger, with filtered stderr messages.

## Component Organization
- **Modular Structure**: Commands, Interactions, Modules, Handlers, Classes, and Extractors are organized into dedicated directories.

# External Dependencies

## Core Dependencies
- **Discord.js v14.22.1**: Discord Bot API interactions.
- **@discordjs/rest v2.4.0**: REST API client.
- **Kazagumo**: Lavalink client for music playback.
- **Shoukaku**: Low-level Lavalink connector (dependency of Kazagumo).

## Lavalink Configuration
- **Lavalink Server**: Hosted on Render (https://lavalink-bn8u.onrender.com:443)
- **Version**: Lavalink v4.x
- **Authentication**: Secured with password stored in Replit Secrets (LAVALINK_PASSWORD)
- **Connection**: Secure WebSocket connection (WSS)

## Database
- **LokiJS v1.5.12**: In-memory document database with `LokiFsAdapter` for local file storage.

## Web Server
- **Express v5.1.0**: HTTP server for health checks and API endpoints (e.g., `/api/commands`). Updated October 5, 2025.
- **Port**: 5000 (default).

## Utilities
- **dotenv v16.4.7**: Environment variable management.
- **chalk v4.1.2**: Terminal output coloring.
- **common-tags v1.8.2**: Template literal formatting.
- **@QIHeena/logger**: Custom logging utility.

## Deployment Options
- **Render.com**: One-click deployment using render.yaml blueprint (free tier available) - Added October 5, 2025.
- **Docker**: Containerized deployment (Node.js 22 Alpine) - Updated October 5, 2025.
- **PM2**: Process manager for production.
- **Replit**: Fully configured for the Replit environment.

# Recent Updates (October 2025)

## Version 1.6.0 - Lavalink Integration (October 5, 2025)

### Major Architecture Change
1. **Migrated from discord-player to Lavalink**: Complete rewrite of music playback system
   - Replaced discord-player with Kazagumo (Lavalink client)
   - All audio processing now handled by external Lavalink server
   - Significantly improved performance and reliability
   - Support for all major platforms: YouTube, Spotify, SoundCloud, Apple Music, Bandcamp, Twitch, Vimeo

2. **Lavalink Server Integration**:
   - Server hosted on Render: https://lavalink-bn8u.onrender.com
   - Lavalink v4.x with secure WebSocket connection
   - Password authentication via Replit Secrets
   - Automatic reconnection and error handling

3. **Updated Components**:
   - Rewrote play command to use Kazagumo search and playback
   - Updated all music control buttons (pause, skip, stop, shuffle, autoplay, queue)
   - Modified event handlers to use Kazagumo events
   - Improved error handling and logging for Lavalink connection

4. **Benefits**:
   - Faster track loading and playback
   - Better reliability across all platforms
   - Server-side audio processing reduces bot resource usage
   - Native support for more audio sources without custom extractors

## Version 1.5.0

### Performance Optimizations
1. **Faster Response Times**: Reduced bot response time from 7-8 seconds to 3-4 seconds
   - Search limits optimized: 15→8 results (PlayDL), 10→5 results (Streaming)
   - Reduced tracks returned: 5→3 for faster processing
   - Improved search ranking algorithm

2. **SoundCloud Fallback**: Added intelligent fallback when YouTube fails
   - Preserves YouTube metadata (title, thumbnail, author, duration)
   - Automatically searches and streams from SoundCloud when YouTube is unavailable
   - Seamless user experience with no metadata loss

3. **Playlist Support Fixed**: Resolved BigInt serialization errors
   - Fixed playlist playback that was previously failing
   - Converted BigInt values to Numbers in both PlayDLExtractor and StreamingExtractor
   - Playlists now load and play correctly

4. **Spotify Integration**: Enabled direct Spotify URL playback
   - Removed custom Spotify handling to use discord-player's default extractor
   - Spotify tracks automatically convert to YouTube searches
   - Full playlist and album support

### UI/UX Improvements
1. **Interactive Music Control Buttons**: Live control buttons on music playback messages
   - Pause/Resume toggle with visual feedback
   - Skip, Stop, Queue view, and Shuffle buttons
   - Auto-disable when playback stops
   - Single persistent control message per session

2. **Auto-Delete Functionality**: Clean channels with temporary message cleanup
   - Track notifications: 15-30 seconds
   - Error messages: 20-45 seconds
   - Search result buttons: Auto-cleanup after 3 seconds when clicked
   - Queue/channel empty messages: 45-60 seconds

### Technical Improvements
- Updated to Discord.js v14.22.1
- Added mediaplex v1.0.0 for improved audio encoding
- Upgraded Dockerfile to Node.js 22 Alpine
- Enhanced error handling and logging
- Improved button state management