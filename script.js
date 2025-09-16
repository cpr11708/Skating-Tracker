// --- Supabase Setup ---
const SUPABASE_URL = 'https://cxvoxwdidtzraeeeaiwj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4dm94d2RpZHR6cmFlZWVhaXdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4NzY5ODMsImV4cCI6MjA2MzQ1Mjk4M30.ahn4_75BGDP8eqRtvheLhii_NQgqQMI9AStHbGqPXrU';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- DOM Elements ---
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const authMessage = document.getElementById('auth-message');
const authSection = document.getElementById('auth-section');
const appContainer = document.querySelector('.container');
const sessionsList = document.getElementById('sessions-list');

// --- State ---
let trainingSessions = [];
let selectedFocusAreas = [];
let selectedCoach = null;
let currentSessionType = null;
let currentIceType = null;

// --- Utility Functions ---
function getLocalDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Auto-expand textarea function
function autoExpandTextarea(textarea) {
  // Use requestAnimationFrame to ensure DOM has updated
  requestAnimationFrame(() => {
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    // Set the height to the scrollHeight to fit all content
    const newHeight = textarea.scrollHeight;
    textarea.style.height = newHeight + 'px';
    
    // Ensure minimum height
    if (newHeight < 80) {
      textarea.style.height = '80px';
    }
  });
}

// Initialize auto-expand for textareas
function initializeAutoExpand() {
  const notesTextarea = document.getElementById('notes');
  const editNotesTextarea = document.getElementById('edit-notes');
  
  if (notesTextarea) {
    // Set initial height
    autoExpandTextarea(notesTextarea);
    
    // Add input event listener for auto-expand
    notesTextarea.addEventListener('input', function() {
      autoExpandTextarea(this);
    });
  }
  
  if (editNotesTextarea) {
    // Set initial height
    autoExpandTextarea(editNotesTextarea);
    
    // Add multiple event listeners for auto-expand
    editNotesTextarea.addEventListener('input', function() {
      autoExpandTextarea(this);
    });
    editNotesTextarea.addEventListener('keyup', function() {
      autoExpandTextarea(this);
    });
    editNotesTextarea.addEventListener('keydown', function() {
      autoExpandTextarea(this);
    });
  }
  
  // Also add event listener for edit notes textarea when it's available
  const editNotes = document.getElementById('edit-notes');
  if (editNotes && !editNotes.hasAttribute('data-auto-expand-initialized')) {
    editNotes.setAttribute('data-auto-expand-initialized', 'true');
    editNotes.addEventListener('input', function() {
      autoExpandTextarea(this);
    });
    editNotes.addEventListener('keyup', function() {
      autoExpandTextarea(this);
    });
    editNotes.addEventListener('keydown', function() {
      autoExpandTextarea(this);
    });
  }
}

// --- Auth Logic ---
loginBtn.onclick = async () => {
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  authMessage.textContent = error ? error.message : 'Logged in!';
  checkAuth();
};

signupBtn.onclick = async () => {
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  const { error } = await supabase.auth.signUp({ email, password });
  authMessage.textContent = error ? error.message : 'Check your email for confirmation!';
};

async function checkAuth() {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    authSection.style.display = 'none';
    appContainer.style.display = '';
    await fetchSessionsForUser();
  } else {
    authSection.style.display = '';
    appContainer.style.display = 'none';
    trainingSessions = [];
    updateUI();
  }
}

checkAuth();

// --- Fetch and display sessions for the logged-in user ---
async function fetchSessionsForUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    trainingSessions = [];
    updateUI();
    return;
  }
  const { data, error } = await supabase
    .from('training_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) {
    trainingSessions = [];
  } else {
    trainingSessions = data || [];
  }
  updateUI();
}

// --- Save session to Supabase ---
document.getElementById('training-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  if (!currentSessionType || !currentIceType) {
    alert('Please select both session type and ice type');
    return;
  }
  if (currentSessionType === 'lesson' && !selectedCoach) {
    alert('Please select a coach for the lesson');
    return;
  }
  const focus = [...selectedFocusAreas];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    alert('You must be logged in to log a session.');
    return;
  }
  const session = {
    user_id: user.id,
    date: document.getElementById('date').value,
    type: `${currentIceType}-ice-${currentSessionType}`,
    duration: parseInt(document.getElementById('duration').value),
    focus,
    notes: document.getElementById('notes').value,
    coaches: currentSessionType === 'lesson' ? [selectedCoach] : null
  };
  const { error } = await supabase.from('training_sessions').insert([session]);
  if (error) {
    return;
  }
  await fetchSessionsForUser();
  resetForm();
});

function resetForm() {
  // Clear form fields
  document.getElementById('date').value = getLocalDateString();
  document.getElementById('duration').value = '';
  document.getElementById('notes').value = '';

  // Remove selected class from all buttons
  document.querySelectorAll('.session-btn, .ice-btn, .coach-btn, .focus-btn').forEach(btn => {
    btn.classList.remove('selected');
  });

  // Hide all conditional sections
  const iceTypeSection = document.querySelector('.ice-type-selection');
  const coachSection = document.querySelector('.coach-selection');
  const sessionDetailsSection = document.querySelector('.session-details');
  if (iceTypeSection) iceTypeSection.style.display = 'none';
  if (coachSection) coachSection.style.display = 'none';
  if (sessionDetailsSection) sessionDetailsSection.style.display = 'none';

  // Reset all state variables
  currentSessionType = null;
  currentIceType = null;
  selectedCoach = null;
  selectedFocusAreas = [];

  // Optionally, scroll to top or focus the first field
  // document.getElementById('date').focus();
}

// --- UI Update Functions ---
function updateSessionsList() {
  if (!sessionsList) return;
  sessionsList.innerHTML = '';
  const sortedSessions = [...trainingSessions].sort((a, b) => new Date(b.date) - new Date(a.date));
  sortedSessions.slice(0, 5).forEach(session => {
    console.log('Processing session:', session);
    
    let date = session.date;
    if (date && date.includes('-')) {
      const [year, month, day] = date.split('-');
      date = `${month}/${day}/${year}`;
    }
    
    const durationMinutes = session.duration;
    let durationDisplay = '';
    if (durationMinutes < 60) {
      durationDisplay = `${durationMinutes}m`;
    } else {
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      if (minutes === 0) {
        durationDisplay = `${hours}h`;
      } else {
        durationDisplay = `${hours}h ${minutes}m`;
      }
    }
    
    let sessionTypeParts = session.type.split('-');
    let iceLabel = sessionTypeParts[0] === 'on' ? 'On Ice' : 'Off Ice';
    let sessionType = sessionTypeParts[2] ? sessionTypeParts[2].charAt(0).toUpperCase() + sessionTypeParts[2].slice(1) : 'Practice';
    
    const sessionElement = document.createElement('div');
    sessionElement.className = `session-item ${sessionType.toLowerCase()}`;
    sessionElement.setAttribute('data-id', session.id);
    
    // Truncate notes for compact display
    const notes = session.notes || 'No notes';
    const truncatedNotes = notes.length > 60 ? notes.substring(0, 60) + '...' : notes;
    
    // Get coach name if available
    const coachName = session.coaches && session.coaches.length ? 
      session.coaches[0].charAt(0).toUpperCase() + session.coaches[0].slice(1) : '';
    
    // Get all focus areas and format them properly
    const allFocusAreas = session.focus ? session.focus.map(area => {
      let displayName = area.charAt(0).toUpperCase() + area.slice(1);
      // Remove dashes and format properly
      displayName = displayName.replace(/-/g, ' ');
      // Handle specific cases
      if (displayName === 'Free dance run') displayName = 'Free Dance Run';
      if (displayName === 'Rhythm dance run') displayName = 'Rhythm Dance Run';
      if (displayName === 'Step sequences') displayName = 'Step Sequences';
      if (displayName === 'Pattern dance') displayName = 'Pattern Dance';
      if (displayName === 'Skating skills') displayName = 'Skating Skills';
      return displayName;
    }) : [];
    
    // Get top 3 for display
    const displayFocusAreas = allFocusAreas.slice(0, 3);
    
    sessionElement.innerHTML = `
      <div class="session-item-header">
        <div class="session-date">${date}</div>
      </div>
      <div class="session-type-badge ${sessionType.toLowerCase()}">${sessionType}</div>
      <div class="session-location">${iceLabel}</div>
      ${coachName ? `<div class="session-coach">Coach: ${coachName}</div>` : ''}
      <div class="session-notes">${truncatedNotes}</div>
      <div class="session-focus-tags">
        ${allFocusAreas.length > 0 ? displayFocusAreas.map(area => `<span class="focus-tag">${area}</span>`).join('') : '<span class="no-focus">No focus areas</span>'}
      </div>
      <div class="session-duration">${durationDisplay}</div>
      <button class="edit-session-btn" data-id="${session.id}" title="Edit session">Edit</button>
    `;
    
    sessionsList.appendChild(sessionElement);
  });
  
  // Attach edit button event listeners
  document.querySelectorAll('.edit-session-btn').forEach(btn => {
    btn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      const sessionId = btn.getAttribute('data-id');
      console.log('Edit button clicked, id:', sessionId);
      const session = trainingSessions.find(s => String(s.id) === String(sessionId));
      if (session) {
        console.log('Found session:', session);
        window.openEditModal(session);
      } else {
        console.error('Session not found for id:', sessionId);
      }
    };
  });
  
  // Make session cards clickable to show details modal
  document.querySelectorAll('.session-item').forEach(item => {
    item.onclick = function(e) {
      // Don't trigger if clicking the edit button
      if (e.target.closest('.edit-session-btn')) {
        return;
      }
      
      const sessionId = item.getAttribute('data-id');
      const session = trainingSessions.find(s => String(s.id) === String(sessionId));
      if (session) {
        showSessionDetailsModal(session);
      }
    };
    item.style.cursor = 'pointer';
  });
}

function updateStats() {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // Calculate dashboard stats
  const totalSessions = trainingSessions.length;
  const thisMonthSessions = trainingSessions.filter(session => new Date(session.date) >= monthStart).length;
  const totalHours = Math.round(trainingSessions.reduce((sum, session) => sum + session.duration / 60, 0) * 10) / 10;
  const lessonsCount = trainingSessions.filter(session => session.type && session.type.includes('lesson')).length;
  
  // Update dashboard stat cards with staggered count-up animation
  setTimeout(() => animateCountUp('total-sessions', totalSessions, 0, 1200), 100);
  setTimeout(() => animateCountUp('this-month', thisMonthSessions, 0, 1200), 200);
  setTimeout(() => animateCountUp('total-hours', totalHours, 0, 1200), 300);
  setTimeout(() => animateCountUp('lessons-count', lessonsCount, 0, 1200), 400);
}

// Count-up animation function
function animateCountUp(elementId, targetValue, startValue = 0, duration = 1500) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  const startTime = performance.now();
  const isDecimal = targetValue % 1 !== 0;
  
  // Add animation class for visual effect
  element.classList.add('animating');
  
  function updateCount(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing function for smooth animation
    const easeOutQuart = 1 - Math.pow(1 - progress, 4);
    const currentValue = startValue + (targetValue - startValue) * easeOutQuart;
    
    // Format the display value
    let displayValue;
    if (isDecimal) {
      displayValue = currentValue.toFixed(1);
    } else {
      displayValue = Math.floor(currentValue);
    }
    
    element.textContent = displayValue;
    
    if (progress < 1) {
      requestAnimationFrame(updateCount);
    } else {
      // Ensure final value is exact
      element.textContent = isDecimal ? targetValue.toFixed(1) : targetValue;
      // Remove animation class
      element.classList.remove('animating');
    }
  }
  
  requestAnimationFrame(updateCount);
}



// --- Render Charts on Main Page ---
function renderCharts() {
  // 1. Lessons per coach
  const coachCounts = {};
  // 2. Focus area frequency
  const allFocusAreas = [
    'Edges', 'Turns', 'Twizzles', 'Lifts', 'Spins',
    'Step Sequences', 'Pattern Dance', 'Free Dance Run', 'Rhythm Dance Run', 'Sections',
    'Story', 'Choreography', 'Skating Skills', 'Transitions', 'Interpretation',
    'Performance', 'Timing', 'Musicality', 'Partnering', 'Connection',
    'Warmup', 'Stretching', 'Speed', 'Footwork'
  ];
  const excludedFocus = [];
  const sortedFocusAreas = [...allFocusAreas].sort((a, b) => a.localeCompare(b));
  const focusCounts = {};
  sortedFocusAreas.forEach(area => { focusCounts[area] = 0; });
  const sessionsByDate = {};
  trainingSessions.forEach(session => {
    // Lessons per coach
    if (session.type && session.type.includes('lesson') && Array.isArray(session.coaches)) {
      session.coaches.forEach(coach => {
        const coachName = coach.charAt(0).toUpperCase() + coach.slice(1);
        coachCounts[coachName] = (coachCounts[coachName] || 0) + 1;
      });
    }
    // Focus area frequency
    if (Array.isArray(session.focus)) {
              session.focus.forEach(focus => {
          let focusName = focus.charAt(0).toUpperCase() + focus.slice(1);
          // Remove dashes and format properly
          focusName = focusName.replace(/-/g, ' ');
          // Handle specific cases
          if (focusName === 'Free dance run') focusName = 'Free Dance Run';
          if (focusName === 'Rhythm dance run') focusName = 'Rhythm Dance Run';
          if (focusName === 'Step sequences') focusName = 'Step Sequences';
          if (focusName === 'Pattern dance') focusName = 'Pattern Dance';
          if (focusName === 'Skating skills') focusName = 'Skating Skills';
          if (!excludedFocus.includes(focusName) && sortedFocusAreas.includes(focusName)) {
            focusCounts[focusName] = (focusCounts[focusName] || 0) + 1;
          }
        });
    }
    // Sessions over time
    let date = session.date;
    if (date && date.includes('-')) {
      const [year, month, day] = date.split('-');
      date = `${month}/${day}/${year}`;
    }
    sessionsByDate[date] = (sessionsByDate[date] || 0) + 1;
  });
  // Destroy existing charts if they exist
  if (window._coachChart) window._coachChart.destroy();
  if (window._focusChart) window._focusChart.destroy();
  if (window._sessionsOverTimeChart) window._sessionsOverTimeChart.destroy();
  // Lessons per coach
  const coachChartElem = document.getElementById('coachChart');
  if (coachChartElem) {
    const coachChartCtx = coachChartElem.getContext('2d');
    window._coachChart = new Chart(coachChartCtx, {
      type: 'bar',
      data: {
        labels: Object.keys(coachCounts),
        datasets: [{
          label: 'Lessons',
          data: Object.values(coachCounts),
          backgroundColor: '#3498db',
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, precision: 0 } }
      }
    });
  }
  // Focus area frequency
  const focusChartElem = document.getElementById('focusChart');
  if (focusChartElem) {
    const focusChartCtx = focusChartElem.getContext('2d');
    window._focusChart = new Chart(focusChartCtx, {
      type: 'bar',
      data: {
        labels: sortedFocusAreas,
        datasets: [{
          label: 'Selections',
          data: sortedFocusAreas.map(area => focusCounts[area]),
          backgroundColor: '#2ecc71',
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, precision: 0 } }
      }
    });
  }
  // Sessions over time
  const sortedDates = Object.keys(sessionsByDate).sort((a, b) => new Date(a) - new Date(b));
  const sessionsOverTimeElem = document.getElementById('sessionsOverTimeChart');
  if (sessionsOverTimeElem) {
    const sessionsOverTimeCtx = sessionsOverTimeElem.getContext('2d');
    window._sessionsOverTimeChart = new Chart(sessionsOverTimeCtx, {
      type: 'line',
      data: {
        labels: sortedDates,
        datasets: [{
          label: 'Sessions',
          data: sortedDates.map(date => sessionsByDate[date]),
          fill: false,
          borderColor: '#e67e22',
          backgroundColor: '#e67e22',
          tension: 0.2
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, precision: 0 } }
      }
    });
  }
}

// --- Render Mini Charts for Dashboard ---
function renderMiniCharts() {
  // Weekly activity chart
  const weeklyChartElem = document.getElementById('weeklyChart');
  if (weeklyChartElem) {
    // Destroy existing chart if it exists
    if (window._weeklyChart) window._weeklyChart.destroy();
    
    const weeklyChartCtx = weeklyChartElem.getContext('2d');
    
    // Calculate weekly data (last 7 days)
    const weekData = [];
    const weekLabels = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const sessionsOnDay = trainingSessions.filter(session => session.date === dateStr);
      const totalMinutes = sessionsOnDay.reduce((sum, session) => sum + session.duration, 0);
      
      weekData.push(totalMinutes);
      weekLabels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
    }
    
    window._weeklyChart = new Chart(weeklyChartCtx, {
      type: 'line',
      data: {
        labels: weekLabels,
        datasets: [{
          label: 'Minutes',
          data: weekData,
          fill: false,
          borderColor: '#3498db',
          backgroundColor: '#3498db',
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#3498db'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                return context.parsed.y + ' minutes';
              }
            }
          }
        },
        scales: { 
          y: { 
            beginAtZero: true, 
            display: false 
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  }
  
  // Top focus areas mini chart
  const focusMiniChartElem = document.getElementById('focusMiniChart');
  if (focusMiniChartElem) {
    // Destroy existing chart if it exists
    if (window._focusMiniChart) window._focusMiniChart.destroy();
    
    const focusMiniChartCtx = focusMiniChartElem.getContext('2d');
    
    // Calculate focus area frequency
    const focusCounts = {};
    trainingSessions.forEach(session => {
      if (Array.isArray(session.focus)) {
        session.focus.forEach(focus => {
          let focusName = focus.charAt(0).toUpperCase() + focus.slice(1);
          // Remove dashes and format properly
          focusName = focusName.replace(/-/g, ' ');
          // Handle specific cases
          if (focusName === 'Free dance run') focusName = 'Free Dance Run';
          if (focusName === 'Rhythm dance run') focusName = 'Rhythm Dance Run';
          if (focusName === 'Step sequences') focusName = 'Step Sequences';
          if (focusName === 'Pattern dance') focusName = 'Pattern Dance';
          if (focusName === 'Skating skills') focusName = 'Skating Skills';
          focusCounts[focusName] = (focusCounts[focusName] || 0) + 1;
        });
      }
    });
    
    // Get top 5 focus areas
    const sortedFocus = Object.entries(focusCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    const focusLabels = sortedFocus.map(([name]) => name);
    const focusData = sortedFocus.map(([,count]) => count);
    
    window._focusMiniChart = new Chart(focusMiniChartCtx, {
      type: 'doughnut',
      data: {
        labels: focusLabels,
        datasets: [{
          data: focusData,
          backgroundColor: [
            '#3498db',
            '#2ecc71',
            '#e67e22',
            '#9b59b6',
            '#e74c3c'
          ],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
          legend: { 
            display: false 
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((context.parsed / total) * 100);
                return context.label + ': ' + context.parsed + ' (' + percentage + '%)';
              }
            }
          }
        }
      }
    });
  }
}

// --- Popup Functions for Dashboard ---
function showNotesPopup(notes) {
    // Create popup if it doesn't exist
    let popup = document.getElementById('notes-popup');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'notes-popup';
        popup.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        const popupContent = document.createElement('div');
        popupContent.style.cssText = `
            background: white;
            padding: 2rem;
            border-radius: 12px;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            position: relative;
            transform: translateY(20px);
            transition: transform 0.3s ease;
        `;
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 15px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        const title = document.createElement('h3');
        title.textContent = 'Session Notes';
        title.style.cssText = `
            margin: 0 0 1rem 0;
            color: #333;
            font-size: 1.2rem;
        `;
        
        const notesText = document.createElement('div');
        notesText.id = 'popup-notes-text';
        notesText.style.cssText = `
            white-space: pre-wrap;
            line-height: 1.5;
            color: #555;
            font-size: 0.95rem;
        `;
        
        popupContent.appendChild(closeBtn);
        popupContent.appendChild(title);
        popupContent.appendChild(notesText);
        popup.appendChild(popupContent);
        document.body.appendChild(popup);
        
        // Close popup when clicking outside or on close button
        popup.onclick = function(e) {
            if (e.target === popup || e.target === closeBtn) {
                closeNotesPopup();
            }
        };
        
        // Close on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeNotesPopup();
            }
        });
    }
    
    // Update notes content
    document.getElementById('popup-notes-text').textContent = notes;
    
    // Show popup with animation
    popup.style.display = 'flex';
    setTimeout(() => {
        popup.style.opacity = '1';
        popup.querySelector('div').style.transform = 'translateY(0)';
    }, 10);
}

function closeNotesPopup() {
    const popup = document.getElementById('notes-popup');
    if (popup) {
        popup.style.opacity = '0';
        popup.querySelector('div').style.transform = 'translateY(20px)';
        setTimeout(() => {
            popup.style.display = 'none';
        }, 300);
    }
}

function showFocusPopup(focus) {
    // Create popup if it doesn't exist
    let popup = document.getElementById('focus-popup');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'focus-popup';
        popup.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        const popupContent = document.createElement('div');
        popupContent.style.cssText = `
            background: white;
            padding: 2rem;
            border-radius: 12px;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            position: relative;
            transform: translateY(20px);
            transition: transform 0.3s ease;
        `;
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 15px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        const title = document.createElement('h3');
        title.textContent = 'Focus Areas';
        title.style.cssText = `
            margin: 0 0 1rem 0;
            color: #333;
            font-size: 1.2rem;
        `;
        
        const focusText = document.createElement('div');
        focusText.id = 'popup-focus-text';
        focusText.style.cssText = `
            white-space: pre-wrap;
            line-height: 1.5;
            color: #555;
            font-size: 0.95rem;
        `;
        
        popupContent.appendChild(closeBtn);
        popupContent.appendChild(title);
        popupContent.appendChild(focusText);
        popup.appendChild(popupContent);
        document.body.appendChild(popup);
        
        // Close popup when clicking outside or on close button
        popup.onclick = function(e) {
            if (e.target === popup || e.target === closeBtn) {
                closeFocusPopup();
            }
        };
        
        // Close on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeFocusPopup();
            }
        });
    }
    
    // Update focus content
    document.getElementById('popup-focus-text').textContent = focus;
    
    // Show popup with animation
    popup.style.display = 'flex';
    setTimeout(() => {
        popup.style.opacity = '1';
        popup.querySelector('div').style.transform = 'translateY(0)';
    }, 10);
}

function closeFocusPopup() {
    const popup = document.getElementById('focus-popup');
    if (popup) {
        popup.style.opacity = '0';
        popup.querySelector('div').style.transform = 'translateY(20px)';
        setTimeout(() => {
            popup.style.display = 'none';
        }, 300);
    }
}

// --- Comprehensive Session Details Modal ---
function showSessionDetailsModal(session) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('session-details-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'session-details-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1500;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            padding: 2rem;
            border-radius: 12px;
            width: 600px;
            max-height: 80vh;
            height: auto;
            overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            position: relative;
            transform: translateY(20px);
            transition: transform 0.3s ease;
        `;
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 15px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        const title = document.createElement('h2');
        title.id = 'session-details-title';
        title.style.cssText = `
            margin: 0 0 1.5rem 0;
            color: #333;
            font-size: 1.5rem;
            border-bottom: 2px solid #3498db;
            padding-bottom: 0.5rem;
        `;
        
        const content = document.createElement('div');
        content.id = 'session-details-content';
        content.style.cssText = `
            line-height: 1.6;
            color: #555;
        `;
        
        modalContent.appendChild(closeBtn);
        modalContent.appendChild(title);
        modalContent.appendChild(content);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Close modal when clicking outside or on close button
        modal.onclick = function(e) {
            if (e.target === modal || e.target === closeBtn) {
                closeSessionDetailsModal();
            }
        };
        
        // Close on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeSessionDetailsModal();
            }
        });
    }
    
    // Format session data
    let date = session.date;
    if (date && date.includes('-')) {
        const [year, month, day] = date.split('-');
        date = `${month}/${day}/${year}`;
    }
    
    const durationMinutes = session.duration;
    let durationDisplay = '';
    if (durationMinutes < 60) {
        durationDisplay = `${durationMinutes} minutes`;
    } else {
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        if (minutes === 0) {
            durationDisplay = `${hours} hour${hours === 1 ? '' : 's'}`;
        } else {
            durationDisplay = `${hours} hour${hours === 1 ? '' : 's'} ${minutes} minute${minutes === 1 ? '' : 's'}`;
        }
    }
    
    let sessionTypeParts = session.type.split('-');
    let iceLabel = sessionTypeParts[0] === 'on' ? 'On Ice' : 'Off Ice';
    let sessionType = sessionTypeParts[2] ? sessionTypeParts[2].charAt(0).toUpperCase() + sessionTypeParts[2].slice(1) : '';
    
    const coachName = session.coaches && session.coaches.length ? 
        session.coaches[0].charAt(0).toUpperCase() + session.coaches[0].slice(1) : '';
    
    const allFocusAreas = session.focus ? session.focus.map(area => {
        let displayName = area.charAt(0).toUpperCase() + area.slice(1);
        displayName = displayName.replace(/-/g, ' ');
        if (displayName === 'Free dance run') displayName = 'Free Dance Run';
        if (displayName === 'Rhythm dance run') displayName = 'Rhythm Dance Run';
        if (displayName === 'Step sequences') displayName = 'Step Sequences';
        if (displayName === 'Pattern dance') displayName = 'Pattern Dance';
        if (displayName === 'Skating skills') displayName = 'Skating Skills';
        return displayName;
    }) : [];
    
    // Update modal content
    document.getElementById('session-details-title').textContent = `${sessionType} - ${date}`;
    
    const content = document.getElementById('session-details-content');
    content.innerHTML = `
        <div style="margin-bottom: 1.5rem;">
            <h3 style="color: #3498db; margin-bottom: 0.5rem;">Session Details</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                <div><strong>Duration:</strong> ${durationDisplay}</div>
                <div><strong>Location:</strong> ${iceLabel}</div>
                ${coachName ? `<div><strong>Coach:</strong> ${coachName}</div>` : ''}
            </div>
        </div>
        
        ${session.notes ? `
        <div style="margin-bottom: 1.5rem;">
            <h3 style="color: #3498db; margin-bottom: 0.5rem;">Notes</h3>
            <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; border-left: 4px solid #3498db;">
                ${session.notes.replace(/\n/g, '<br>')}
            </div>
        </div>
        ` : ''}
        
        ${allFocusAreas.length > 0 ? `
        <div style="margin-bottom: 1rem;">
            <h3 style="color: #3498db; margin-bottom: 0.5rem;">Focus Areas</h3>
            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                ${allFocusAreas.map(area => `<span style="background: #e3f2fd; color: #1976d2; padding: 0.4rem 0.8rem; border-radius: 12px; font-size: 0.9rem;">${area}</span>`).join('')}
            </div>
        </div>
        ` : ''}
    `;
    
    // Show modal with animation
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.style.opacity = '1';
        modal.querySelector('div').style.transform = 'translateY(0)';
    }, 10);
}

function closeSessionDetailsModal() {
    const modal = document.getElementById('session-details-modal');
    if (modal) {
        modal.style.opacity = '0';
        modal.querySelector('div').style.transform = 'translateY(20px)';
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

function updateUI() {
  updateSessionsList();
  updateStats();
  renderCharts();
  renderMiniCharts();
  initializeEventListeners();
  initializeAutoExpand(); // Call initializeAutoExpand here
}

// --- Event Listeners for Form Buttons ---
function initializeEventListeners() {
  // Session type
  document.querySelectorAll('.session-btn').forEach(btn => {
    btn.onclick = function(e) {
      e.preventDefault();
      document.querySelectorAll('.session-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      currentSessionType = btn.dataset.type;
      document.querySelector('.ice-type-selection').style.display = 'block';
      if (currentSessionType === 'practice') {
        selectedCoach = null;
        document.querySelectorAll('.coach-btn').forEach(b => b.classList.remove('selected'));
        document.querySelector('.coach-selection').style.display = 'none';
        if (currentIceType) {
          document.querySelector('.session-details').style.display = 'block';
        } else {
          document.querySelector('.session-details').style.display = 'none';
        }
      } else if (currentSessionType === 'lesson') {
        // If switching to lesson, show coach section if ice type is selected, hide session details
        if (currentIceType) {
          document.querySelector('.coach-selection').style.display = 'block';
          document.querySelector('.session-details').style.display = 'none';
        } else {
          document.querySelector('.coach-selection').style.display = 'none';
          document.querySelector('.session-details').style.display = 'none';
        }
      }
    };
  });
  // Ice type
  document.querySelectorAll('.ice-btn').forEach(btn => {
    btn.onclick = function(e) {
      e.preventDefault();
      document.querySelectorAll('.ice-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      currentIceType = btn.dataset.ice;
      if (currentSessionType === 'lesson') {
        document.querySelector('.coach-selection').style.display = 'block';
        document.querySelector('.session-details').style.display = 'none';
      } else {
        document.querySelector('.coach-selection').style.display = 'none';
        document.querySelector('.session-details').style.display = 'block';
      }
    };
  });
  // Coach
  document.querySelectorAll('.coach-btn').forEach(btn => {
    btn.onclick = function(e) {
      e.preventDefault();
      document.querySelectorAll('.coach-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedCoach = btn.dataset.coach;
      document.querySelector('.session-details').style.display = 'block';
    };
  });
  // Focus areas
  document.querySelectorAll('.focus-btn').forEach(btn => {
    btn.onclick = null; // Remove any existing handler
    btn.onclick = function(e) {
      e.preventDefault();
      const focus = btn.dataset.focus;
      if (selectedFocusAreas.includes(focus)) {
        selectedFocusAreas = selectedFocusAreas.filter(f => f !== focus);
        btn.classList.remove('selected');
      } else {
        selectedFocusAreas.push(focus);
        btn.classList.add('selected');
      }
    };
  });
}

// --- Delete session logic ---
sessionsList.addEventListener('click', async function(e) {
  const btn = e.target.closest('.delete-session-btn');
  if (btn) {
    const sessionId = btn.getAttribute('data-id');
    if (!sessionId) return;
    if (!confirm('Are you sure you want to delete this session?')) return;
    const { error } = await supabase.from('training_sessions').delete().eq('id', sessionId);
    if (error) {
      return;
    }
    await fetchSessionsForUser();
  }
});

// --- Account menu logic ---
document.addEventListener('DOMContentLoaded', function() {
  const accountBtn = document.getElementById('account-btn');
  const accountDropdown = document.getElementById('account-dropdown');
  const accountEmail = document.getElementById('account-email');
  const accountModal = document.getElementById('account-modal');
  const closeAccountModal = document.getElementById('close-account-modal');
  const logoutBtn = document.getElementById('logout-btn');
  const changeEmailBtn = document.getElementById('change-email-btn');
  const changePasswordBtn = document.getElementById('change-password-btn');
  const accountEmailInput = document.getElementById('account-email-input');
  const accountPasswordInput = document.getElementById('account-password-input');
  const accountFeedback = document.getElementById('account-feedback');

  // Function to show feedback overlay
  function showFeedback(message, type) {
    // Clear existing content and any existing timeouts
    accountFeedback.innerHTML = '';
    if (window.feedbackTimeout) {
      clearTimeout(window.feedbackTimeout);
    }
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `feedback-message ${type}`;
    messageElement.textContent = message;
    messageElement.style.borderRadius = '16px';
    
    // Add to overlay
    accountFeedback.appendChild(messageElement);
    
    // Show overlay
    accountFeedback.classList.add('show');
    
    // Auto-hide after 5 seconds for all message types
    window.feedbackTimeout = setTimeout(() => {
      accountFeedback.classList.remove('show');
    }, 5000);
  }

  // Update account email display
  async function updateAccountEmail() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('User data:', user);
      if (user && user.email) {
        accountEmail.textContent = user.email;
        console.log('Set account email to:', user.email);
      } else {
        accountEmail.textContent = 'Account';
        console.log('No user email, set to Account');
      }
    } catch (error) {
      console.error('Error getting user:', error);
      accountEmail.textContent = 'Account';
    }
  }

  // Initialize account email display
  console.log('Account button element:', accountBtn);
  console.log('Account dropdown element:', accountDropdown);
  console.log('Account email element:', accountEmail);
  updateAccountEmail();

  if (accountBtn) {
    accountBtn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      // Open the account modal instead of dropdown
      const accountModal = document.getElementById('account-modal');
      if (accountModal) {
        accountModal.style.display = 'flex';
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
      }
    };
  }

  // Account button now opens modal instead of dropdown
  
  // Toggle functionality removed - form is always visible
  
  // Close account modal
  if (closeAccountModal && accountModal) {
    closeAccountModal.onclick = function() {
      accountModal.style.display = 'none';
      // Restore body scroll when modal is closed
      document.body.style.overflow = '';
      // Clear any feedback messages and timeouts
      accountFeedback.classList.remove('show');
      if (window.feedbackTimeout) {
        clearTimeout(window.feedbackTimeout);
      }
    };
  }
  // Log out from dropdown - handled by event delegation above

  // Close modal when clicking outside
  if (accountModal) {
    accountModal.addEventListener('click', function(e) {
      if (e.target === accountModal) {
        accountModal.style.display = 'none';
        // Restore body scroll when modal is closed
        document.body.style.overflow = '';
        // Clear any feedback messages and timeouts
        accountFeedback.classList.remove('show');
        if (window.feedbackTimeout) {
          clearTimeout(window.feedbackTimeout);
        }
      }
    });
  }

  if (changeEmailBtn && accountEmailInput && accountFeedback) {
    changeEmailBtn.onclick = async function() {
      const newEmail = accountEmailInput.value.trim();
      if (!newEmail) {
        showFeedback('Please enter a new email.', 'error');
        return;
      }
      changeEmailBtn.disabled = true;
      showFeedback('Updating email...', 'info');
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) {
        showFeedback(error.message, 'error');
      } else {
        showFeedback('Email update requested. Check your new email for confirmation.', 'success');
        accountEmailInput.value = '';
      }
      changeEmailBtn.disabled = false;
      // Ensure logout button is enabled
      if (logoutBtn) {
        logoutBtn.disabled = false;
      }
    };
  }

  if (changePasswordBtn && accountPasswordInput && accountFeedback) {
    changePasswordBtn.onclick = async function() {
      const newPassword = accountPasswordInput.value.trim();
      if (!newPassword || newPassword.length < 6) {
        showFeedback('Password must be at least 6 characters.', 'error');
        return;
      }
      changePasswordBtn.disabled = true;
      showFeedback('Updating password...', 'info');
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        showFeedback(error.message, 'error');
      } else {
        showFeedback('Password updated successfully!', 'success');
        accountPasswordInput.value = '';
      }
      changePasswordBtn.disabled = false;
    };
  }
});

function setAccountEmailValue(email) {
  // Do not update the dropdownAccountBtn text. It should always say 'Account'.
}

// --- Secret Cat Modal logic ---
document.addEventListener('DOMContentLoaded', function() {
  const pawBtn = document.getElementById('secret-paw');
  const catModal = document.getElementById('cat-modal');
  const closeCatModal = document.getElementById('close-cat-modal');
  if (pawBtn && catModal && closeCatModal) {
    pawBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      catModal.style.display = 'flex';
    });
    closeCatModal.addEventListener('click', (e) => {
      catModal.style.display = 'none';
    });
    catModal.addEventListener('click', (e) => {
      if (e.target === catModal) {
        catModal.style.display = 'none';
      }
    });
  }
});

// --- Edit session modal logic ---
// Removed the click handler that made entire session cards clickable
// Now only the edit button opens the edit modal

// Modal focus area selection
(function() {
  const editFocusGroup = document.getElementById('edit-focus-group');
  if (editFocusGroup) {
    editFocusGroup.querySelectorAll('.focus-btn').forEach(btn => {
      btn.onclick = function(e) {
        e.preventDefault();
        btn.classList.toggle('selected');
      };
    });
  }
})();
// Modal coach selection
(function() {
  const editCoachGroup = document.getElementById('edit-coach-group');
  if (editCoachGroup) {
    editCoachGroup.querySelectorAll('.coach-btn').forEach(btn => {
      btn.onclick = function(e) {
        e.preventDefault();
        editCoachGroup.querySelectorAll('.coach-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        window.editingSelectedCoach = btn.dataset.coach;
      };
    });
  }
})();
// Edit modal functions
(function() {
  const editSessionModal = document.getElementById('edit-session-modal');
  const closeEditModalBtn = document.getElementById('close-edit-modal');
  const cancelEditBtn = document.getElementById('cancel-edit-session');
  
  function openEditModal(session) {
    console.log('Opening edit modal for session:', session.id);
    const editDate = document.getElementById('edit-date');
    const editDuration = document.getElementById('edit-duration');
    const editNotes = document.getElementById('edit-notes');
    const editFocusGroup = document.getElementById('edit-focus-group');
    const editCoachGroup = document.getElementById('edit-coach-group');
    
    window.editingSessionId = session.id;
    const typeParts = session.type.split('-');
    window.editingSessionType = typeParts[2];
    window.editingSessionIce = typeParts[0];
    editDate.value = session.date;
    editDuration.value = session.duration;
    editNotes.value = session.notes || '';
    
    // Initialize auto-expand for edit notes textarea
    if (editNotes) {
      autoExpandTextarea(editNotes);
    }
    
    // Focus areas
    window.editingSelectedFocus = Array.isArray(session.focus) ? [...session.focus] : [];
    editFocusGroup.querySelectorAll('.focus-btn').forEach(btn => {
      if (window.editingSelectedFocus.includes(btn.dataset.focus)) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
    
    // Coach
    if (window.editingSessionType === 'lesson') {
      editCoachGroup.style.display = '';
      window.editingSelectedCoach = session.coaches && session.coaches.length ? session.coaches[0] : null;
      editCoachGroup.querySelectorAll('.coach-btn').forEach(btn => {
        if (btn.dataset.coach === window.editingSelectedCoach) {
          btn.classList.add('selected');
        } else {
          btn.classList.remove('selected');
        }
      });
    } else {
      editCoachGroup.style.display = 'none';
      window.editingSelectedCoach = null;
      editCoachGroup.querySelectorAll('.coach-btn').forEach(btn => btn.classList.remove('selected'));
    }
    editSessionModal.style.display = 'flex';
  }
  
  function closeEditModal() {
    editSessionModal.style.display = 'none';
    window.editingSessionId = null;
    window.editingSessionType = null;
    window.editingSessionIce = null;
    window.editingSelectedCoach = null;
    window.editingSelectedFocus = [];
  }
  
  if (closeEditModalBtn) closeEditModalBtn.onclick = closeEditModal;
  if (cancelEditBtn) cancelEditBtn.onclick = closeEditModal;
  window.closeEditModal = closeEditModal;
  window.openEditModal = openEditModal;
})();
// Save edits
(function() {
  const editSessionForm = document.getElementById('edit-session-form');
  if (editSessionForm) {
    editSessionForm.onsubmit = async function(e) {
      e.preventDefault();
      if (!window.editingSessionId) return;
      const editFocusGroup = document.getElementById('edit-focus-group');
      const editCoachGroup = document.getElementById('edit-coach-group');
      const editDate = document.getElementById('edit-date');
      const editDuration = document.getElementById('edit-duration');
      const editNotes = document.getElementById('edit-notes');
      // Always read selected focus areas from DOM
      const focus = Array.from(editFocusGroup.querySelectorAll('.focus-btn.selected')).map(btn => btn.dataset.focus);
      // Always read selected coach from DOM
      let coach = null;
      if (window.editingSessionType === 'lesson') {
        const selectedCoachBtn = editCoachGroup.querySelector('.coach-btn.selected');
        coach = selectedCoachBtn ? selectedCoachBtn.dataset.coach : null;
        if (!coach) {
          alert('Please select a coach for the lesson');
          return;
        }
      }
      const updates = {
        date: editDate.value,
        duration: parseInt(editDuration.value),
        notes: editNotes.value,
        focus: focus
      };
      if (window.editingSessionType === 'lesson') {
        updates.coaches = [coach];
      } else {
        updates.coaches = null;
      }
      const { error } = await supabase.from('training_sessions').update(updates).eq('id', window.editingSessionId);
      if (error) {
        return;
      }
      window.closeEditModal();
      await fetchSessionsForUser();
    };
  }
})();
// Delete session from modal
(function() {
  const deleteEditBtn = document.getElementById('delete-edit-session');
  if (deleteEditBtn) {
    deleteEditBtn.onclick = async function() {
      if (!window.editingSessionId) return;
      if (!confirm('Are you sure you want to delete this session?')) return;
      const { error } = await supabase.from('training_sessions').delete().eq('id', window.editingSessionId);
      if (error) {
        return;
      }
      window.closeEditModal();
      await fetchSessionsForUser();
    };
  }
})();

// --- Initialize ---
document.getElementById('date').value = getLocalDateString();
window.onload = function() {
  initializeEventListeners();
  updateUI();
};

document.addEventListener('DOMContentLoaded', function() {
    // Account menu logic is handled in the main DOMContentLoaded event above
});
// Add form submit event listener for Enter key support
const authForm = document.getElementById('auth-form');
if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        authMessage.textContent = error ? error.message : 'Logged in!';
        checkAuth();
    });
}
