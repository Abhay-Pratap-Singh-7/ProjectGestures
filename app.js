/**
 * ✋ Hand-Pattern Analytics Application Logic
 * Telemetry Stream & Heuristic Auto-Labeling Engine
 * Event Types: scroll-start/scrolling/scroll-end, zoom-in-start/zooming-in/zoom-in-end, input-start/inputting/input-end
 * Finger Counts: 1 for scroll & input, 2 for zoom
 */

// Application Core State
let isRecording = false;
let currentScreen = 'feed';
let telemetryData = [];
let isHardwareSensorDetected = false;

let currentMotion = {
  accx: 0,
  accy: 0,
  accz: 9.81,
  rotAlpha: 0,
  rotBeta: 0,
  rotGamma: 0
};

const gestureCounts = {
  scroll_up: 0,
  scroll_down: 0,
  zoom_in: 0,
  zoom_out: 0,
  typing: 0
};

let accHistory = [];
const MAX_ACC_HISTORY = 50;

// Gesture Stroke Tracking Variables
let feedTouchStartY = null;
let feedTouchLastY = null;
let feedScrollTimer = null;
let initialScrollTop = null;

let pinchStartDist = null;
let pinchLastDist = null;
let wheelZoomTimer = null;
let wheelDeltaSum = 0;
let isWheelZooming = false;

// DOM Elements
const btnSensors = document.getElementById('btn-sensors');
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const statusBadge = document.getElementById('status-badge');
const statusText = document.getElementById('status-text');
const currentScreenName = document.getElementById('current-screen-name');
const navItems = document.querySelectorAll('.nav-item');
const screens = document.querySelectorAll('.screen');

// Initialize Navigation Tab Switching
navItems.forEach(item => {
  item.addEventListener('click', () => {
    const target = item.getAttribute('data-target');
    if (target === currentScreen) return;

    navItems.forEach(nav => nav.classList.remove('active'));
    item.classList.add('active');

    screens.forEach(screen => screen.classList.remove('active'));
    const activeScreen = document.getElementById(`screen-${target}`);
    if (activeScreen) activeScreen.classList.add('active');

    currentScreen = target;
    currentScreenName.textContent = target.charAt(0).toUpperCase() + target.slice(1);

    if (target === 'analytics') {
      updatePipelineStep(4);
      drawAccLineChart();
      drawGestureBarChart();
    }
  });
});

// Pipeline Indicator Controller
function updatePipelineStep(stepNum) {
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById(`pipe-${i}`);
    if (el) {
      if (i === stepNum) el.classList.add('active');
      else el.classList.remove('active');
    }
  }
}

// Recording Controls & Volunteer Consent Modal
const consentModal = document.getElementById('consent-modal');
const consentVId = document.getElementById('consent-v-id');
const btnConsentAgree = document.getElementById('btn-consent-agree');
const btnConsentCancel = document.getElementById('btn-consent-cancel');

btnStart.addEventListener('click', () => {
  let vId = getVolunteerId();
  if (!vId || vId.trim() === '') {
    vId = prompt('Enter Anonymized Volunteer ID (e.g. V01):', 'V01');
    if (!vId) return;
    document.getElementById('volunteer-id').value = vId;
  }
  if (consentVId) consentVId.textContent = vId;
  if (consentModal) consentModal.style.display = 'flex';
});

if (btnConsentAgree) {
  btnConsentAgree.addEventListener('click', () => {
    if (consentModal) consentModal.style.display = 'none';
    isRecording = true;
    statusBadge.classList.add('recording');
    statusText.textContent = 'Recording';
    btnStart.style.opacity = '0.5';
    btnStart.style.pointerEvents = 'none';
    btnStop.classList.add('active');
    updatePipelineStep(1);
  });
}

if (btnConsentCancel) {
  btnConsentCancel.addEventListener('click', () => {
    if (consentModal) consentModal.style.display = 'none';
  });
}

btnStop.addEventListener('click', () => {
  isRecording = false;
  statusBadge.classList.remove('recording');
  statusText.textContent = 'Standby';
  btnStart.style.opacity = '1';
  btnStart.style.pointerEvents = 'auto';
  btnStop.classList.remove('active');
  updatePipelineStep(2);
});

// Update Stat Counters in Analytics Tab
function updateStatCounters() {
  const elUp = document.getElementById('stat-scroll-up');
  const elDown = document.getElementById('stat-scroll-down');
  const elZIn = document.getElementById('stat-zoom-in');
  const elZOut = document.getElementById('stat-zoom-out');
  const elType = document.getElementById('stat-typing');

  if (elUp) elUp.textContent = gestureCounts.scroll_up;
  if (elDown) elDown.textContent = gestureCounts.scroll_down;
  if (elZIn) elZIn.textContent = gestureCounts.zoom_in;
  if (elZOut) elZOut.textContent = gestureCounts.zoom_out;
  if (elType) elType.textContent = gestureCounts.typing;
}

// Real-Time Telemetry Readout Renderer
function updateTelemetryUI() {
  const elAccX = document.getElementById('val-acc-x');
  const elAccY = document.getElementById('val-acc-y');
  const elAccZ = document.getElementById('val-acc-z');
  const elRotA = document.getElementById('val-rot-a');
  const elRotB = document.getElementById('val-rot-b');
  const elRotG = document.getElementById('val-rot-g');

  if (elAccX) elAccX.textContent = (currentMotion.accx || 0).toFixed(2);
  if (elAccY) elAccY.textContent = (currentMotion.accy || 0).toFixed(2);
  if (elAccZ) elAccZ.textContent = (currentMotion.accz || 0).toFixed(2);
  if (elRotA) elRotA.textContent = (currentMotion.rotAlpha || 0).toFixed(2);
  if (elRotB) elRotB.textContent = (currentMotion.rotBeta || 0).toFixed(2);
  if (elRotG) elRotG.textContent = (currentMotion.rotGamma || 0).toFixed(2);

  const ax = currentMotion.accx || 0;
  const ay = currentMotion.accy || 0;
  const az = currentMotion.accz || 0;
  const mag = Math.sqrt(ax * ax + ay * ay + az * az);

  const liveAccVal = document.getElementById('live-acc-val');
  if (liveAccVal) liveAccVal.textContent = mag.toFixed(2) + ' m/s²';

  accHistory.push(mag);
  if (accHistory.length > MAX_ACC_HISTORY) accHistory.shift();

  if (currentScreen === 'analytics') {
    drawAccLineChart();
    drawGestureBarChart();
  }
}

// Volunteer ID & Record Count Helpers
function getVolunteerId() {
  const inputEl = document.getElementById('volunteer-id');
  if (inputEl && inputEl.value.trim() !== '') {
    return inputEl.value.trim();
  }
  return 'V01';
}

function updateRecordCountUI() {
  const el = document.getElementById('export-record-count');
  if (el) el.textContent = `${telemetryData.length} Records`;
}

// Central Telemetry Record Append Function (Schema Enforced)
function recordTelemetry(eventType, x, y, fingerCount, gestureLabel) {
  if (!isRecording) return;

  // Filter out raw 'motion' events
  if (eventType === 'motion') return;

  telemetryData.push({
    timestamp: Date.now(),
    screen: currentScreen,
    event_type: eventType,
    x: x !== null && x !== undefined ? x : '',
    y: y !== null && y !== undefined ? y : '',
    finger_count: fingerCount !== null && fingerCount !== undefined ? fingerCount : '',
    accx: currentMotion.accx !== null ? currentMotion.accx : '',
    accy: currentMotion.accy !== null ? currentMotion.accy : '',
    accz: currentMotion.accz !== null ? currentMotion.accz : '',
    rotAlpha: currentMotion.rotAlpha !== null ? currentMotion.rotAlpha : '',
    rotBeta: currentMotion.rotBeta !== null ? currentMotion.rotBeta : '',
    rotGamma: currentMotion.rotGamma !== null ? currentMotion.rotGamma : '',
    gesture_label: gestureLabel || '',
    volunteer_id: getVolunteerId()
  });
  updateRecordCountUI();
}

// Export CSV Function matching exact schema
function exportCSV() {
  if (telemetryData.length === 0) {
    alert('No telemetry data recorded yet. Please start recording and perform gestures first.');
    return;
  }

  updatePipelineStep(5);

  const headers = ['timestamp', 'screen', 'event_type', 'x', 'y', 'finger_count', 'accx', 'accy', 'accz', 'rotAlpha', 'rotBeta', 'rotGamma', 'gesture_label', 'volunteer_id'];
  let csvContent = headers.join(',') + '\n';

  telemetryData.forEach(row => {
    const line = headers.map(header => {
      const val = row[header];
      return val !== undefined && val !== null ? val : '';
    }).join(',');
    csvContent += line + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `data_${getVolunteerId()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export JSON Function
function exportJSON() {
  if (telemetryData.length === 0) {
    alert('No telemetry data recorded yet. Please start recording and perform gestures first.');
    return;
  }

  updatePipelineStep(5);

  const jsonContent = JSON.stringify(telemetryData, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `data_${getVolunteerId()}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Motion & Orientation Sensor Listeners
function initSensors() {
  window.addEventListener('devicemotion', (e) => {
    const acc = e.accelerationIncludingGravity || e.acceleration;
    if (acc && typeof acc.x === 'number' && acc.x !== null) {
      isHardwareSensorDetected = true;
      currentMotion.accx = parseFloat(acc.x.toFixed(4));
      currentMotion.accy = acc.y !== null ? parseFloat(acc.y.toFixed(4)) : 0;
      currentMotion.accz = acc.z !== null ? parseFloat(acc.z.toFixed(4)) : 9.81;
      updateTelemetryUI();
    }
  }, true);

  window.addEventListener('deviceorientation', (e) => {
    if (e.alpha !== null && typeof e.alpha === 'number') {
      isHardwareSensorDetected = true;
      currentMotion.rotAlpha = parseFloat(e.alpha.toFixed(4));
      currentMotion.rotBeta = e.beta !== null ? parseFloat(e.beta.toFixed(4)) : 0;
      currentMotion.rotGamma = e.gamma !== null ? parseFloat(e.gamma.toFixed(4)) : 0;
      updateTelemetryUI();
    }
  }, true);

  if (btnSensors) {
    btnSensors.classList.add('granted');
    btnSensors.textContent = '✅ Sensors Active';
  }
}

// Auto-initialize sensors
initSensors();

// Enable Sensors Button Handler (iOS compatibility)
if (btnSensors) {
  btnSensors.addEventListener('click', async () => {
    try {
      if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        const motionPermission = await DeviceMotionEvent.requestPermission();
        let orientationPermission = 'granted';
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
          orientationPermission = await DeviceOrientationEvent.requestPermission();
        }

        if (motionPermission === 'granted' && orientationPermission === 'granted') {
          initSensors();
        } else {
          alert('Sensor permission denied.');
        }
      } else {
        initSensors();
      }
    } catch (err) {
      console.error('Sensor permission error:', err);
      initSensors();
    }
  });
}

// Desktop Mouse Motion Fallback Simulation (only if hardware sensors are absent)
let lastMouseX = null, lastMouseY = null, lastMouseTime = null;
document.addEventListener('mousemove', (e) => {
  if (isHardwareSensorDetected) return;

  const now = Date.now();
  if (lastMouseTime && now > lastMouseTime) {
    const dt = (now - lastMouseTime) / 1000;
    const vx = (e.clientX - lastMouseX) / dt;
    const vy = (e.clientY - lastMouseY) / dt;

    currentMotion.accx = parseFloat((vx / 100).toFixed(4));
    currentMotion.accy = parseFloat((vy / 100).toFixed(4));
    currentMotion.accz = parseFloat((9.81 + (Math.sin(now / 200) * 0.5)).toFixed(4));

    currentMotion.rotAlpha = parseFloat(((e.clientX / window.innerWidth) * 360).toFixed(2));
    currentMotion.rotBeta = parseFloat((((e.clientY / window.innerHeight) * 180) - 90).toFixed(2));
    currentMotion.rotGamma = parseFloat((((e.clientX / window.innerWidth) * 180) - 90).toFixed(2));

    updateTelemetryUI();
  }
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  lastMouseTime = now;
});

// Continuous UI refresh loop for smooth live charts
function animationLoop() {
  if (currentScreen === 'analytics') {
    updateTelemetryUI();
  }
  requestAnimationFrame(animationLoop);
}

// Infinite Color Reel Generator for Feed Screen
let reelCardIndex = 1;
const reelTopics = [
  { icon: '📱', title: 'Behavioral Biometrics', text: 'Scroll naturally through this reel. Micro-tilts and flick velocity are logged.' },
  { icon: '🌊', title: 'Sensor Streaming', text: 'Accelerometer and gyroscope capture hand orientation changes in real time.' },
  { icon: '📊', title: 'Motion Signatures', text: 'Every user has a unique hold posture and swipe force signature.' },
  { icon: '⚡', title: 'Velocity & Pressure', text: 'Fast swiping produces sharp acceleration peaks compared to slow scrolling.' },
  { icon: '🚀', title: 'Analytics Pipeline', text: 'Every scroll gesture is auto-classified and sent to the analytics engine.' },
  { icon: '🔬', title: 'Research Context', text: 'Biometrics track continuous physical motion patterns across interactions.' }
];

function generateRandomGradient() {
  const h1 = Math.floor(Math.random() * 360);
  const h2 = (h1 + 40 + Math.floor(Math.random() * 60)) % 360;
  return `linear-gradient(135deg, hsl(${h1}, 75%, 22%), hsl(${h2}, 85%, 12%))`;
}

function createReelCard() {
  const card = document.createElement('div');
  card.className = 'reel-card';
  card.style.background = generateRandomGradient();

  const topic = reelTopics[(reelCardIndex - 1) % reelTopics.length];
  card.innerHTML = `
    <div class="reel-badge">Reel #${reelCardIndex}</div>
    <div class="reel-title">${topic.icon} ${topic.title}</div>
    <div class="reel-body">${topic.text}</div>
  `;
  reelCardIndex++;
  return card;
}

const feedScreenEl = document.getElementById('screen-feed');
if (feedScreenEl) {
  for (let i = 0; i < 6; i++) {
    feedScreenEl.appendChild(createReelCard());
  }

  feedScreenEl.addEventListener('scroll', () => {
    // Infinite Scroll append
    if (feedScreenEl.scrollTop + feedScreenEl.clientHeight >= feedScreenEl.scrollHeight - 300) {
      for (let i = 0; i < 3; i++) {
        feedScreenEl.appendChild(createReelCard());
      }
    }

    if (!isRecording) return;
    if (initialScrollTop === null) {
      initialScrollTop = feedScreenEl.scrollTop;
      recordTelemetry('scroll-start', null, null, 1, 'scroll_down');
    } else {
      const delta = feedScreenEl.scrollTop - initialScrollTop;
      const label = delta > 0 ? 'scroll_down' : 'scroll_up';
      recordTelemetry('scrolling', null, null, 1, label);
    }
    clearTimeout(feedScrollTimer);
    feedScrollTimer = setTimeout(() => {
      const delta = feedScreenEl.scrollTop - initialScrollTop;
      let label = 'scroll_down';
      if (delta > 15) {
        label = 'scroll_down';
        gestureCounts.scroll_down++;
        updateStatCounters();
      } else if (delta < -15) {
        label = 'scroll_up';
        gestureCounts.scroll_up++;
        updateStatCounters();
      }
      recordTelemetry('scroll-end', null, null, 1, label);
      initialScrollTop = null;
    }, 250);
  }, { passive: true });
}

// Zoom Mouse Wheel Event Handling
const zoomScreenEl = document.getElementById('screen-zoom');
const zoomTarget = document.getElementById('zoom-target');
let currentScale = 1;

if (zoomScreenEl) {
  zoomScreenEl.addEventListener('wheel', (e) => {
    if (!isRecording) return;
    e.preventDefault();

    const isZoomIn = e.deltaY < 0;
    const currentLabel = isZoomIn ? 'zoom_in' : 'zoom_out';

    if (!isWheelZooming) {
      isWheelZooming = true;
      recordTelemetry(isZoomIn ? 'zoom-in-start' : 'zoom-out-start', Math.round(e.clientX), Math.round(e.clientY), 2, currentLabel);
    } else {
      recordTelemetry(isZoomIn ? 'zooming-in' : 'zooming-out', Math.round(e.clientX), Math.round(e.clientY), 2, currentLabel);
    }

    wheelDeltaSum += e.deltaY;
    const factor = isZoomIn ? 1.05 : 0.95;
    currentScale = Math.min(Math.max(currentScale * factor, 0.5), 3);
    if (zoomTarget) zoomTarget.style.transform = `scale(${currentScale})`;

    clearTimeout(wheelZoomTimer);
    wheelZoomTimer = setTimeout(() => {
      if (wheelDeltaSum < -10) {
        gestureCounts.zoom_in++;
        recordTelemetry('zoom-in-end', Math.round(e.clientX), Math.round(e.clientY), 2, 'zoom_in');
        updateStatCounters();
      } else if (wheelDeltaSum > 10) {
        gestureCounts.zoom_out++;
        recordTelemetry('zoom-out-end', Math.round(e.clientX), Math.round(e.clientY), 2, 'zoom_out');
        updateStatCounters();
      }
      wheelDeltaSum = 0;
      isWheelZooming = false;
    }, 300);
  }, { passive: false });
}

// Touch Event Handling (Scroll, Zoom, Input mapped event_type and finger_count)
function handleTouchEvent(e) {
  if (!isRecording) return;

  const eventType = e.type;
  const touchList = e.touches.length > 0 ? e.touches : e.changedTouches;
  const touch = touchList[0];
  const touchX = touch ? Math.round(touch.clientX) : null;
  const touchY = touch ? Math.round(touch.clientY) : null;

  // 1. FEED SCREEN (Scroll)
  if (currentScreen === 'feed') {
    if (eventType === 'touchstart' && e.touches.length > 0) {
      feedTouchStartY = e.touches[0].clientY;
      feedTouchLastY = e.touches[0].clientY;
      recordTelemetry('scroll-start', touchX, touchY, 1, 'scroll_down');
    } else if (eventType === 'touchmove' && e.touches.length > 0) {
      feedTouchLastY = e.touches[0].clientY;
      if (feedTouchStartY !== null) {
        const moveDelta = feedTouchLastY - feedTouchStartY;
        const currentLabel = moveDelta < 0 ? 'scroll_down' : 'scroll_up';
        recordTelemetry('scrolling', touchX, touchY, 1, currentLabel);
      }
    } else if (eventType === 'touchend') {
      let finalLabel = 'scroll_down';
      if (feedTouchStartY !== null && feedTouchLastY !== null) {
        const totalDelta = feedTouchLastY - feedTouchStartY;
        if (totalDelta < -15) {
          finalLabel = 'scroll_down';
          gestureCounts.scroll_down++;
          updateStatCounters();
        } else if (totalDelta > 15) {
          finalLabel = 'scroll_up';
          gestureCounts.scroll_up++;
          updateStatCounters();
        }
      }
      recordTelemetry('scroll-end', touchX, touchY, 1, finalLabel);
      feedTouchStartY = null;
      feedTouchLastY = null;
    }
  }

  // 2. ZOOM SCREEN (Zoom In / Zoom Out)
  else if (currentScreen === 'zoom') {
    if (eventType === 'touchstart' && e.touches.length === 2) {
      pinchStartDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchLastDist = pinchStartDist;
      recordTelemetry('zoom-in-start', touchX, touchY, 2, 'zoom_in');
    } else if (eventType === 'touchmove' && e.touches.length === 2) {
      pinchLastDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (pinchStartDist !== null) {
        const isExpanding = pinchLastDist - pinchStartDist > 0;
        const mappedType = isExpanding ? 'zooming-in' : 'zooming-out';
        const label = isExpanding ? 'zoom_in' : 'zoom_out';
        recordTelemetry(mappedType, touchX, touchY, 2, label);
      }
    } else if (eventType === 'touchend') {
      if (pinchStartDist !== null && pinchLastDist !== null) {
        const distDelta = pinchLastDist - pinchStartDist;
        if (distDelta > 15) {
          gestureCounts.zoom_in++;
          recordTelemetry('zoom-in-end', touchX, touchY, 2, 'zoom_in');
          updateStatCounters();
        } else if (distDelta < -15) {
          gestureCounts.zoom_out++;
          recordTelemetry('zoom-out-end', touchX, touchY, 2, 'zoom_out');
          updateStatCounters();
        }
      }
      pinchStartDist = null;
      pinchLastDist = null;
    }
  }

// 3. TYPE SCREEN (Input per-letter chunking)
  else if (currentScreen === 'type') {
    // Touch logging inside type screen
    if (eventType === 'touchstart') {
      recordTelemetry('input-start', touchX, touchY, 1, 'typing');
    } else if (eventType === 'touchmove') {
      recordTelemetry('inputting', touchX, touchY, 1, 'typing');
    } else if (eventType === 'touchend') {
      recordTelemetry('input-end', touchX, touchY, 1, 'typing');
    }
  }
}

// Typing Input Field Event Listeners (Every letter input creates a separate input-start, inputting, input-end chunk)
const typingInput = document.getElementById('typing-input');
let isLetterChunkActive = false;

if (typingInput) {
  typingInput.addEventListener('keydown', (e) => {
    if (!isRecording) return;
    if (!isLetterChunkActive) {
      isLetterChunkActive = true;
      const rect = typingInput.getBoundingClientRect();
      const x = Math.round(rect.left + rect.width / 2);
      const y = Math.round(rect.top + rect.height / 2);
      recordTelemetry('input-start', x, y, 1, 'typing');
    }
  });

  typingInput.addEventListener('input', (e) => {
    if (!isRecording) return;
    const rect = typingInput.getBoundingClientRect();
    const x = Math.round(rect.left + rect.width / 2);
    const y = Math.round(rect.top + rect.height / 2);

    if (!isLetterChunkActive) {
      recordTelemetry('input-start', x, y, 1, 'typing');
    }

    gestureCounts.typing++;
    updateStatCounters();
    recordTelemetry('inputting', x, y, 1, 'typing');

    // Auto-complete chunk end for virtual keyboards
    setTimeout(() => {
      if (isLetterChunkActive) {
        recordTelemetry('input-end', x, y, 1, 'typing');
        isLetterChunkActive = false;
      }
    }, 40);
  });

  typingInput.addEventListener('keyup', (e) => {
    if (!isRecording) return;
    if (isLetterChunkActive) {
      const rect = typingInput.getBoundingClientRect();
      const x = Math.round(rect.left + rect.width / 2);
      const y = Math.round(rect.top + rect.height / 2);
      recordTelemetry('input-end', x, y, 1, 'typing');
      isLetterChunkActive = false;
    }
  });
}

// Attach Global Touch Event Listeners
['touchstart', 'touchmove', 'touchend'].forEach(eventName => {
  document.addEventListener(eventName, handleTouchEvent, { passive: true });
});

// Pinch Zoom Interactive Scale Handling for Touch Devices
let initialPinchDistance = null;
if (zoomScreenEl) {
  zoomScreenEl.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      initialPinchDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  }, { passive: true });

  zoomScreenEl.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && initialPinchDistance && zoomTarget) {
      const currentDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = currentDistance / initialPinchDistance;
      const newScale = Math.min(Math.max(currentScale * factor, 0.5), 3);
      zoomTarget.style.transform = `scale(${newScale})`;
    }
  }, { passive: true });

  zoomScreenEl.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) {
      initialPinchDistance = null;
      if (zoomTarget) {
        const transform = window.getComputedStyle(zoomTarget).getPropertyValue('transform');
        if (transform !== 'none') {
          const values = transform.split('(')[1].split(')')[0].split(',');
          currentScale = parseFloat(values[0]) || 1;
        }
      }
    }
  }, { passive: true });
}

// Canvas Line Chart Rendering Function
function drawAccLineChart() {
  const canvas = document.getElementById('acc-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width) return;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;

  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  for (let y = 0; y < height; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  if (accHistory.length < 2) return;

  const maxVal = Math.max(...accHistory, 20);

  ctx.beginPath();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;

  for (let i = 0; i < accHistory.length; i++) {
    const x = (i / (MAX_ACC_HISTORY - 1)) * width;
    const y = height - (accHistory[i] / maxVal) * (height - 20) - 10;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  const lastX = ((accHistory.length - 1) / (MAX_ACC_HISTORY - 1)) * width;
  ctx.lineTo(lastX, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, 'rgba(56, 189, 248, 0.3)');
  grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = grad;
  ctx.fill();
}

// Canvas Bar Chart Rendering Function
function drawGestureBarChart() {
  const canvas = document.getElementById('bar-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width) return;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;

  ctx.clearRect(0, 0, width, height);

  const labels = ['Scroll Up', 'Scroll Down', 'Zoom In', 'Zoom Out', 'Typing'];
  const keys = ['scroll_up', 'scroll_down', 'zoom_in', 'zoom_out', 'typing'];
  const counts = keys.map(k => gestureCounts[k]);
  const maxCount = Math.max(...counts, 5);

  const barWidth = (width - 40) / keys.length - 6;
  const colors = ['#38bdf8', '#818cf8', '#34d399', '#f43f5e', '#fbbf24'];

  for (let i = 0; i < keys.length; i++) {
    const barHeight = (counts[i] / maxCount) * (height - 45);
    const x = 20 + i * (barWidth + 6);
    const y = height - barHeight - 22;

    ctx.fillStyle = colors[i];
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
    else ctx.rect(x, y, barWidth, barHeight);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(counts[i], x + barWidth / 2, y - 4);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px sans-serif';
    ctx.fillText(labels[i].split(' ')[0], x + barWidth / 2, height - 6);
  }
}

// Attach Export Event Listeners
const btnExportCSV = document.getElementById('btn-export-csv');
if (btnExportCSV) btnExportCSV.addEventListener('click', exportCSV);

const btnExportJSON = document.getElementById('btn-export-json');
if (btnExportJSON) btnExportJSON.addEventListener('click', exportJSON);

// Start continuous animation loop
requestAnimationFrame(animationLoop);
