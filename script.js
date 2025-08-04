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
  sortedSessions.slice(0, 3).forEach(session => {
    const sessionElement = document.createElement('div');
    sessionElement.className = 'session-item';
    sessionElement.setAttribute('data-id', session.id);
    let date = session.date;
    if (date && date.includes('-')) {
      const [year, month, day] = date.split('-');
      date = `${month}/${day}/${year}`;
    }
    const durationMinutes = session.duration;
    let durationDisplay = '';
    if (durationMinutes < 60) {
      durationDisplay = `${durationMinutes} minute${durationMinutes === 1 ? '' : 's'}`;
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
    let isPractice = sessionTypeParts[2] === 'practice';
    const practiceTag = isPractice ? `<div class="coach-tags"><span class="coach-tag">Practice</span></div>` : '';
    sessionElement.innerHTML = `
      <div class="session-item-main">
        <div class="session-title-row">
          <h3>${iceLabel}</h3>
          <button class="delete-session-btn" data-id="${session.id}" title="Delete session" tabindex="-1">
            <svg width="14" height="18" viewBox="0 0 14 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1.3" y="4.5" width="11.4" height="11.5" rx="2" fill="#e74c3c"/>
              <rect x="3.5" y="7.5" width="1.4" height="6.5" rx="0.7" fill="#fff"/>
              <rect x="9.1" y="7.5" width="1.4" height="6.5" rx="0.7" fill="#fff"/>
              <rect x="0.3" y="2" width="13.4" height="2.5" rx="1.2" fill="#e74c3c"/>
              <rect x="5.2" y="0.7" width="3.6" height="1.1" rx="0.5" fill="#e74c3c"/>
            </svg>
          </button>
        </div>
        <div class="session-meta">
          <span>Date: ${date}</span>
          <span>Duration: ${durationDisplay}</span>
        </div>
        <p>${session.notes || 'No notes'}</p>
      </div>
      <div class="session-item-meta">
        ${session.coaches && session.coaches.length ? `<div class="coach-tags">${session.coaches.map(coach => `<span class="coach-tag">Coach: ${coach.charAt(0).toUpperCase() + coach.slice(1)}</span>`).join('')}</div>` : ''}
        ${practiceTag}
        <div class="focus-tags">${session.focus.map(area => `<span class="focus-tag">${area.charAt(0).toUpperCase() + area.slice(1)}</span>`).join('')}</div>
      </div>
    `;
    sessionsList.appendChild(sessionElement);
  });
}

function updateStats() {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const totalHours = trainingSessions.reduce((sum, session) => sum + session.duration / 60, 0);
  const weeklyHours = trainingSessions.filter(session => new Date(session.date) >= weekStart).reduce((sum, session) => sum + session.duration / 60, 0);
  const monthlyHours = trainingSessions.filter(session => new Date(session.date) >= monthStart).reduce((sum, session) => sum + session.duration / 60, 0);

}



// --- Render Charts on Main Page ---
function renderCharts() {
  // 1. Lessons per coach
  const coachCounts = {};
  // 2. Focus area frequency
  const allFocusAreas = [
    'Edges', 'Turns', 'Twizzles', 'Lifts', 'Spins',
    'Step Sequences', 'Pattern Dance', 'RD', 'FD', 'Sections',
    'Story', 'Choreography', 'Skating Skills', 'Transitions', 'Interpretation',
    'Performance', 'Timing', 'Musicality', 'Partnering', 'Connection',
    'Warmup', 'Stretching', 'Speed', 'Footwork'
  ];
  const excludedFocus = ['Free-dance-run', 'Rhythm-dance-run'];
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
        if (focusName === 'Step-sequences') focusName = 'Step Sequences';
        if (focusName === 'Pattern-dance') focusName = 'Pattern Dance';
        if (focusName === 'Skating-skills') focusName = 'Skating Skills';
        if (focusName === 'Free-dance-run') focusName = 'FD';
        if (focusName === 'Rhythm-dance-run') focusName = 'RD';
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

function updateUI() {
  updateSessionsList();
  updateStats();
  renderCharts();
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

// --- Hamburger menu logic ---
document.addEventListener('DOMContentLoaded', function() {
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const dropdownMenu = document.getElementById('dropdown-menu');
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

  if (hamburgerBtn && dropdownMenu) {
    hamburgerBtn.onclick = function(e) {
      e.stopPropagation();
      dropdownMenu.classList.toggle('show');
    };
    document.addEventListener('click', function(e) {
      if (!dropdownMenu.contains(e.target) && e.target !== hamburgerBtn) {
        dropdownMenu.classList.remove('show');
      }
    });
  }

  // Use event delegation for Account button
  if (dropdownMenu && accountModal) {
    dropdownMenu.addEventListener('click', function(e) {
      const accountBtn = e.target.closest('#dropdown-account-btn');
      if (accountBtn) {
        e.preventDefault();
        accountModal.style.display = 'flex';
        dropdownMenu.classList.remove('show');
        
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
      }
    });
  }
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
  // Log out from modal
  if (logoutBtn) {
    logoutBtn.onclick = async function() {
      await supabase.auth.signOut();
      window.location.reload();
    };
    // Ensure the button is always enabled and clickable
    logoutBtn.disabled = false;
    logoutBtn.style.pointerEvents = 'auto';
  }

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
sessionsList.addEventListener('click', function(e) {
  const btn = e.target.closest('.delete-session-btn');
  if (btn) return; // handled by delete logic
  const card = e.target.closest('.session-item');
  if (!card) return;
  const sessionId = card.getAttribute('data-id');
  if (!sessionId) return;
  const session = trainingSessions.find(s => String(s.id) === String(sessionId));
  if (!session) return;
  // Query modal elements here to ensure they exist
  const editSessionModal = document.getElementById('edit-session-modal');
  const editDate = document.getElementById('edit-date');
  const editDuration = document.getElementById('edit-duration');
  const editNotes = document.getElementById('edit-notes');
  const editFocusGroup = document.getElementById('edit-focus-group');
  const editCoachGroup = document.getElementById('edit-coach-group');
  // Fill modal fields
  editingSessionId = session.id;
  const typeParts = session.type.split('-');
  editingSessionType = typeParts[2];
  editingSessionIce = typeParts[0];
  editDate.value = session.date;
  editDuration.value = session.duration;
  editNotes.value = session.notes || '';
  // Initialize auto-expand for edit notes textarea
  if (editNotes) {
    autoExpandTextarea(editNotes);
  }
  // Focus areas
  editingSelectedFocus = Array.isArray(session.focus) ? [...session.focus] : [];
  editFocusGroup.querySelectorAll('.focus-btn').forEach(btn => {
    if (editingSelectedFocus.includes(btn.dataset.focus)) {
      btn.classList.add('selected');
    } else {
      btn.classList.remove('selected');
    }
  });
  // Coach
  if (editingSessionType === 'lesson') {
    editCoachGroup.style.display = '';
    editingSelectedCoach = session.coaches && session.coaches.length ? session.coaches[0] : null;
    editCoachGroup.querySelectorAll('.coach-btn').forEach(btn => {
      if (btn.dataset.coach === editingSelectedCoach) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
  } else {
    editCoachGroup.style.display = 'none';
    editingSelectedCoach = null;
    editCoachGroup.querySelectorAll('.coach-btn').forEach(btn => btn.classList.remove('selected'));
  }
  // Show modal
  editSessionModal.style.display = 'flex';
});

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
// Close modal
(function() {
  const editSessionModal = document.getElementById('edit-session-modal');
  const closeEditModalBtn = document.getElementById('close-edit-modal');
  const cancelEditBtn = document.getElementById('cancel-edit-session');
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
    // Hamburger menu logic
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const dropdownMenu = document.getElementById('dropdown-menu');
    const dropdownAccountEmail = document.getElementById('dropdown-account-email');
    const dropdownLogoutBtn = document.getElementById('dropdown-logout-btn');
    if (hamburgerBtn && dropdownMenu) {
        hamburgerBtn.onclick = function(e) {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        };
        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!dropdownMenu.contains(e.target) && e.target !== hamburgerBtn) {
                dropdownMenu.classList.remove('show');
            }
        });
    }
    // Show account email in dropdown
    if (dropdownAccountEmail) {
        const userEmail = window.accountEmailValue || '';
        dropdownAccountEmail.textContent = userEmail;
    }
    // Handle logout from dropdown
    if (dropdownLogoutBtn) {
        dropdownLogoutBtn.onclick = async function() {
            await supabase.auth.signOut();
            window.location.reload();
        };
    }
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
