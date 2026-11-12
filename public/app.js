const tabs = [document.getElementById('tab-login'), document.getElementById('tab-register')];
const panels = [document.getElementById('panel-login'), document.getElementById('panel-register')];

function showTab(index) {
  tabs.forEach((tab, i) => {
    const selected = i === index;
    tab.classList.toggle('active', selected);
    tab.setAttribute('aria-selected', String(selected));
    panels[i].hidden = !selected;
  });
}
tabs.forEach((tab, i) => tab.addEventListener('click', () => showTab(i)));

async function sendForm(formId, endpoint, messageId) {
  const form = document.getElementById(formId);
  const message = document.getElementById(messageId);
  const button = form.querySelector('button[type="submit"]');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    message.className = 'message';
    message.textContent = '';
    button.disabled = true;
    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      message.textContent = data.mensaje;
      message.className = `message ${response.ok ? 'success' : 'error'}`;
      if (response.ok) form.reset();
    } catch (error) {
      message.textContent = 'No se pudo conectar con el servidor. Inténtalo nuevamente.';
      message.className = 'message error';
    } finally {
      button.disabled = false;
    }
  });
}
sendForm('login-form', '/api/login', 'login-message');
sendForm('register-form', '/api/registro', 'register-message');
