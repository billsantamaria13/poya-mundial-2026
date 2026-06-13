// ============================================================
// ADMIN.JS - Panel de administración
// Copa del Mundo 2026 - Poya de Descuentos
// ============================================================

let db;
let isAuthenticated = false;
let matchesData = {};
let participantsCache = {};
let predictionsCache = {};

document.addEventListener('DOMContentLoaded', () => {
  initAdminFirebase();
  setupAdminAuth();
});

// ── Init Firebase ──
function initAdminFirebase() {
  try {
    const existingApps = firebase.apps || [];
    if (existingApps.length === 0) firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.firestore();
  } catch (error) {
    console.error('Error iniciando Firebase:', error);
    showAdminToast('Error conectando con Firebase', 'error');
  }
}

// ── Autenticación ──
function setupAdminAuth() {
  document.getElementById('auth-form')?.addEventListener('submit', handleAuthSubmit);
}

function handleAuthSubmit(e) {
  e.preventDefault();
  const password = document.getElementById('admin-password').value;

  if (password.trim() === ADMIN_PASSWORD) {
    isAuthenticated = true;
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('admin-dashboard').style.display = 'block';
    initAdminData();
  } else {
    showAdminToast('Contraseña incorrecta', 'error');
    document.getElementById('admin-password').value = '';
    document.getElementById('admin-card').classList.add('shake');
    setTimeout(() => document.getElementById('admin-card').classList.remove('shake'), 500);
  }
}

// ── Cargar todo en admin ──
function initAdminData() {
  listenAdminMatches();
  listenAdminParticipants();
  listenAdminPredictions();
}

function listenAdminMatches() {
  db.collection('matches').onSnapshot(snapshot => {
    const firestoreMatches = {};
    snapshot.forEach(doc => { firestoreMatches[doc.id] = doc.data(); });

    INITIAL_MATCHES.forEach(m => {
      matchesData[m.id] = { ...m, result: null, status: 'pending', ...firestoreMatches[m.id] };
    });

    renderAdminMatches();
    updateAdminStats();
  });
}

function listenAdminParticipants() {
  db.collection('participants').onSnapshot(snapshot => {
    participantsCache = {};
    snapshot.forEach(doc => { participantsCache[doc.id] = { id: doc.id, ...doc.data() }; });
    updateAdminStats();
    if (document.getElementById('admin-panel-participantes')?.classList.contains('active')) {
      renderParticipantsTable();
    }
  });
}

function listenAdminPredictions() {
  db.collection('predictions').onSnapshot(snapshot => {
    predictionsCache = {};
    snapshot.forEach(doc => {
      const d = doc.data();
      if (!predictionsCache[d.participantId]) predictionsCache[d.participantId] = {};
      predictionsCache[d.participantId][d.matchId] = { ...d, docId: doc.id };
    });
    updateAdminStats();
    if (document.getElementById('admin-panel-participantes')?.classList.contains('active')) {
      renderParticipantsTable();
    }
  });
}

// ── Stats ──
function updateAdminStats() {
  const completed = Object.values(matchesData).filter(m => m.result).length;
  const total = INITIAL_MATCHES.length;
  setEl('completed-count', `${completed}/${total}`);
  setEl('participants-count', Object.keys(participantsCache).length);
  const predCount = Object.values(predictionsCache).reduce((acc, p) => acc + Object.keys(p).length, 0);
  setEl('predictions-count', predCount);
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── Render partidos ──
function renderAdminMatches() {
  const container = document.getElementById('admin-matches-container');
  if (!container) return;

  container.innerHTML = Object.keys(GROUPS_DATA).map(gId => {
    const groupMatches = INITIAL_MATCHES.filter(m => m.group === gId);
    const group = GROUPS_DATA[gId];
    const played = groupMatches.filter(m => matchesData[m.id]?.result).length;

    return `
      <div class="admin-group-section">
        <div class="admin-group-header">
          <div class="group-letter">${gId}</div>
          <span>Grupo ${gId}</span>
          <span style="font-size:12px;color:var(--text-muted);margin-left:4px">
            ${group.teams.map(t => group.flags[t]).join(' ')}
          </span>
          <span class="group-badge">${played}/${groupMatches.length} jugados</span>
        </div>
        ${groupMatches.map(m => renderAdminMatchRow(m, group)).join('')}
      </div>
    `;
  }).join('');
}

function renderAdminMatchRow(match, group) {
  const liveData = matchesData[match.id] || match;
  const hasResult = !!liveData.result;
  const isLive = liveData.status === 'live';
  const dateFormatted = formatAdminDate(match.date);
  const parts = liveData.result ? liveData.result.split('-') : ['', ''];

  const statusBadge = isLive
    ? '<span class="status-badge live">🔴 EN VIVO</span>'
    : hasResult
      ? '<span class="status-badge done">✅ Finalizado</span>'
      : '<span class="status-badge pending">⏳ Pendiente</span>';

  return `
    <div class="admin-match-row" id="admin-match-${match.id}">
      <div class="admin-match-info">
        <div class="admin-match-date">${dateFormatted} · ${match.time}h</div>
        <div class="admin-match-teams">
          <span>${group.flags[match.home]} ${match.home}</span>
          <span class="admin-vs">vs</span>
          <span>${match.away} ${group.flags[match.away]}</span>
        </div>
        ${statusBadge}
      </div>
      <div class="admin-match-controls">
        <div class="result-input-group">
          <input type="number" class="result-input" id="res-home-${match.id}"
            value="${parts[0]}" min="0" max="30" placeholder="0">
          <span class="result-dash">-</span>
          <input type="number" class="result-input" id="res-away-${match.id}"
            value="${parts[1]}" min="0" max="30" placeholder="0">
        </div>
        <div class="admin-match-actions">
          <button class="admin-btn btn-live ${isLive ? 'active' : ''}"
            onclick="toggleLive('${match.id}', ${isLive})" title="Marcar EN VIVO">🔴</button>
          <button class="admin-btn btn-save" onclick="saveResult('${match.id}')">💾 Guardar</button>
          ${hasResult ? `<button class="admin-btn btn-clear" onclick="clearResult('${match.id}')" title="Borrar resultado">✕</button>` : ''}
        </div>
      </div>
    </div>
  `;
}

// ── Guardar resultado ──
async function saveResult(matchId) {
  const homeInput = document.getElementById(`res-home-${matchId}`);
  const awayInput = document.getElementById(`res-away-${matchId}`);
  const home = homeInput?.value.trim();
  const away = awayInput?.value.trim();

  if (home === '' || away === '') {
    showAdminToast('Ingresa ambos marcadores', 'error');
    return;
  }

  const result = `${parseInt(home)}-${parseInt(away)}`;

  try {
    await db.collection('matches').doc(matchId).set({
      ...(matchesData[matchId] || {}),
      result,
      status: 'finished',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await updatePredictionPoints(matchId, result);
    showAdminToast(`✅ ${matchId}: ${result} guardado`, 'success');
  } catch (err) {
    console.error(err);
    showAdminToast('Error al guardar', 'error');
  }
}

// ── Borrar resultado ──
async function clearResult(matchId) {
  if (!confirm('¿Borrar el resultado de este partido?')) return;
  try {
    await db.collection('matches').doc(matchId).update({
      result: firebase.firestore.FieldValue.delete(),
      status: 'pending'
    });
    showAdminToast('Resultado borrado', 'info');
  } catch (err) {
    showAdminToast('Error al borrar', 'error');
  }
}

// ── Toggle LIVE ──
async function toggleLive(matchId, currentlyLive) {
  try {
    const homeVal = document.getElementById(`res-home-${matchId}`)?.value || '';
    const awayVal = document.getElementById(`res-away-${matchId}`)?.value || '';
    const result = homeVal !== '' && awayVal !== '' ? `${parseInt(homeVal)}-${parseInt(awayVal)}` : null;

    const updateData = {
      status: currentlyLive ? 'pending' : 'live',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (result) updateData.result = result;

    await db.collection('matches').doc(matchId).set(updateData, { merge: true });
    showAdminToast(currentlyLive ? 'Partido quitado de EN VIVO' : '🔴 Partido marcado EN VIVO', 'info');
  } catch (err) {
    showAdminToast('Error actualizando estado', 'error');
  }
}

// ── Actualizar puntos de predicciones ──
async function updatePredictionPoints(matchId, actualResult) {
  try {
    const snapshot = await db.collection('predictions').where('matchId', '==', matchId).get();
    if (snapshot.empty) return;

    const batch = db.batch();
    const participantDelta = {};

    snapshot.forEach(doc => {
      const pred = doc.data();
      const pts = calcAdminPoints(pred.prediction, actualResult);
      batch.update(doc.ref, { points: pts });
      if (!participantDelta[pred.participantId]) participantDelta[pred.participantId] = 0;
      participantDelta[pred.participantId] += pts;
    });

    await batch.commit();

    const batch2 = db.batch();
    for (const [pId, delta] of Object.entries(participantDelta)) {
      batch2.update(db.collection('participants').doc(pId), {
        totalPoints: firebase.firestore.FieldValue.increment(delta)
      });
    }
    await batch2.commit();
  } catch (err) {
    console.error('Error actualizando puntos:', err);
  }
}

function calcAdminPoints(prediction, actual) {
  if (!prediction || !actual) return 0;
  if (prediction === actual) return 3;
  const [ah, aa] = actual.split('-').map(Number);
  const [ph, pa] = prediction.split('-').map(Number);
  if (isNaN(ah) || isNaN(ph)) return 0;
  return Math.sign(ah - aa) === Math.sign(ph - pa) ? 1 : 0;
}

// ══════════════════════════════════════════════════
// TABLA DE PARTICIPANTES CON PREDICCIONES
// ══════════════════════════════════════════════════

function renderParticipantsTable() {
  const container = document.getElementById('participants-table-container');
  if (!container) return;

  const participants = Object.values(participantsCache);
  if (participants.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px">No hay participantes aún</p>';
    return;
  }

  // Calcular puntos en tiempo real
  const ranked = participants.map(p => {
    const preds = predictionsCache[p.id] || {};
    let pts = 0, exactCount = 0, winnerCount = 0;
    Object.entries(preds).forEach(([matchId, pred]) => {
      const match = matchesData[matchId];
      if (!match?.result) return;
      const p2 = calcAdminPoints(pred.prediction, match.result);
      pts += p2;
      if (p2 === 3) exactCount++;
      else if (p2 === 1) winnerCount++;
    });
    const predCount = Object.keys(preds).length;
    const discount = pts >= 15 ? '15%' : pts >= 10 ? '10%' : pts >= 5 ? '5%' : '–';
    return { ...p, pts, exactCount, winnerCount, predCount, discount };
  }).sort((a, b) => b.pts - a.pts);

  container.innerHTML = `
    <div style="margin-bottom:20px;padding:12px 16px;background:rgba(212,175,55,0.05);border:1px solid rgba(212,175,55,0.15);border-radius:10px;font-size:13px;color:var(--text-secondary)">
      💡 Haz clic en <strong style="color:var(--gold)">Ver predicciones</strong> para ver el detalle de cada participante partido a partido.
    </div>
    <div style="overflow-x:auto">
      <table class="participants-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Nombre</th>
            <th>Celular</th>
            <th>Predicciones</th>
            <th>Exactos ✓✓</th>
            <th>Ganador ✓</th>
            <th>Puntos</th>
            <th>Descuento</th>
            <th>Detalle</th>
          </tr>
        </thead>
        <tbody>
          ${ranked.map((p, i) => `
            <tr>
              <td style="color:var(--text-muted);font-weight:700">${i+1}</td>
              <td style="font-weight:700;color:var(--text-primary)">${escapeHTML(p.name || '')}</td>
              <td style="color:var(--text-muted);font-family:monospace">${escapeHTML(p.phone || '')}</td>
              <td style="text-align:center;color:var(--text-secondary)">${p.predCount}</td>
              <td style="text-align:center;color:var(--gold);font-weight:800">${p.exactCount}</td>
              <td style="text-align:center;color:var(--accent-blue);font-weight:800">${p.winnerCount}</td>
              <td style="text-align:center;font-weight:900;font-size:18px;color:var(--gold)">${p.pts}</td>
              <td style="text-align:center;font-weight:700;color:${p.pts >= 5 ? 'var(--accent-green)' : 'var(--text-muted)'}">${p.discount}</td>
              <td>
                <button class="admin-btn btn-detail" onclick="showParticipantDetail('${p.id}')">
                  Ver predicciones
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ── Modal detalle participante ──
function showParticipantDetail(participantId) {
  const p = participantsCache[participantId];
  if (!p) return;
  const preds = predictionsCache[participantId] || {};

  const overlay = document.getElementById('detail-overlay');
  const body = document.getElementById('detail-body');
  const title = document.getElementById('detail-title');

  if (!overlay || !body) return;

  title.textContent = `${p.name} — ${p.phone}`;

  // Agrupar partidos
  const rows = INITIAL_MATCHES.map(match => {
    const group = GROUPS_DATA[match.group];
    const pred = preds[match.id];
    const liveData = matchesData[match.id] || match;
    const actualResult = liveData.result;
    const dateF = formatAdminDate(match.date);

    let predCell = '<span class="pred-cell none">–</span>';
    let resultCell = '<span class="pred-cell none">–</span>';
    let icon = '<span class="detail-icon none">○</span>';

    if (pred) {
      // Mostrar con banderas: 🇲🇽 2 - 1 🇿🇦
      const [ph, pa] = pred.prediction.split('-');
      const predFormatted = `${group.flags[match.home]} ${ph} - ${pa} ${group.flags[match.away]}`;
      predCell = `<span class="pred-cell saved">${predFormatted}</span>`;
    }

    if (actualResult) {
      resultCell = `<span class="pred-cell result">${actualResult}</span>`;
      if (pred) {
        const pts = calcAdminPoints(pred.prediction, actualResult);
        if (pts === 3) {
          icon = '<span class="detail-icon exact" title="Resultado exacto +3">✓✓</span>';
        } else if (pts === 1) {
          icon = '<span class="detail-icon winner" title="Ganador correcto +1">✓</span>';
        } else {
          icon = '<span class="detail-icon miss" title="Falló">✗</span>';
        }
      } else {
        icon = '<span class="detail-icon no-pred" title="Sin predicción">○</span>';
      }
    }

    return `
      <tr>
        <td class="detail-match-group">
          <span class="detail-group-badge">${match.group}</span>
        </td>
        <td class="detail-match-info">
          <div class="detail-match-date">${dateF} ${match.time}h</div>
          <div class="detail-match-teams">
            <span>${group.flags[match.home]} ${match.home}</span>
            <span style="color:var(--text-muted);margin:0 6px">vs</span>
            <span>${match.away} ${group.flags[match.away]}</span>
          </div>
        </td>
        <td style="text-align:center">${predCell}</td>
        <td style="text-align:center">${resultCell}</td>
        <td style="text-align:center">${icon}</td>
      </tr>
    `;
  }).join('');

  body.innerHTML = `
    <div style="overflow-x:auto">
      <table class="detail-table">
        <thead>
          <tr>
            <th>Grp</th>
            <th>Partido</th>
            <th>Predicción</th>
            <th>Resultado</th>
            <th>Resultado</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  overlay.classList.add('open');
}

function closeDetailModal() {
  document.getElementById('detail-overlay')?.classList.remove('open');
}

// ── Tabs admin ──
function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.toggle('active', p.id === `admin-panel-${tab}`));
  if (tab === 'participantes') renderParticipantsTable();
}

// ── Seed inicial ──
async function seedMatchesToFirebase() {
  if (!confirm('¿Cargar los 72 partidos a Firebase? Solo hacer esto UNA VEZ.')) return;
  try {
    const batch = db.batch();
    INITIAL_MATCHES.forEach(m => {
      const ref = db.collection('matches').doc(m.id);
      batch.set(ref, { ...m, status: 'pending', result: null });
    });
    await batch.commit();
    showAdminToast(`✅ ${INITIAL_MATCHES.length} partidos cargados a Firebase`, 'success');
  } catch (err) {
    showAdminToast('Error cargando partidos: ' + err.message, 'error');
  }
}

// ── Utilities ──
function formatAdminDate(dateStr) {
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const d = new Date(dateStr + 'T12:00:00');
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function escapeHTML(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

let adminToastTimeout;
function showAdminToast(message, type = 'info') {
  const toast = document.getElementById('admin-toast');
  if (!toast) return;
  clearTimeout(adminToastTimeout);
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  adminToastTimeout = setTimeout(() => toast.classList.remove('show'), 4500);
}
