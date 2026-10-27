const HOST_STORAGE_KEY = 'obs-connection-host';
const PORT_STORAGE_KEY = 'obs-connection-port';

export function createSettings({ obsService, elements, refreshObsStatus }) {
  let loaded = false;

  function setFormDisabled(disabled) {
    elements.host.disabled = disabled;
    elements.port.disabled = disabled;
    elements.password.disabled = disabled;
    elements.togglePassword.disabled = disabled;
  }

  function renderStatus(state) {
    const status = state?.status || 'disconnected';

    elements.indicator.className = `settings-connection-indicator ${status}`;

    elements.disconnectButton.hidden = !state?.connected;
    elements.connectButton.hidden = Boolean(state?.connected);

    if (state?.connected) {
      elements.status.textContent = 'Conectado';
      elements.version.textContent = state.version
        ? `OBS Studio ${state.version}`
        : '';

      elements.host.value = state.host || elements.host.value;
      elements.port.value = state.port || elements.port.value;

      setFormDisabled(true);
      return;
    }

    elements.version.textContent = '';
    setFormDisabled(false);

    switch (status) {
      case 'connecting':
        elements.status.textContent = 'Conectando…';
        setFormDisabled(true);
        elements.connectButton.disabled = true;
        break;

      case 'reconnecting':
        elements.status.textContent = 'Reconectando…';
        setFormDisabled(true);
        elements.connectButton.disabled = true;
        break;

      case 'error':
        elements.status.textContent = 'Error de conexión';
        elements.connectButton.disabled = false;
        break;

      default:
        elements.status.textContent = 'Sin conexión';
        elements.connectButton.disabled = false;
    }
  }

  async function load() {
    const savedHost = localStorage.getItem(HOST_STORAGE_KEY);
    const savedPort = localStorage.getItem(PORT_STORAGE_KEY);

    if (!loaded) {
      elements.host.value = savedHost || '127.0.0.1';
      elements.port.value = savedPort || '4455';
      loaded = true;
    }

    try {
      const state = await obsService.status();

      renderStatus(state);

      if (state.lastError) {
        elements.message.textContent = state.lastError;
        elements.message.className = 'message error';
      } else {
        elements.message.textContent = '';
        elements.message.className = 'message';
      }
    } catch (error) {
      elements.status.textContent = 'Estado desconocido';
      elements.message.textContent = error.message;
      elements.message.className = 'message error';
    }
  }

  async function connect(event) {
    event.preventDefault();

    const host = elements.host.value.trim();
    const port = Number(elements.port.value);
    const password = elements.password.value;

    localStorage.setItem(HOST_STORAGE_KEY, host);
    localStorage.setItem(PORT_STORAGE_KEY, String(port));

    elements.message.textContent = '';
    elements.connectButton.disabled = true;

    renderStatus({
      status: 'connecting',
      connected: false,
    });

    try {
      await obsService.connect({
        host,
        port,
        password,
      });

      elements.password.value = '';

      elements.message.textContent = 'Conexión establecida correctamente.';
      elements.message.className = 'message success';

      await refreshObsStatus();
      await load();
    } catch (error) {
      elements.message.textContent = error.message;
      elements.message.className = 'message error';

      await refreshObsStatus();
      await load();
    } finally {
      elements.connectButton.disabled = false;
    }
  }

  async function disconnect() {
    elements.disconnectButton.disabled = true;
    elements.message.textContent = '';

    try {
      await obsService.disconnect();

      elements.message.textContent = 'OBS desconectado.';
      elements.message.className = 'message success';

      await refreshObsStatus();
      await load();
    } catch (error) {
      elements.message.textContent = error.message;
      elements.message.className = 'message error';
    } finally {
      elements.disconnectButton.disabled = false;
    }
  }

  function togglePassword() {
    const visible = elements.password.type === 'text';

    elements.password.type = visible ? 'password' : 'text';
    elements.togglePassword.textContent = visible ? 'Mostrar' : 'Ocultar';
    elements.togglePassword.setAttribute(
      'aria-label',
      visible ? 'Mostrar contraseña' : 'Ocultar contraseña',
    );
  }

  elements.form.addEventListener('submit', connect);
  elements.disconnectButton.addEventListener('click', disconnect);
  elements.togglePassword.addEventListener('click', togglePassword);

  return {
    load,
  };
}
