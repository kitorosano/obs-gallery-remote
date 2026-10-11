const $ = (selector) => document.querySelector(selector);

export const shellElements = {
  app: document.body,
  status: $('#obs-status'),
  connectButton: $('#connect'),
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
};

export const scenesElements = {
  sceneGrid: $('#scene-grid'),
  currentScene: $('#current-scene'),
  sceneCount: $('#scene-count'),
  sceneMessage: $('#scene-message'),
  refreshScenesButton: $('#refresh-scenes'),
};

export const audioElements = {
  audioGrid: $('#audio-grid'),
  audioCount: $('#audio-count'),
  audioMessage: $('#audio-message'),
  refreshAudioButton: $('#refresh-audio'),
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
  audioView: $('#audio-view'),
  outputView: $('#output-view'),
  navigationButtons: document.querySelectorAll('.nav-button'),
};
