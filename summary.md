## Wiring Analysis

### Unwired components:
1. **DynamicIslandMusicPlayer.tsx** - Fully built but NEVER imported. Needs to go inside SpotifyPlaybackProvider in StudyWorkspace.tsx with workspaceScrollRef.
2. **FocusMusicDock.tsx** - Fully built but NEVER imported. Should go on dashboard page.

### Already working:
- SpotifyPlaybackPanel.tsx - correctly imported and used in StudyWorkspace.tsx
- useSpotifyPlayback.tsx - correctly connected via SpotifyPlaybackProvider
- Unlink route - correctly exists at /api/music/spotify/unlink
- System audio detection - already implemented in both DynamicIslandMusicPlayer and SpotifyPlaybackPanel
