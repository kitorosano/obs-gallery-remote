export function createServices(request) {
  const post = (url, body) =>
    request(url, {
      method: 'POST',
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

  return {
    gallery: {
      list: () => request('/api/gallery'),
      sources: () => request('/api/gallery/sources'),
      addSource: (source) => post('/api/gallery/sources', source),
      updateSource: (id, changes) =>
        request(`/api/gallery/sources/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: JSON.stringify(changes),
        }),
      deleteSource: (id) =>
        request(`/api/gallery/sources/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        }),
    },
    obs: {
      status: () => request('/api/obs/status'),
      connect: (connection) => post('/api/obs/connect', connection),
      disconnect: () => post('/api/obs/disconnect'),

      showImage: (imageId) => post('/api/obs/show', { imageId }),
      currentGalleryImage: () => request('/api/obs/gallery-image'),

      scenes: () => request('/api/obs/scenes'),
      setScene: (sceneName) => post('/api/obs/scenes/current', { sceneName }),

      sources: () => request('/api/obs/sources'),
      setSourceVisibility: (sceneName, sceneItemId, enabled) =>
        post('/api/obs/sources/visibility', {
          sceneName,
          sceneItemId,
          enabled,
        }),

      audio: () => request('/api/obs/audio'),
      setMute: (inputName, muted) =>
        post('/api/obs/audio/mute', { inputName, muted }),
      setVolume: (inputName, volumeDb) =>
        post('/api/obs/audio/volume', { inputName, volumeDb }),

      outputs: () => request('/api/obs/output/status'),

      aitum: () => request('/api/obs/aitum'),
      startAllStreams: () => post('/api/obs/aitum/streams/start-all'),
      stopAllStreams: () => post('/api/obs/aitum/streams/stop-all'),

      startRecord: () => post('/api/obs/record/start'),
      stopRecord: () => post('/api/obs/record/stop'),

      program: {
        screenshot: (profile = 'medium') =>
          request(
            `/api/obs/program/screenshot?profile=${encodeURIComponent(profile)}`,
          ),
      },
    },
  };
}
