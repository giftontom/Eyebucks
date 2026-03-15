// Manual mock for hls.js — prevents loading the large HLS media bundle during tests
export default class MockHls {
  static isSupported() { return false; }
  static Events = {
    MANIFEST_PARSED: 'hlsManifestParsed',
    ERROR: 'hlsError',
    LEVEL_SWITCHED: 'hlsLevelSwitched',
  };
  on() {}
  off() {}
  loadSource() {}
  attachMedia() {}
  destroy() {}
  levels = [];
  currentLevel = -1;
}
