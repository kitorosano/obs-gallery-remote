export function createAuth({ api, onAuthenticated, onLoggedOut }) {
  const authView = document.querySelector('#auth-view');
  const form = document.querySelector('#login-form');
  const passwordInput = document.querySelector('#login-password');
  const loginButton = document.querySelector('#login-button');
  const message = document.querySelector('#login-message');
  const logoutButton = document.querySelector('#logout');

  function showLogin() {
    document.body.classList.remove('auth-pending', 'authenticated');
    document.body.classList.add('auth-required');

    authView.hidden = false;
    passwordInput.value = '';

    window.setTimeout(() => {
      passwordInput.focus();
    }, 0);
  }

  function showPanel() {
    document.body.classList.remove('auth-pending', 'auth-required');
    document.body.classList.add('authenticated');

    authView.hidden = true;
    message.textContent = '';
  }

  async function checkSession() {
    try {
      const result = await api('/api/auth/status');

      if (!result.authenticated) {
        showLogin();
        return false;
      }

      showPanel();
      return true;
    } catch {
      showLogin();
      return false;
    }
  }

  async function login(event) {
    event.preventDefault();

    const password = passwordInput.value;
    if (!password) return;

    loginButton.disabled = true;
    message.textContent = 'Verificando…';

    try {
      await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          password,
        }),
      });

      showPanel();

      await onAuthenticated?.();
    } catch (error) {
      message.textContent = error.message;

      passwordInput.select();
      passwordInput.focus();
    } finally {
      loginButton.disabled = false;
    }
  }

  async function logout() {
    try {
      await api('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.warn('No se pudo cerrar la sesión:', error);
    }

    await onLoggedOut?.();

    showLogin();
  }

  form.addEventListener('submit', login);

  logoutButton.addEventListener('click', logout);

  return {
    checkSession,
    showLogin,
    showPanel,
  };
}
