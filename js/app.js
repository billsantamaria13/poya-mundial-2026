// ============================================================
// APP.JS - Lógica principal de la vista pública
// Copa del Mundo 2026 - Poya con autenticación por celular
// Soporta DEMO_MODE (localStorage) y Firebase real
// ============================================================

let db;
let isFirebaseReady = false;

// ── Estado global ──
let currentParticipant = null;
let myPredictions = {};
let matchesData = {};
let participantsData = {};
let predictionsData = {};
let activeTab = 'grupos';

// ══════════════════════════════════════════════════
// CAPA DE DATOS: Demo (localStorage) o Firebase
// ══════════════════════════════════════════════════

const DB = {
  // Partidos
  async getMatches() {
    if (DEMO_MODE) {
      const stored = JSON.parse(localStorage.getItem('demo_matches') || '{}');
      return stored;
    }
    const snap = await db.collection('matches').get();
    const out = {};
    snap.forEach(d => { out[d.id] = d.data(); });
    return out;
  },

  async saveMatch(matchId, data) {
    if (DEMO_MODE) {
      const stored = JSON.parse(localStorage.getItem('demo_matches') || '{}');
      stored[matchId] = { ...stored[matchId], ...data };
      localStorage.setItem('demo_matches', JSON.stringify(stored));
      return;
    }
    await db.collection('matches').doc(matchId).set(data, { merge: true });
  },

  // Participantes
  async findParticipantByPhone(phone) {
    if (DEMO_MODE) {
      const stored = JSON.parse(localStorage.getItem('demo_participants') || '{}');
      return Object.values(stored).find(p => p.phone === phone) || null;
    }
    const snap = await db.collection('participants').where('phone', '==', phone).get();
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  },

  async createParticipant(data) {
    if (DEMO_MODE) {
      const stored = JSON.parse(localStorage.getItem('demo_participants') || '{}');
      const id = 'p_' + Date.now();
      stored[id] = { id, ...data, totalPoints: 0, registeredAt: new Date().toISOString() };
      localStorage.setItem('demo_participants', JSON.stringify(stored));
      return { id, ...stored[id] };
    }
    const ref = await db.collection('participants').add({ ...data, totalPoints: 0, registeredAt: new Date().toISOString() });
    return { id: ref.id, ...data, totalPoints: 0 };
  },

  async getAllParticipants() {
    if (DEMO_MODE) {
      return JSON.parse(localStorage.getItem('demo_participants') || '{}');
    }
    const snap = await db.collection('participants').get();
    const out = {};
    snap.forEach(d => { out[d.id] = { id: d.id, ...d.data() }; });
    return out;
  },

  // Predicciones
  async getMyPredictions(participantId) {
    if (DEMO_MODE) {
      const stored = JSON.parse(localStorage.getItem('demo_predictions') || '{}');
      return stored[participantId] || {};
    }
    const snap = await db.collection('predictions').where('participantId', '==', participantId).get();
    const out = {};
    snap.forEach(d => { const data = d.data(); out[data.matchId] = { ...data, docId: d.id }; });
    return out;
  },

  async savePrediction(participantId, matchId, prediction, phone) {
    if (DEMO_MODE) {
      const stored = JSON.parse(localStorage.getItem('demo_predictions') || '{}');
      if (!stored[participantId]) stored[participantId] = {};
      if (stored[participantId][matchId]) throw new Error('Ya existe predicción');
      stored[participantId][matchId] = {
        participantId, matchId, prediction, phone,
        points: 0, savedAt: new Date().toISOString()
      };
      localStorage.setItem('demo_predictions', JSON.stringify(stored));
      return;
    }
    // Verificar que no exista
    const existing = await db.collection('predictions')
      .where('participantId', '==', participantId)
      .where('matchId', '==', matchId).get();
    if (!existing.empty) throw new Error('Ya existe predicción');
    await db.collection('predictions').add({ participantId, matchId, prediction, phone, points: 0 });
  },

  async getAllPredictions() {
    if (DEMO_MODE) {
      return JSON.parse(localStorage.getItem('demo_predictions') || '{}');
    }
    const snap = await db.collection('predictions').get();
    const out = {};
    snap.forEach(d => {
      const data = d.data();
      if (!out[data.participantId]) out[data.participantId] = {};
      out[data.participantId][data.matchId] = { ...data, docId: d.id };
    });
    return out;
  }
};

// ══════════════════════════════════════════════════
// INICIALIZACIÓN
// ══════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  if (!DEMO_MODE) initFirebase();
  else {
    isFirebaseReady = false;
    loadMatchesData();
    hideFirebaseNotice();
  }
  setupPhoneLogin();
  setupTabs();
  startCountdown();
});

function initFirebase() {
  try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.firestore();
    isFirebaseReady = true;
    listenToFirebaseChanges();
    hideFirebaseNotice();
  } catch (err) {
    console.warn('Firebase no disponible, usando modo demo.', err);
    loadMatchesData();
  }
}

function loadMatchesData() {
  // Cargar desde localStorage (demo) o datos iniciales
  const stored = JSON.parse(localStorage.getItem('demo_matches') || '{}');
  INITIAL_MATCHES.forEach(m => {
    matchesData[m.id] = { ...m, result: null, status: 'pending', ...stored[m.id] };
  });
}

function listenToFirebaseChanges() {
  db.collection('matches').onSnapshot(snapshot => {
    const firestoreMatches = {};
    snapshot.forEach(doc => { firestoreMatches[doc.id] = doc.data(); });
    INITIAL_MATCHES.forEach(m => {
      matchesData[m.id] = { ...m, result: null, status: 'pending', ...firestoreMatches[m.id] };
    });
    if (currentParticipant) renderGroups();
    updateCountdown();
    if (activeTab === 'ranking') calculateAndRenderLeaderboard();
  }, () => loadMatchesData());

  db.collection('participants').onSnapshot(async () => {
    participantsData = await DB.getAllParticipants();
    const el = document.getElementById('participants-live-count');
    if (el) el.textContent = Object.keys(participantsData).length;
    if (activeTab === 'ranking') calculateAndRenderLeaderboard();
  });

  db.collection('predictions').onSnapshot(async () => {
    predictionsData = await DB.getAllPredictions();
    if (activeTab === 'ranking') calculateAndRenderLeaderboard();
  });
}

// ══════════════════════════════════════════════════
// AUTENTICACIÓN POR CELULAR
// ══════════════════════════════════════════════════

function setupPhoneLogin() {
  document.getElementById('login-form')?.addEventListener('submit', handlePhoneLogin);
  // Verificar si hay sesión guardada
  const savedPhone = localStorage.getItem('poya_phone');
  if (savedPhone) tryAutoLogin(savedPhone);
}

async function tryAutoLogin(phone) {
  try {
    const participant = await DB.findParticipantByPhone(phone);
    if (participant) {
      currentParticipant = participant;
      myPredictions = await DB.getMyPredictions(participant.id);
      enterApp();
    } else {
      localStorage.removeItem('poya_phone');
    }
  } catch (err) {
    console.warn('Auto-login fallido', err);
    localStorage.removeItem('poya_phone');
  }
}

async function handlePhoneLogin(e) {
  e.preventDefault();
  const input = document.getElementById('login-phone');
  const raw = input.value.trim();
  const phone = normalizePhone(raw);

  if (!isValidPhone(phone)) {
    showLoginError('Número inválido. Ejemplo: 3001234567 o 573001234567');
    shakeLoginCard();
    return;
  }

  const btn = document.getElementById('login-btn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner-inline"></div> Verificando...';

  try {
    const participant = await DB.findParticipantByPhone(phone);
    if (participant) {
      currentParticipant = participant;
      myPredictions = await DB.getMyPredictions(participant.id);
      localStorage.setItem('poya_phone', phone);
      enterApp();
    } else {
      showNamePrompt(phone);
    }
  } catch (err) {
    console.error('Error en login:', err);
    showLoginError('Error de conexión. Intenta de nuevo.');
    btn.disabled = false;
    btn.innerHTML = '⚽ Ingresar a la Poya';
  }
}

function showNamePrompt(phone) {
  const loginScreen = document.getElementById('login-screen');
  loginScreen.innerHTML = `
    <div class="login-card" id="login-card">
      <div class="login-icon">👋</div>
      <h1>¡Bienvenido!</h1>
      <p>Número registrado: <strong style="color:var(--gold)">${phone}</strong><br>Es tu primera vez. ¿Cuál es tu nombre?</p>
      <form id="name-form">
        <input
          type="text"
          id="input-newname"
          class="login-input"
          placeholder="Tu nombre completo"
          required
          autofocus
          style="letter-spacing:0"
        >
        <div id="login-error" class="login-error" style="display:none"></div>
        <button type="submit" class="login-btn" id="name-btn">
          🎯 Registrarme y entrar
        </button>
        <button type="button" class="login-btn-ghost" onclick="location.reload()">
          ← Cambiar número
        </button>
      </form>
      <div class="login-footer">
        ${DEMO_MODE ? '🧪 Modo demo — datos guardados localmente' : '🔒 Tus datos son solo para la poya'}
      </div>
    </div>
  `;

  document.getElementById('name-form').addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('input-newname').value.trim();
    if (!name) return;

    const btn = document.getElementById('name-btn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner-inline"></div> Registrando...';

    try {
      const participant = await DB.createParticipant({ name, phone });
      currentParticipant = participant;
      myPredictions = {};
      localStorage.setItem('poya_phone', phone);
      enterApp();
    } catch (err) {
      console.error(err);
      btn.disabled = false;
      btn.innerHTML = '🎯 Registrarme y entrar';
      const errEl = document.getElementById('login-error');
      if (errEl) { errEl.textContent = 'Error al registrar. Intenta de nuevo.'; errEl.style.display = 'block'; }
    }
  });
}

function enterApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-screen').style.display = 'block';
  updateUserBadge();
  loadMatchesData();

  if (DEMO_MODE) {
    // En demo mode, refrescar datos en memoria
    participantsData = JSON.parse(localStorage.getItem('demo_participants') || '{}');
    predictionsData = JSON.parse(localStorage.getItem('demo_predictions') || '{}');
    const el = document.getElementById('participants-live-count');
    if (el) el.textContent = Object.keys(participantsData).length;
  }

  renderGroups();
}

function updateUserBadge() {
  if (!currentParticipant) return;
  const el = document.getElementById('user-badge');
  if (el) {
    el.innerHTML = `
      <span>👤 ${escapeHTML(currentParticipant.name)}</span>
      <button onclick="handleLogout()" class="logout-btn" title="Cerrar sesión">✕</button>
    `;
  }
}

function handleLogout() {
  localStorage.removeItem('poya_phone');
  location.reload();
}

// ── Validación celular ──
function normalizePhone(raw) {
  return raw.replace(/\D/g, '');
}

function isValidPhone(phone) {
  return /^3\d{9}$/.test(phone) || /^573\d{9}$/.test(phone);
}

function showLoginError(msg) {
  const errEl = document.getElementById('login-error');
  if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
}

function shakeLoginCard() {
  const card = document.getElementById('login-card');
  card?.classList.add('shake');
  setTimeout(() => card?.classList.remove('shake'), 500);
}

// ══════════════════════════════════════════════════
// RENDER GRUPOS
// ══════════════════════════════════════════════════

function renderGroups() {
  const container = document.getElementById('groups-container');
  if (!container) return;
  container.innerHTML = Object.keys(GROUPS_DATA).map(gId => renderGroupCard(gId)).join('');
}

function renderGroupCard(groupId) {
  const group = GROUPS_DATA[groupId];
  const groupMatches = INITIAL_MATCHES.filter(m => m.group === groupId);
  const standings = computeStandings(groupId, groupMatches);

  return `
    <div class="group-card" id="group-${groupId}">
      <div class="group-card-header">
        <div class="group-letter">${groupId}</div>
        <div>
          <h3>Grupo ${groupId}</h3>
          <p>${group.teams.map(t => group.flags[t]).join(' ')}</p>
        </div>
      </div>

      <div class="standings">
        <div class="standings-header">
          <span>#</span><span>Equipo</span>
          <span title="Jugados">PJ</span><span title="Victorias">V</span>
          <span title="Empates">E</span><span title="Derrotas">D</span>
          <span>PTS</span>
        </div>
        ${standings.map((team, i) => `
          <div class="standings-row ${i < 2 ? 'qualified' : i === 2 ? 'third-place' : ''}">
            <span class="standing-pos pos-${i+1}">${i+1}</span>
            <span class="standing-team">
              <span class="team-flag">${group.flags[team.name]}</span>
              <span>${team.name}</span>
            </span>
            <span class="standing-stat">${team.played}</span>
            <span class="standing-stat">${team.won}</span>
            <span class="standing-stat">${team.drawn}</span>
            <span class="standing-stat">${team.lost}</span>
            <span class="standing-pts">${team.points}</span>
          </div>
        `).join('')}
      </div>

      <div class="group-matches">
        <div class="group-matches-title">⚽ Partidos</div>
        ${groupMatches.map(m => renderMatchRow(m, group)).join('')}
      </div>
    </div>
  `;
}

function renderMatchRow(match, group) {
  const liveData = matchesData[match.id] || match;
  const officialResult = liveData.result;
  const status = liveData.status || 'pending';
  const myPred = myPredictions[match.id];
  const matchDatetime = new Date(`${match.date}T${match.time}:00`);
  const matchStarted = new Date() >= matchDatetime;
  const dateFormatted = formatMatchDate(match.date);

  // Resultado oficial
  let scoreHTML;
  if (status === 'live') {
    scoreHTML = `<div class="match-score live">🔴 ${officialResult || 'EN VIVO'}</div>`;
  } else if (officialResult) {
    scoreHTML = `<div class="match-score played">${officialResult}</div>`;
  } else {
    scoreHTML = `<div class="match-score pending">${matchStarted ? '⏱' : 'vs'}</div>`;
  }

  // Predicción del usuario
  let predHTML = '';
  if (currentParticipant) {
    if (myPred) {
      let resultIcon = '';
      if (officialResult) {
        const pts = calcPoints(myPred.prediction, officialResult);
        if (pts === 3) resultIcon = '<span class="pred-result exact">✓ +3</span>';
        else if (pts === 1) resultIcon = '<span class="pred-result winner">✓ +1</span>';
        else resultIcon = '<span class="pred-result miss">✗</span>';
      }
      // Formatear predicción con banderas: 🇲🇽 2 - 1 🇿🇦
      const [ph, pa] = myPred.prediction.split('-');
      const savedFormatted = `${group.flags[match.home]} ${ph} - ${pa} ${group.flags[match.away]}`;
      predHTML = `
        <div class="match-prediction saved">
          <span class="pred-lock-icon">🔒</span>
          <span class="pred-saved-value">${savedFormatted}</span>
          <span class="pred-saved-label">Tu apuesta</span>
          ${resultIcon}
        </div>
      `;
    } else if (matchStarted && !officialResult) {
      predHTML = `
        <div class="match-prediction closed">
          <span style="color:var(--text-muted);font-size:12px">⛔ Cerrado sin tu predicción</span>
        </div>
      `;
    } else if (!matchStarted && !officialResult) {
      predHTML = `
        <div class="match-prediction open" id="pred-zone-${match.id}">
          <div class="pred-inputs-row">
            <input type="number" class="pred-input-score" id="pred-h-${match.id}"
              min="0" max="20" placeholder="0" inputmode="numeric">
            <span class="pred-dash">-</span>
            <input type="number" class="pred-input-score" id="pred-a-${match.id}"
              min="0" max="20" placeholder="0" inputmode="numeric">
            <button class="pred-save-btn" onclick="savePrediction('${match.id}')" id="pred-btn-${match.id}">
              Guardar
            </button>
          </div>
          <div class="pred-open-label">Cierra ${dateFormatted} ${match.time}h</div>
        </div>
      `;
    }
  }

  return `
    <div class="match-row" id="match-${match.id}">
      <div class="match-date-time">${dateFormatted} <span>${match.time}h</span></div>
      <div class="match-teams">
        <span class="match-team-name">${match.home}</span>
        <span class="match-flags">${group.flags[match.home]}</span>
        ${scoreHTML}
        <span class="match-flags">${group.flags[match.away]}</span>
        <span class="match-team-name away">${match.away}</span>
      </div>
      ${predHTML}
    </div>
  `;
}

// ── Guardar predicción individual ──
async function savePrediction(matchId) {
  if (!currentParticipant) return;

  const match = INITIAL_MATCHES.find(m => m.id === matchId);
  if (!match) return;

  // Verificar que no haya empezado
  const matchDatetime = new Date(`${match.date}T${match.time}:00`);
  if (new Date() >= matchDatetime) {
    showToast('⛔ Este partido ya comenzó', 'error');
    return;
  }

  // Verificar que no exista ya
  if (myPredictions[matchId]) {
    showToast('🔒 Ya tienes una predicción para este partido', 'error');
    return;
  }

  const homeVal = document.getElementById(`pred-h-${matchId}`)?.value;
  const awayVal = document.getElementById(`pred-a-${matchId}`)?.value;

  if (homeVal === '' || homeVal === undefined || awayVal === '' || awayVal === undefined) {
    showToast('Ingresa el marcador de ambos equipos', 'error');
    return;
  }

  const prediction = `${parseInt(homeVal)}-${parseInt(awayVal)}`;
  const btn = document.getElementById(`pred-btn-${matchId}`);
  if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner-inline"></div>'; }

  try {
    await DB.savePrediction(currentParticipant.id, matchId, prediction, currentParticipant.phone);
    // Actualizar estado local
    myPredictions[matchId] = {
      participantId: currentParticipant.id,
      matchId,
      prediction,
      points: 0,
      savedAt: new Date().toISOString()
    };
    // También actualizar predictionsData para el ranking
    if (!predictionsData[currentParticipant.id]) predictionsData[currentParticipant.id] = {};
    predictionsData[currentParticipant.id][matchId] = myPredictions[matchId];

    showToast(`✅ Predicción ${prediction} guardada`, 'success');
    // Re-render solo esa fila
    rerenderMatchRow(matchId, match, GROUPS_DATA[match.group]);
  } catch (err) {
    if (err.message === 'Ya existe predicción') {
      showToast('🔒 Ya tienes una predicción guardada', 'error');
      myPredictions[matchId] = predictionsData[currentParticipant.id]?.[matchId];
    } else {
      console.error(err);
      showToast('Error al guardar. Intenta de nuevo.', 'error');
    }
    if (btn) { btn.disabled = false; btn.innerHTML = '💾 Guardar'; }
  }
}

function rerenderMatchRow(matchId, match, group) {
  const container = document.getElementById(`match-${matchId}`);
  if (!container) { renderGroups(); return; }
  container.outerHTML = renderMatchRow(match, group);
}

// ── Calcular puntos ──
function calcPoints(prediction, actual) {
  if (!prediction || !actual) return 0;
  if (prediction === actual) return 3;
  const [ah, aa] = actual.split('-').map(Number);
  const [ph, pa] = prediction.split('-').map(Number);
  if (isNaN(ah) || isNaN(ph)) return 0;
  return Math.sign(ah - aa) === Math.sign(ph - pa) ? 1 : 0;
}

// ══════════════════════════════════════════════════
// TABS
// ══════════════════════════════════════════════════

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `panel-${tab}`));
  if (tab === 'ranking') {
    if (DEMO_MODE) {
      participantsData = JSON.parse(localStorage.getItem('demo_participants') || '{}');
      predictionsData = JSON.parse(localStorage.getItem('demo_predictions') || '{}');
    }
    calculateAndRenderLeaderboard();
  }
}

// ══════════════════════════════════════════════════
// POSICIONES
// ══════════════════════════════════════════════════

function computeStandings(groupId, matches) {
  const group = GROUPS_DATA[groupId];
  const stats = {};
  group.teams.forEach(t => { stats[t] = { name: t, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 }; });

  matches.forEach(match => {
    const liveData = matchesData[match.id] || match;
    if (!liveData.result) return;
    const [hg, ag] = liveData.result.split('-').map(Number);
    if (isNaN(hg) || isNaN(ag)) return;
    const h = stats[match.home], a = stats[match.away];
    if (!h || !a) return;
    h.played++; a.played++;
    h.gf += hg; h.ga += ag; a.gf += ag; a.ga += hg;
    if (hg > ag) { h.won++; h.points += 3; a.lost++; }
    else if (hg < ag) { a.won++; a.points += 3; h.lost++; }
    else { h.drawn++; h.points++; a.drawn++; a.points++; }
  });

  return Object.values(stats).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.gf - a.ga, gdB = b.gf - b.ga;
    return gdB !== gdA ? gdB - gdA : b.gf - a.gf;
  });
}

// ══════════════════════════════════════════════════
// LEADERBOARD
// ══════════════════════════════════════════════════

function calculateAndRenderLeaderboard() {
  const container = document.getElementById('leaderboard-container');
  if (!container) return;

  const list = Object.values(participantsData);
  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty-leaderboard">
        <div class="empty-icon">🏆</div>
        <h3>¡Sé el primero en participar!</h3>
        <p>Registra tu número y empieza a predecir.</p>
      </div>`;
    return;
  }

  const ranked = list.map(p => {
    const preds = predictionsData[p.id] || {};
    let pts = 0, exactCount = 0, winnerCount = 0;
    Object.entries(preds).forEach(([matchId, predData]) => {
      const match = matchesData[matchId];
      if (!match?.result) return;
      const p2 = calcPoints(predData.prediction, match.result);
      pts += p2;
      if (p2 === 3) exactCount++;
      else if (p2 === 1) winnerCount++;
    });
    const discount = pts >= 15 ? '15%' : pts >= 10 ? '10%' : pts >= 5 ? '5%' : null;
    const isMe = currentParticipant && p.id === currentParticipant.id;
    return { ...p, pts, exactCount, winnerCount, discount, isMe };
  }).sort((a, b) => b.pts - a.pts);

  container.innerHTML = ranked.map((p, i) => {
    const rank = i + 1;
    const rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
    const rankClass = rank <= 3 ? `rank-${rank}` : 'rank-other';
    return `
      <div class="leaderboard-row ${p.isMe ? 'is-me' : ''}">
        ${p.isMe ? '<div class="me-badge">TÚ</div>' : ''}
        <div class="lb-rank ${rankClass}">${rankIcon}</div>
        <div class="lb-info">
          <div class="lb-name">${escapeHTML(p.name)}</div>
        </div>
        <div class="lb-stats">
          <div class="lb-stat">
            <div class="lb-stat-value" style="color:var(--gold)">${p.exactCount}</div>
            <div class="lb-stat-label">Exactos</div>
          </div>
          <div class="lb-stat">
            <div class="lb-stat-value" style="color:var(--accent-blue)">${p.winnerCount}</div>
            <div class="lb-stat-label">Ganador</div>
          </div>
        </div>
        <div>
          <div class="lb-pts">${p.pts}</div>
          <div class="lb-pts-label">PTS</div>
        </div>
        <div class="lb-discount ${p.discount ? 'won' : 'none'}">
          ${p.discount ? `🎁 ${p.discount}` : '–'}
        </div>
      </div>
    `;
  }).join('');
}

// ══════════════════════════════════════════════════
// COUNTDOWN
// ══════════════════════════════════════════════════

let countdownInterval;

function startCountdown() {
  updateCountdown();
  countdownInterval = setInterval(updateCountdown, 1000);
}

function updateCountdown() {
  const nextMatch = findNextMatch();
  const section = document.getElementById('countdown-section');
  if (!nextMatch) { if (section) section.style.display = 'none'; return; }

  const matchDatetime = new Date(`${nextMatch.date}T${nextMatch.time}:00`);
  const diff = matchDatetime - new Date();
  const group = GROUPS_DATA[nextMatch.group];
  const nameEl = document.getElementById('countdown-match-name');
  if (nameEl) {
    nameEl.innerHTML = `
      <div class="cd-match-layout">
        <div class="cd-team">
          ${group.flags[nextMatch.home]}
          <span>${nextMatch.home}</span>
        </div>
        <div class="cd-vs">VS</div>
        <div class="cd-team">
          ${group.flags[nextMatch.away]}
          <span>${nextMatch.away}</span>
        </div>
      </div>
    `;
  }

  if (diff <= 0) {
    ['cd-days','cd-hours','cd-mins','cd-secs'].forEach(id => { const e = document.getElementById(id); if (e) e.textContent = '00'; });
    return;
  }
  const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = String(val).padStart(2,'0'); };
  set('cd-days',  Math.floor(diff / 86400000));
  set('cd-hours', Math.floor((diff % 86400000) / 3600000));
  set('cd-mins',  Math.floor((diff % 3600000) / 60000));
  set('cd-secs',  Math.floor((diff % 60000) / 1000));
}

function findNextMatch() {
  const now = new Date();
  const pending = INITIAL_MATCHES.filter(m => {
    const liveData = matchesData[m.id] || m;
    return !liveData.result && new Date(`${m.date}T${m.time}:00`) > now;
  });
  if (!pending.length) return null;
  return pending.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`))[0];
}

// ══════════════════════════════════════════════════
// UTILIDADES
// ══════════════════════════════════════════════════

function formatMatchDate(dateStr) {
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const d = new Date(dateStr + 'T12:00:00');
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function escapeHTML(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function hideFirebaseNotice() {
  const el = document.getElementById('firebase-notice');
  if (el) el.style.display = 'none';
}

let toastTimeout;
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 4000);
}
