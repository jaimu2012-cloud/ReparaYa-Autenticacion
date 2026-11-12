const express = require('express');
const bcrypt = require('bcryptjs');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'usuarios.json');

app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

async function readUsers() {
  try {
    const content = await fs.readFile(USERS_FILE, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function writeUsers(users) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

let pendingRegistration = Promise.resolve();

app.post('/api/registro', (req, res) => {
  const task = pendingRegistration.then(async () => {
    const usuario = typeof req.body?.usuario === 'string' ? req.body.usuario.trim() : '';
    const clave = typeof req.body?.clave === 'string' ? req.body.clave : '';
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(usuario)) {
      return res.status(400).json({ exito: false, mensaje: 'El usuario debe tener entre 3 y 30 caracteres: letras, números o guion bajo.' });
    }
    if (clave.length < 8 || clave.length > 72) {
      return res.status(400).json({ exito: false, mensaje: 'La contraseña debe tener entre 8 y 72 caracteres.' });
    }
    const users = await readUsers();
    if (users.some((u) => u.usuario.toLowerCase() === usuario.toLowerCase())) {
      return res.status(409).json({ exito: false, mensaje: 'Este usuario ya está registrado.' });
    }
    const hash = await bcrypt.hash(clave, 12);
    users.push({ usuario, hash });
    await writeUsers(users);
    return res.status(201).json({ exito: true, mensaje: '¡Registro exitoso! Ya puedes iniciar sesión.' });
  });
  pendingRegistration = task.catch((err) => { console.error('Error al registrar:', err); });
  task.catch(() => res.status(500).json({ exito: false, mensaje: 'No se pudo completar el registro.' }));
});

app.post('/api/login', async (req, res) => {
  try {
    const usuario = typeof req.body?.usuario === 'string' ? req.body.usuario.trim() : '';
    const clave = typeof req.body?.clave === 'string' ? req.body.clave : '';
    if (!usuario || !clave) {
      return res.status(400).json({ exito: false, mensaje: 'Ingresa el usuario y la contraseña.' });
    }
    const users = await readUsers();
    const user = users.find((u) => u.usuario.toLowerCase() === usuario.toLowerCase());
    if (!user || !(await bcrypt.compare(clave, user.hash))) {
      return res.status(401).json({ exito: false, mensaje: 'Usuario o contraseña incorrectos.' });
    }
    return res.json({ exito: true, mensaje: `¡Bienvenido a ReparaYa, ${user.usuario}! Autenticación exitosa.` });
  } catch (err) {
    console.error('Error al autenticar:', err);
    return res.status(500).json({ exito: false, mensaje: 'No se pudo validar el acceso.' });
  }
});

async function iniciarAplicacion() {
  const usuarios = await readUsers();
  if (!usuarios.some((u) => u.usuario.toLowerCase() === 'aprendiz')) {
    usuarios.push({ usuario: 'aprendiz', hash: await bcrypt.hash('ReparaYa2026!', 12) });
    await writeUsers(usuarios);
  }
  app.listen(PORT, () => console.log(`ReparaYa disponible en http://localhost:${PORT}`));
}

iniciarAplicacion().catch((error) => {
  console.error('No fue posible iniciar ReparaYa:', error);
  process.exit(1);
});
