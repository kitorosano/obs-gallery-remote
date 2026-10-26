const $ = (selector) => document.querySelector(selector);

export const shellElements = {
  app: document.body,
  status: $('#obs-status'),
  connectButton: $('#connect'),
  menuButton: $('#topbar-menu-button'),
  menuDropdown: $('#topbar-menu-dropdown'),
};

export const galleryElements = {
  gallery: $('#gallery'),
  search: $('#search'),
  source: document.querySelector('#gallery-source'),
  preview: $('#preview'),
  previewPlaceholder: $('#preview-placeholder'),
  selectedName: $('#selected-name'),
  showButton: $('#show'),
  autoShow: $('#auto-show'),
  message: $('#message'),
  categories: $('#categories'),
  imageCount: $('#image-count'),
  sourcesList: $('#gallery-sources-list'),
  sourcesMessage: $('#gallery-sources-message'),
  addSourceButton: $('#add-gallery-source'),
  sourceDialog: $('#gallery-source-dialog'),
  sourceForm: $('#gallery-source-form'),
  sourceNameInput: $('#gallery-source-name'),
  sourcePathInput: $('#gallery-source-path'),
  cancelSourceButton: $('#cancel-gallery-source'),
  manageSourcesButton: $('#manage-gallery-sources'),
  sourcesDialog: $('#gallery-sources-dialog'),
  closeSourcesButton: $('#close-gallery-sources'),
};

export const programMonitorElements = {
  root: $('#program-monitor'),
  image: $('#program-monitor-image'),
  scene: $('#program-monitor-scene'),
  performanceButtons: document.querySelectorAll('[data-program-performance]'),
  pauseButton: $('#program-monitor-pause'),
  pipButton: $('#program-monitor-pip'),
};

export const scenesElements = {
  sceneGrid: $('#scene-grid'),
  sceneCount: $('#scene-count'),
  sceneMessage: $('#scene-message'),
};

export const sourcesElements = {
  sourcesGrid: $('#source-grid'),
  sourcesCount: $('#source-count'),
  sourcesMessage: $('#source-message'),
  currentSourcesScene: $('#source-current-scene'),
  currentSceneOnly: $('#source-current-scene-only'),

  manageSourcesButton: $('#manage-obs-sources'),
  sourcesDialog: $('#obs-sources-dialog'),
  closeSourcesButton: $('#close-obs-sources'),
  sourcesList: $('#obs-sources-list'),
};

export const audioElements = {
  audioGrid: $('#audio-grid'),
  audioCount: $('#audio-count'),
  audioMessage: $('#audio-message'),
  currentAudioScene: $('#audio-current-scene'),
  currentSceneOnly: $('#audio-current-scene-only'),

  manageSourcesButton: $('#manage-audio-sources'),
  sourcesDialog: $('#audio-sources-dialog'),
  closeSourcesButton: $('#close-audio-sources'),
  sourcesList: $('#audio-sources-list'),
};

export const controlElements = {
  root: $('#control-view'),
};

export const outputElements = {
  outputMessage: $('#output-message'),

  navOutputStatus: $('#nav-output-status'),

  streamStatus: $('#stream-status'),
  streamDuration: $('#stream-duration'),
  streamDelayInfo: $('#stream-delay-info'),
  streamDelay: $('#stream-delay'),
  streamButton: $('#stream-button'),
  streamPlatforms: $('#stream-platforms'),
  streamBitrate: $('#stream-bitrate'),
  streamDroppedFrames: $('#stream-dropped-frames'),
  streamFps: $('#stream-fps'),
  streamCpu: $('#stream-cpu'),

  recordStatus: $('#record-status'),
  recordDuration: $('#record-duration'),
  recordButton: $('#record-button'),
};

export const navigationElements = {
  galleryView: $('#gallery-view'),
  controlView: $('#control-view'),
  outputView: $('#output-view'),
  navigationButtons: document.querySelectorAll('.nav-button'),
};
