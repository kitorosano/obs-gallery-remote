const $ = (selector) => document.querySelector(selector);

export const elements = {
  gallery: $('#gallery'),
  search: $('#search'),
  status: $('#obs-status'),
  preview: $('#preview'),
  previewPlaceholder: $('#preview-placeholder'),
  selectedName: $('#selected-name'),
  showButton: $('#show'),
  autoShow: $('#auto-show'),
  message: $('#message'),
  categories: $('#categories'),
  imageCount: $('#image-count'),
  refreshButton: $('#refresh'),
  connectButton: $('#connect'),

  galleryView: $('#gallery-view'),

  scenesView: $('#scenes-view'),
  sceneGrid: $('#scene-grid'),
  currentScene: $('#current-scene'),
  sceneCount: $('#scene-count'),
  sceneMessage: $('#scene-message'),
  refreshScenesButton: $('#refresh-scenes'),

  audioView: $('#audio-view'),
  audioGrid: $('#audio-grid'),
  audioCount: $('#audio-count'),
  audioMessage: $('#audio-message'),
  refreshAudioButton: $('#refresh-audio'),

  navigationButtons: document.querySelectorAll('.nav-button'),
};
