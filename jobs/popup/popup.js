// Default configuration
const DEFAULT_API_BASE = 'http://127.0.0.1:8004';
const DEFAULT_DASHBOARD_URL = 'http://127.0.0.1:5173';

// Supabase Configuration
const SUPABASE_URL = 'https://yaqdmnskqpibtglwfaza.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhcWRtbnNrcXBpYnRnbHdmYXphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MDUzNDIsImV4cCI6MjA4MDE4MTM0Mn0.h0A4htEGY4oL-nyC6lYhxHdN5fCsuAQm4ymWhgVvKOw';

// DOM Elements
const views = {
  main: document.getElementById('mainView'),
  settings: document.getElementById('settingsView')
};

const sections = {
  auth: document.getElementById('authSection'),
  login: document.getElementById('loginSection')
};

const inputs = {
  email: document.getElementById('email'),
  password: document.getElementById('password'),
  backendUrl: document.getElementById('backendUrl'),
  dashboardUrl: document.getElementById('dashboardUrl')
};

const statusDiv = document.getElementById('status');
const userEmailDisplay = document.getElementById('userEmailDisplay');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup initialized');
  // Load settings
  const { backendUrl, dashboardUrl, token, userEmail } = await chrome.storage.local.get(['backendUrl', 'dashboardUrl', 'token', 'userEmail']);
  
  // Set backend URL input
  if (backendUrl) {
    inputs.backendUrl.value = backendUrl;
  } else {
    inputs.backendUrl.value = DEFAULT_API_BASE;
  }

  // Set dashboard URL input
  if (dashboardUrl) {
    inputs.dashboardUrl.value = dashboardUrl;
  } else {
    inputs.dashboardUrl.value = DEFAULT_DASHBOARD_URL;
  }

  // Check auth state
  if (token && userEmail) {
    showAuthenticatedState(userEmail);
  } else {
    showLoginState();
  }

  setupEventListeners();
});

function setupEventListeners() {
  // Navigation
  document.getElementById('toggleSettingsBtn').addEventListener('click', toggleSettings);
  document.getElementById('backBtn').addEventListener('click', toggleSettings);
  
  // Settings
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
  
  // Auth
  document.getElementById('loginForm').addEventListener('submit', performLogin);
  document.getElementById('logoutBtn').addEventListener('click', performLogout);
  
  // Actions
  document.getElementById('analyzeBtn').addEventListener('click', performAnalysis);
}

// UI State Management
function toggleSettings() {
  const isSettingsVisible = !views.settings.classList.contains('hidden');
  
  if (isSettingsVisible) {
    views.settings.classList.add('hidden');
    views.main.classList.remove('hidden');
  } else {
    views.main.classList.add('hidden');
    views.settings.classList.remove('hidden');
  }
  clearStatus();
}

function showAuthenticatedState(email) {
  sections.login.classList.add('hidden');
  sections.auth.classList.remove('hidden');
  userEmailDisplay.textContent = email;
}

function showLoginState() {
  sections.auth.classList.add('hidden');
  sections.login.classList.remove('hidden');
  userEmailDisplay.textContent = '';
}

// Actions
async function saveSettings() {
  const url = inputs.backendUrl.value.replace(/\/$/, ''); // Remove trailing slash
  const dashUrl = inputs.dashboardUrl.value.replace(/\/$/, '');
  
  await chrome.storage.local.set({
    backendUrl: url,
    dashboardUrl: dashUrl
  });
  showStatus('✅ Settings saved', 'success');
  setTimeout(() => {
     toggleSettings();
  }, 800);
}

async function performLogin(e) {
  if (e) e.preventDefault();
  console.log('Perform Login called');
  
  const email = inputs.email.value;
  const password = inputs.password.value;
  
  if (!email || !password) {
    showStatus('⚠️ Please enter email and password', 'warning');
    return;
  }
  
  showStatus('⏳ Signing in...', '');
  
  try {
    console.log('Fetching Supabase token...');
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY
      },
      body: JSON.stringify({ email, password })
    });
    
    console.log('Supabase response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Supabase error:', errorData);
      throw new Error(errorData.error_description || errorData.msg || 'Login failed');
    }
    
    const data = await response.json();
    console.log('Login successful', data);
    
    // Save auth data
    await chrome.storage.local.set({
      token: data.access_token,
      userEmail: data.user.email
    });
    
    showStatus('✅ Signed in successfully', 'success');
    showAuthenticatedState(data.user.email);
    
    // Clear password field
    inputs.password.value = '';
    
  } catch (error) {
    console.error('Login exception:', error);
    showStatus(`❌ ${error.message}`, 'error');
  }
}

async function performLogout() {
  await chrome.storage.local.remove(['token', 'userEmail']);
  showLoginState();
  showStatus('Logged out', '');
}

async function performAnalysis() {
  const { backendUrl, token, userEmail } = await chrome.storage.local.get(['backendUrl', 'token', 'userEmail']);
  const API_BASE = backendUrl || DEFAULT_API_BASE;
  
  const analyzeBtn = document.getElementById('analyzeBtn');
  analyzeBtn.disabled = true;
  analyzeBtn.style.opacity = '0.6';
  
  showStatus('📋 Capturing job data...', '');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: extractJobData,
  }, async (results) => {
      if (results && results[0]) {
          const jobData = results[0].result;
          const url = tab.url;

          try {
              // Step 1: Create job
              showStatus('💾 Saving to database...', '');
              
              const createResponse = await chrome.runtime.sendMessage({
                  action: 'createJob',
                  data: {
                      apiBase: API_BASE,
                      token: token,
                      jobData: {
                          url: url,
                          platform: detectPlatform(url),
                          title: jobData.title || 'Job Title',
                          company: jobData.company || 'Company Name',
                          description_markdown: jobData.description || '',
                          description_raw: jobData.html || '',
                          user_email: userEmail // Optional, backend infers from token
                      }
                  }
              });

              if (!createResponse.success) {
                  if (createResponse.status === 401) {
                    throw new Error('Session expired. Please login again.');
                  }
                  throw new Error(createResponse.error || 'Failed to create job');
              }

              const job = createResponse.job;

              // Step 2: Trigger analysis
              showStatus('🤖 Analyzing with AI...', '');
              const analyzeResponse = await chrome.runtime.sendMessage({
                  action: 'analyzeJob',
                  data: {
                      apiBase: API_BASE,
                      token: token,
                      jobId: job.id
                  }
              });

              if (analyzeResponse.success) {
                  showStatus('✅ Success! Job added & analyzed', 'success');
                  
                  // Show additional info
                  setTimeout(() => {
                      statusDiv.innerHTML = `
                          <div style="text-align: left; padding: 8px; background: #f0fdf4; border-radius: 4px; margin-top: 8px;">
                              <strong>✓ ${escapeHtml(jobData.title)}</strong><br>
                              <small style="color: #666;">${escapeHtml(jobData.company)}</small><br>
                              <small style="color: #10b981; margin-top: 4px; display: block;">Dashboard will auto-refresh!</small>
                          </div>
                      `;
                  }, 1000);
                  
                  // Notify dashboard to refresh (if open)
                  notifyDashboardRefresh();
              } else {
                  showStatus('⚠️ Job saved (analysis in progress...)', 'warning');
              }
              
          } catch (error) {
              showStatus(`❌ Error: ${error.message}`, 'error');
              if (error.message.includes('Session expired')) {
                performLogout();
              }
          } finally {
             analyzeBtn.disabled = false;
             analyzeBtn.style.opacity = '1';
          }
      } else {
          showStatus('❌ Could not extract job data', 'error');
          analyzeBtn.disabled = false;
          analyzeBtn.style.opacity = '1';
      }
  });
}

// Helpers
function showStatus(msg, type) {
  statusDiv.textContent = msg;
  statusDiv.className = type;
}

function clearStatus() {
  statusDiv.textContent = '';
  statusDiv.className = '';
}

function escapeHtml(text) {
  if (!text) return '';
  return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
}

// --- Keep existing helper functions ---

// Notify dashboard to refresh if it's open
async function notifyDashboardRefresh() {
    try {
        const { dashboardUrl } = await chrome.storage.local.get(['dashboardUrl']);
        const targetUrl = dashboardUrl || DEFAULT_DASHBOARD_URL;

        // Try to find dashboard tab
        const tabs = await chrome.tabs.query({});
        const dashboardTab = tabs.find(tab => tab.url?.startsWith(targetUrl));
        
        if (dashboardTab) {
            // Send message to dashboard to refresh
            chrome.tabs.sendMessage(dashboardTab.id, { action: 'refreshJobs' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.log('Dashboard not listening, will auto-refresh on next visit');
                }
            });
        }
    } catch (error) {
        console.log('Could not notify dashboard:', error);
    }
}

function detectPlatform(url) {
    if (url.includes('linkedin.com')) return 'LinkedIn';
    if (url.includes('jobsdb.com')) return 'JobsDB';
    if (url.includes('indeed.com')) return 'Indeed';
    if (url.includes('glassdoor.com')) return 'Glassdoor';
    return 'Unknown';
}

function extractJobData() {
    // Extract job information from the page
    const html = document.documentElement.outerHTML;

    // Try to extract title
    let title = document.querySelector('h1')?.textContent?.trim() ||
                document.querySelector('[class*="job-title"]')?.textContent?.trim() ||
                document.title;

    // Try to extract company
    let company = document.querySelector('[class*="company"]')?.textContent?.trim() ||
                  document.querySelector('[class*="employer"]')?.textContent?.trim() ||
                  // Helper for LinkedIn
                  document.querySelector('.job-details-jobs-unified-top-card__company-name')?.textContent?.trim() ||
                  'Unknown Company';

    // Try to extract description
    // Helper for LinkedIn
    let descriptionElement = document.querySelector('#job-details') || 
                             document.querySelector('[class*="description"]');
    
    let description = descriptionElement?.textContent?.trim() ||
                      document.querySelector('article')?.textContent?.trim() ||
                      document.body.textContent.substring(0, 5000);

    return {
        title: title,
        company: company,
        description: description,
        html: html
    };
}
