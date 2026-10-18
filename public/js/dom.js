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
  refreshButton: $('#refresh'),
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
  placeholder: $('#program-monitor-placeholder'),
  pipButton: $('#program-monitor-pip'),
};

export const scenesElements = {
  sceneGrid: $('#scene-grid'),
  currentScene: $('#current-scene'),
  sceneCount: $('#scene-count'),
  sceneMessage: $('#scene-message'),
  refreshScenesButton: $('#refresh-scenes'),
};

export const sourcesElements = {
  sourcesGrid: $('#sources-grid'),
  currentSourcesScene: $('#current-sources-scene'),
  sourcesCount: $('#sources-count'),
  sourcesMessage: $('#sources-message'),
  refreshSourcesButton: $('#refresh-sources'),
};

export const audioElements = {
  audioGrid: $('#audio-grid'),
  audioCount: $('#audio-count'),
  audioMessage: $('#audio-message'),
  refreshAudioButton: $('#refresh-audio'),
  currentSceneOnly: $('#audio-current-scene-only'),
  manageSourcesButton: $('#manage-audio-sources'),
  sourcesDialog: $('#audio-sources-dialog'),
  closeSourcesButton: $('#close-audio-sources'),
  sourcesList: $('#audio-sources-list'),
};

export const outputElements = {
  outputMessage: $('#output-message'),
  refreshOutputButton: $('#refresh-output'),
  streamStatus: $('#stream-status'),
  streamDuration: $('#stream-duration'),
  streamDelayInfo: $('#stream-delay-info'),
  streamDelay: $('#stream-delay'),
  streamTotalTime: $('#stream-total-time'),
  streamButton: $('#stream-button'),
  recordStatus: $('#record-status'),
  recordDuration: $('#record-duration'),
  recordButton: $('#record-button'),
};

export const navigationElements = {
  galleryView: $('#gallery-view'),
  scenesView: $('#scenes-view'),
  sourcesView: $('#sources-view'),
  audioView: $('#audio-view'),
  outputView: $('#output-view'),
  navigationButtons: document.querySelectorAll('.nav-button'),
};
