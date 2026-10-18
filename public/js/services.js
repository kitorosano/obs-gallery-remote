export function createServices(request) {
  const post = (url, body) =>
    request(url, {
      method: 'POST',
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

  return {
    auth: {
      status: () => request('/api/auth/status'),
      login: (password) => post('/api/auth/login', { password }),
      logout: () => post('/api/auth/logout'),
    },
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
      connect: () => post('/api/obs/connect'),
      showImage: (imageId) => post('/api/obs/show', { imageId }),
      currentGalleryImage: () => request('/api/obs/gallery-image'),
      scenes: () => request('/api/obs/scenes'),
      setScene: (sceneName) => post('/api/obs/scenes/current', { sceneName }),
      audio: () => request('/api/obs/audio'),
      setMute: (inputName, muted) =>
        post('/api/obs/audio/mute', { inputName, muted }),
      setVolume: (inputName, volumeDb) =>
        post('/api/obs/audio/volume', { inputName, volumeDb }),
      outputs: () => request('/api/obs/output/status'),
      startStream: () => post('/api/obs/stream/start'),
      stopStream: () => post('/api/obs/stream/stop'),
      startRecord: () => post('/api/obs/record/start'),
      stopRecord: () => post('/api/obs/record/stop'),
      program: {
        screenshot: () => request('/api/obs/program/screenshot'),
      },
    },
  };
}
