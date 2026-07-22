# 📋 Project Gestures - Detailed Implementation TODO List

## Phase 1: Application Setup & Core Architecture (P1 - Skeleton)
- [x] **1.1 HTML Shell & Layout**
  - [x] Create `index.html` as a single, self-contained mobile web page.
  - [x] Configure meta viewport tags for mobile responsiveness (`width=device-width, initial-scale=1.0, user-scalable=no`).
  - [x] Setup responsive layout structure with modern mobile styling and large font elements.
- [x] **1.2 Header & Control Bar**
  - [x] Add Active Tab Indicator & Status Bar.
  - [x] Add **Start Recording** and **Stop Recording** buttons.
  - [x] Add recording status indicator (Recording active / stopped).
- [x] **1.3 Tab Navigation & Screens**
  - [x] Implement navigation tabs for switching between **Feed**, **Zoom**, and **Type** screens.
  - [x] **📱 Feed Screen**: Build a scrollable feed container with sample item cards.
  - [x] **🔍 Zoom Screen**: Build an image container displaying a sample high-res image optimized for multi-touch pinch gestures.
  - [x] **⌨️ Type Screen**: Add target sentence prompt and an interactive text input area.

---

## Phase 2: Touch Telemetry Capture System (P2 - Touch)
- [x] **2.1 Touch Event Listeners**
  - [x] Attach `touchstart`, `touchmove`, and `touchend` event listeners to interactive areas.
  - [x] Prevent default unwanted gesture behaviors where appropriate to capture raw telemetry smoothly.
- [x] **2.2 Touch Data Collection**
  - [x] Extract pointer coordinates (`x`, `y`).
  - [x] Count active touch points (`finger_count`).
  - [x] Record high-precision timestamps (`performance.now()` / `Date.now()`).
- [x] **2.3 State Management & Tagging**
  - [x] Store telemetry points into a primary data array during active recording.
  - [x] Tag each recorded event with the active screen (`feed`, `zoom`, `type`).

---

## Phase 3: Motion Sensor Integration & iOS Permission Handling (P3 - Motion)
- [x] **3.1 iOS Sensor Permission Handling**
  - [x] Implement an explicit **"Enable Sensors"** button.
  - [x] Request permission via `DeviceMotionEvent.requestPermission()` and `DeviceOrientationEvent.requestPermission()` on user click.
  - [x] Handle permission granted / denied states gracefully with UI feedback.
- [x] **3.2 Motion Event Listeners**
  - [x] Register `devicemotion` event listener for accelerometer telemetry (`accx`, `accy`, `accz`).
  - [x] Register `deviceorientation` event listener for gyroscope telemetry (`rotAlpha`, `rotBeta`, `rotGamma`).
- [x] **3.3 Telemetry Synchronization**
  - [x] Stream motion telemetry at device native rate synchronized with exact timestamps.
  - [x] Append sensor readings into the primary data payload array alongside touch events.

---

## Phase 4: Heuristic Auto-Labeling Engine & Live Analytics Stats (P4 - Auto-Label & Live Stats)
- [ ] **4.1 Auto-Labeling Heuristics**
  - [ ] **Feed Screen**: Detect swipe vector direction to auto-label `scroll_up` vs `scroll_down`.
  - [ ] **Zoom Screen**: Track 2-finger Euclidean distance delta over time to auto-label `zoom_in` vs `zoom_out`.
  - [ ] **Type Screen**: Track tap events inside the input box to auto-label `typing`.
- [ ] **4.2 Real-time Counter Stats**
  - [ ] Calculate live gesture counts for each label (`scroll_up`, `scroll_down`, `zoom_in`, `zoom_out`, `typing`).
  - [ ] Display live statistics counters in the top control header/dashboard.

---

## Phase 5: Data Visualization & Pipeline Status (P5 - Visualise)
- [ ] **5.1 Live Acceleration Line Chart**
  - [ ] Integrate lightweight charting solution (e.g., Chart.js or Canvas API).
  - [ ] Render live line chart showing acceleration magnitude ($\sqrt{accx^2 + accy^2 + accz^2}$) for the active gesture.
- [ ] **5.2 Gesture Distribution Bar Chart**
  - [ ] Render bar chart showing current session count breakdown by gesture type.
- [ ] **5.3 5-Stage Data Pipeline Indicator**
  - [ ] Create interactive visual status strip: `Capture` $\rightarrow$ `Clean` $\rightarrow$ `Analyse` $\rightarrow$ `Visualise` $\rightarrow$ `Export`.
  - [ ] Update active step highlight dynamically based on user interaction flow.

---

## Phase 6: Session Management & Data Export (P6 - Export)
- [ ] **6.1 Volunteer Session Initialization**
  - [ ] Prompt user for anonymized `volunteer_id` (e.g., `V01`, `V02`) prior to starting recording session.
  - [ ] Enforce anonymization policy (reject real names).
- [ ] **6.2 Schema Enforcement**
  - [ ] Format output payload matching exact CSV header structure:
    `timestamp, screen, event_type, x, y, finger_count, accx, accy, accz, rotAlpha, rotBeta, rotGamma, gesture_label, volunteer_id`
- [ ] **6.3 Export Functionality**
  - [ ] Add **Download CSV** (`data.csv`) trigger button.
  - [ ] Add **Download JSON** (`data.json`) trigger button.

---

## Phase 7: Deployment, Validation & Data Collection Strategy
- [ ] **7.1 GitHub Pages Deployment**
  - [ ] Push codebase to GitHub repository.
  - [ ] Enable GitHub Pages under Repository Settings $\rightarrow$ Pages for HTTPS context.
- [ ] **7.2 Phone Testing & iOS Sensor Verification**
  - [ ] Test application on mobile devices (iOS Safari and Android Chrome).
  - [ ] Verify sensor permission prompt and continuous motion logging.
- [ ] **7.3 Volunteer Data Collection Campaign**
  - [ ] Ensure user consent warning/modal before session start.
  - [ ] Collect sessions across 10+ anonymized volunteers ($V01 - V10$).
  - [ ] Ensure 5 repetitions per gesture per screen per volunteer.
