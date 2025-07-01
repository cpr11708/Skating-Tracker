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
  const bestWeek = Math.max(...getWeeklyTotals(trainingSessions), 0);
  const bestMonth = Math.max(...getMonthlyTotals(trainingSessions), 0);
  const bestWeekElem = document.getElementById('home-best-week');
  const bestMonthElem = document.getElementById('home-best-month');
  if (bestWeekElem) bestWeekElem.textContent = bestWeek.toFixed(1);
  if (bestMonthElem) bestMonthElem.textContent = bestMonth.toFixed(1);
}

function getWeeklyTotals(sessions) {
  const weekMap = {};
  sessions.forEach(session => {
    const d = new Date(session.date);
    const year = d.getFullYear();
    const week = getWeekNumber(d);
    const key = `${year}-W${week}`;
    weekMap[key] = (weekMap[key] || 0) + (session.duration / 60);
  });
  return Object.values(weekMap);
}
function getMonthlyTotals(sessions) {
  const monthMap = {};
  sessions.forEach(session => {
    const d = new Date(session.date);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    monthMap[key] = (monthMap[key] || 0) + (session.duration / 60);
  });
  return Object.values(monthMap);
}
function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
  return weekNo;
}

function updateUI() {
  updateSessionsList();
  updateStats();
  initializeEventListeners();
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
      }
    });
  }
  // Close account modal
  if (closeAccountModal && accountModal) {
    closeAccountModal.onclick = function() {
      accountModal.style.display = 'none';
    };
  }
  // Log out from modal
  if (logoutBtn) {
    logoutBtn.onclick = async function() {
      await supabase.auth.signOut();
      window.location.reload();
    };
  }

  if (changeEmailBtn && accountEmailInput && accountFeedback) {
    changeEmailBtn.onclick = async function() {
      const newEmail = accountEmailInput.value.trim();
      if (!newEmail) {
        accountFeedback.textContent = 'Please enter a new email.';
        return;
      }
      changeEmailBtn.disabled = true;
      accountFeedback.textContent = 'Updating email...';
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) {
        accountFeedback.textContent = error.message;
      } else {
        accountFeedback.textContent = 'Email update requested. Check your new email for confirmation.';
        accountEmailInput.value = '';
      }
      changeEmailBtn.disabled = false;
    };
  }

  if (changePasswordBtn && accountPasswordInput && accountFeedback) {
    changePasswordBtn.onclick = async function() {
      const newPassword = accountPasswordInput.value.trim();
      if (!newPassword || newPassword.length < 6) {
        accountFeedback.textContent = 'Password must be at least 6 characters.';
        return;
      }
      changePasswordBtn.disabled = true;
      accountFeedback.textContent = 'Updating password...';
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        accountFeedback.textContent = error.message;
      } else {
        accountFeedback.textContent = 'Password updated!';
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
