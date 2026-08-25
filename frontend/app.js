// MoSJE Admin Portal Console Logic
const BACKEND_URL = 'http://localhost:8000';
let authToken = localStorage.getItem('admin_token') || null;
let currentAdmin = null;

// Track sub-views selection state
let currentClusterId = null;
let currentClusterName = null;
let currentExhibitionId = null;
let currentExhibitionName = null;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Connection Status Verification
    checkConnectionStatus();

    // 2. Setup Navigation Tab switches
    setupSidebarNavigation();

    // 3. Setup Auth Listeners (Login/Logout)
    setupAuthListeners();

    // 4. Setup Modals Action Triggers
    setupModalTriggers();

    // 5. Check login state
    verifyLoginSession();
});

// --- Connection Check ---
async function checkConnectionStatus() {
    const statusText = document.getElementById('connection-status-text');
    const indicator = statusText.querySelector('.status-indicator');
    const label = document.getElementById('status-label');

    try {
        const res = await fetch(`${BACKEND_URL}/`);
        if (res.ok) {
            const data = await res.json();
            indicator.className = 'status-indicator online';
            label.textContent = `Connected to API (${data.database_backend || 'PostgreSQL'})`;
        } else {
            throw new Error('Connection failed');
        }
    } catch (e) {
        indicator.className = 'status-indicator offline';
        label.textContent = 'API Server Offline (Start backend)';
        showToast('Cannot connect to backend server. Make sure it is running.', 'error');
    }
}

// --- Session Verification ---
async function verifyLoginSession() {
    const unauthView = document.getElementById('unauth-view');
    const adminView = document.getElementById('admin-view');
    const authBtn = document.getElementById('btn-auth-trigger');

    if (!authToken) {
        unauthView.classList.remove('hidden');
        adminView.classList.add('hidden');
        authBtn.textContent = 'Sign In';
        return;
    }

    try {
        const res = await fetch(`${BACKEND_URL}/auth/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (res.ok) {
            const user = await res.json();
            if (user.role !== 'Admin') {
                showToast('Access denied: You must be an administrator.', 'error');
                handleLogout();
                return;
            }
            currentAdmin = user;
            authBtn.textContent = 'Sign Out';
            unauthView.classList.add('hidden');
            adminView.classList.remove('hidden');
            showToast(`Welcome, Admin ${user.username}!`, 'success');
            refreshAllDashboardData();
        } else {
            handleLogout();
        }
    } catch (e) {
        console.error('Session validation error:', e);
        handleLogout();
    }
}

// --- Sidebar Navigation ---
function setupSidebarNavigation() {
    const links = document.querySelectorAll('.dash-link');
    const panels = document.querySelectorAll('.dashboard-view-panel');

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetView = link.getAttribute('data-view');

            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            panels.forEach(panel => {
                if (panel.id === `panel-${targetView}`) {
                    panel.classList.remove('hidden');
                } else {
                    panel.classList.add('hidden');
                }
            });

            // Specific refresh actions based on active view
            if (authToken) {
                if (targetView === 'admin-approvals') refreshVerifications();
                if (targetView === 'admin-clusters') refreshClusters();
                if (targetView === 'admin-schemes') refreshSchemes();
                if (targetView === 'admin-exhibitions') refreshExhibitions();
                if (targetView === 'admin-analytics') refreshAnalyticsChart();
                if (targetView === 'admin-audit-logs') refreshAuditLogs();
            }
        });
    });
}

// --- Authentication Listeners ---
function setupAuthListeners() {
    const loginForm = document.getElementById('form-login');
    const authBtn = document.getElementById('btn-auth-trigger');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        try {
            const res = await fetch(`${BACKEND_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (res.ok) {
                const tokenData = await res.json();
                if (tokenData.role !== 'Admin') {
                    showToast('Access denied: Admin credentials required.', 'error');
                    return;
                }
                authToken = tokenData.access_token;
                localStorage.setItem('admin_token', authToken);
                verifyLoginSession();
            } else {
                const err = await res.json();
                showToast(err.detail || 'Incorrect admin username or password.', 'error');
            }
        } catch (e) {
            showToast('Sign In failed. API server connection error.', 'error');
        }
    });

    authBtn.addEventListener('click', () => {
        if (authToken) {
            handleLogout();
            showToast('Signed out successfully.', 'info');
        } else {
            document.getElementById('login-username').focus();
            showToast('Please sign in below to access the console.', 'info');
        }
    });
}

function handleLogout() {
    authToken = null;
    currentAdmin = null;
    localStorage.removeItem('admin_token');
    document.getElementById('unauth-view').classList.remove('hidden');
    document.getElementById('admin-view').classList.add('hidden');
    document.getElementById('btn-auth-trigger').textContent = 'Sign In';
    
    // Hide subviews
    document.getElementById('cluster-members-section').classList.add('hidden');
    document.getElementById('exhibition-registrants-section').classList.add('hidden');
}

// --- Modal Controls & Triggers ---
function setupModalTriggers() {
    // 1. Cluster Modal
    setupModalHandlers('modal-create-cluster', 'btn-create-cluster-modal', 'btn-close-cluster-modal');
    // 2. Assign Artisan Modal
    setupModalHandlers('modal-add-artisan-cluster', 'btn-add-artisan-cluster-modal', 'btn-close-add-artisan-modal');
    // 3. Schemes Modal
    setupModalHandlers('modal-create-scheme', 'btn-create-scheme-modal', 'btn-close-scheme-modal');
    // 4. Scheme alert broadcast modal
    setupModalHandlers('modal-broadcast-alert', null, 'btn-close-broadcast-modal');
    // 5. Exhibition Modal
    setupModalHandlers('modal-create-exhibition', 'btn-create-exhibition-modal', 'btn-close-exhibition-modal');

    // Handle Forms Submission
    // A. Create Cluster
    document.getElementById('form-create-cluster').addEventListener('submit', async (e) => {
        e.preventDefault();
        const cluster_name = document.getElementById('cluster-name').value.trim();
        const craft_specialization = document.getElementById('cluster-specialization').value.trim();
        const state = document.getElementById('cluster-state').value.trim();
        const district = document.getElementById('cluster-district').value.trim();

        try {
            const res = await fetch(`${BACKEND_URL}/clusters`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ cluster_name, state, district, craft_specialization })
            });

            if (res.ok) {
                showToast('Cluster cooperative registered successfully.', 'success');
                closeModal('modal-create-cluster');
                document.getElementById('form-create-cluster').reset();
                refreshClusters();
            } else {
                const err = await res.json();
                showToast(err.detail || 'Failed to register cluster.', 'error');
            }
        } catch (e) {
            showToast('Server connection error.', 'error');
        }
    });

    // B. Assign Artisan to Cluster
    document.getElementById('form-add-artisan-cluster').addEventListener('submit', async (e) => {
        e.preventDefault();
        const artisanId = document.getElementById('assign-artisan-select').value;
        if (!artisanId || !currentClusterId) return;

        try {
            const res = await fetch(`${BACKEND_URL}/clusters/${currentClusterId}/artisans?artisan_id=${artisanId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (res.ok) {
                showToast('Artisan successfully assigned to cluster.', 'success');
                closeModal('modal-add-artisan-cluster');
                refreshClusterMembers(currentClusterId, currentClusterName);
                refreshClusters();
            } else {
                const err = await res.json();
                showToast(err.detail || 'Assignment failed.', 'error');
            }
        } catch (e) {
            showToast('Server connection error.', 'error');
        }
    });

    // C. Create Scheme
    document.getElementById('form-create-scheme').addEventListener('submit', async (e) => {
        e.preventDefault();
        const scheme_name = document.getElementById('scheme-name').value.trim();
        const description = document.getElementById('scheme-description').value.trim();
        const eligibility_criteria = document.getElementById('scheme-criteria').value.trim();
        const application_url = document.getElementById('scheme-url').value.trim() || null;
        const valid_until = document.getElementById('scheme-valid-until').value || null;

        try {
            const res = await fetch(`${BACKEND_URL}/admin/schemes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ scheme_name, description, eligibility_criteria, application_url, valid_until })
            });

            if (res.ok) {
                showToast('Government Scheme added successfully.', 'success');
                closeModal('modal-create-scheme');
                document.getElementById('form-create-scheme').reset();
                refreshSchemes();
            } else {
                const err = await res.json();
                showToast(err.detail || 'Failed to add scheme.', 'error');
            }
        } catch (e) {
            showToast('Server connection error.', 'error');
        }
    });

    // D. Broadcast Scheme Alert
    document.getElementById('form-broadcast-alert').addEventListener('submit', async (e) => {
        e.preventDefault();
        const schemeId = document.getElementById('broadcast-scheme-id').value;
        const target_state = document.getElementById('broadcast-state').value.trim() || null;
        const target_craft_type = document.getElementById('broadcast-craft').value.trim() || null;

        try {
            const res = await fetch(`${BACKEND_URL}/admin/schemes/${schemeId}/alert`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ target_state, target_craft_type })
            });

            if (res.ok) {
                const data = await res.json();
                showToast(`Broadcast completed successfully! Alerts sent to ${data.recipients_count} artisans.`, 'success');
                closeModal('modal-broadcast-alert');
            } else {
                const err = await res.json();
                showToast(err.detail || 'Broadcast failed.', 'error');
            }
        } catch (e) {
            showToast('Server connection error.', 'error');
        }
    });

    // E. Create Exhibition
    document.getElementById('form-create-exhibition').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('exhibition-name').value.trim();
        const location = document.getElementById('exhibition-location').value.trim();
        const start_date = document.getElementById('exhibition-start').value;
        const end_date = document.getElementById('exhibition-end').value;

        try {
            const res = await fetch(`${BACKEND_URL}/admin/exhibitions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ name, location, start_date, end_date })
            });

            if (res.ok) {
                showToast('Exhibition scheduled successfully.', 'success');
                closeModal('modal-create-exhibition');
                document.getElementById('form-create-exhibition').reset();
                refreshExhibitions();
            } else {
                const err = await res.json();
                showToast(err.detail || 'Failed to schedule exhibition.', 'error');
            }
        } catch (e) {
            showToast('Server connection error.', 'error');
        }
    });
}

function setupModalHandlers(modalId, openBtnId, closeBtnId) {
    const modal = document.getElementById(modalId);
    const closeBtn = document.getElementById(closeBtnId);

    if (openBtnId) {
        const openBtn = document.getElementById(openBtnId);
        openBtn.addEventListener('click', () => {
            // If assigning artisan modal, fetch and populate unassigned artisans list first
            if (modalId === 'modal-add-artisan-cluster') {
                populateUnassignedArtisansDropdown();
            }
            modal.classList.remove('hidden');
        });
    }

    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
}

function openModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// --- Data Refreshers ---

function refreshAllDashboardData() {
    refreshAdminKPIs();
    refreshVerifications();
}

async function refreshAdminKPIs() {
    try {
        const res = await fetch(`${BACKEND_URL}/admin/analytics`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (res.ok) {
            const metrics = await res.json();
            document.getElementById('admin-kpi-artisans').textContent = metrics.artisans_count.toLocaleString();
            document.getElementById('admin-kpi-products').textContent = metrics.products_count.toLocaleString();
            document.getElementById('admin-kpi-inquiries').textContent = metrics.inquiries_count.toLocaleString();
            document.getElementById('admin-kpi-sales').textContent = `₹ ${metrics.estimated_sales_value.toLocaleString()}`;
        }
    } catch (e) {
        console.error('Error fetching admin KPIs:', e);
    }
}

async function refreshVerifications() {
    const listBody = document.getElementById('admin-verification-list');
    listBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading Pipeline...</td></tr>';

    try {
        const res = await fetch(`${BACKEND_URL}/admin/verifications`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (res.ok) {
            const verifications = await res.json();
            listBody.innerHTML = '';
            
            if (verifications.length === 0) {
                listBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No verifications pending review.</td></tr>';
                return;
            }

            verifications.forEach(v => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-family:monospace; font-size:0.8rem;">${v.id.substring(0, 8)}...</td>
                    <td><strong>${v.artisan_name}</strong></td>
                    <td>${v.phone_number}</td>
                    <td>${v.aadhaar_verified ? '<span class="badge badge-success">✓ Verified</span>' : '<span class="badge" style="background-color:rgba(245,158,11,0.1); color:#f59e0b;">⏳ Pending Verification</span>'}</td>
                    <td>${v.bank_verified ? '<span class="badge badge-success">✓ Bank Synced</span>' : '<span class="badge">⏳ Pending Account</span>'}</td>
                    <td>
                        ${v.status === 'Pending' ? `
                            <button class="btn btn-primary btn-sm" onclick="reviewKYC('${v.id}', 'Approved')" style="margin-right:6px; background-color:var(--success); border-color:var(--success);">Approve</button>
                            <button class="btn btn-secondary btn-sm" onclick="reviewKYCPrompt('${v.id}')">Reject</button>
                        ` : `
                            <span class="badge ${v.status === 'Approved' ? 'badge-success' : 'badge-danger'}">${v.status}</span>
                        `}
                    </td>
                `;
                listBody.appendChild(tr);
            });
        }
    } catch (e) {
        listBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--error);">Failed to load verifications.</td></tr>';
    }
}

async function reviewKYC(verificationId, status, reason = "") {
    try {
        const res = await fetch(`${BACKEND_URL}/admin/verifications/${verificationId}/review`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                status: status,
                rejection_reason: reason,
                aadhaar_verified: status === 'Approved',
                bank_verified: status === 'Approved'
            })
        });

        if (res.ok) {
            showToast(`KYC successfully ${status.toLowerCase()}!`, 'success');
            refreshVerifications();
            refreshAdminKPIs();
        } else {
            const err = await res.json();
            showToast(err.detail || 'Failed to update review status.', 'error');
        }
    } catch (e) {
        showToast('Server connection error.', 'error');
    }
}

window.reviewKYC = reviewKYC;

window.reviewKYCPrompt = (verificationId) => {
    const reason = prompt("Enter Rejection Reason (Required):");
    if (reason === null) return;
    if (reason.trim() === "") {
        showToast("Rejection reason is required.", "error");
        return;
    }
    reviewKYC(verificationId, 'Rejected', reason.trim());
};

async function refreshClusters() {
    const listBody = document.getElementById('admin-cluster-list');
    listBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading Clusters...</td></tr>';

    try {
        const res = await fetch(`${BACKEND_URL}/clusters`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (res.ok) {
            const clusters = await res.json();
            listBody.innerHTML = '';
            
            if (clusters.length === 0) {
                listBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No clusters registered.</td></tr>';
                return;
            }

            clusters.forEach(c => {
                const tr = document.createElement('tr');
                tr.style.cursor = 'pointer';
                tr.className = currentClusterId === c.id ? 'active-row' : '';
                tr.innerHTML = `
                    <td><strong>${c.cluster_name}</strong></td>
                    <td>${c.craft_specialization || 'General Handicrafts'}</td>
                    <td>${c.state}</td>
                    <td>${c.district}</td>
                    <td><span class="badge badge-sync gem">${c.total_artisans} member(s)</span></td>
                    <td><button class="btn btn-secondary btn-sm" onclick="viewClusterMembers('${c.id}', '${c.cluster_name}')">👁️ View Members</button></td>
                `;
                listBody.appendChild(tr);
            });
        }
    } catch (e) {
        listBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--error);">Failed to load cluster registry.</td></tr>';
    }
}

window.viewClusterMembers = (clusterId, clusterName) => {
    currentClusterId = clusterId;
    currentClusterName = clusterName;
    
    // Highlight cluster row
    refreshClusters();
    
    document.getElementById('current-cluster-name-title').textContent = clusterName;
    document.getElementById('cluster-members-section').classList.remove('hidden');
    refreshClusterMembers(clusterId, clusterName);
};

async function refreshClusterMembers(clusterId, clusterName) {
    const listBody = document.getElementById('cluster-artisan-list');
    listBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading Members...</td></tr>';

    try {
        const res = await fetch(`${BACKEND_URL}/clusters/${clusterId}/artisans`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (res.ok) {
            const members = await res.json();
            listBody.innerHTML = '';
            
            if (members.length === 0) {
                listBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No artisans assigned to this cooperative cluster yet.</td></tr>';
                return;
            }

            members.forEach(m => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${m.full_name}</strong></td>
                    <td>${m.phone_number}</td>
                    <td>${m.district || 'Varanasi'}</td>
                    <td>${m.is_verified ? '<span class="badge badge-success">✓ Verified</span>' : '<span class="badge">⏳ Pending</span>'}</td>
                `;
                listBody.appendChild(tr);
            });
        }
    } catch (e) {
        listBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--error);">Failed to load members.</td></tr>';
    }
}

async function populateUnassignedArtisansDropdown() {
    const select = document.getElementById('assign-artisan-select');
    select.innerHTML = '<option value="">Loading Artisans...</option>';

    try {
        const res = await fetch(`${BACKEND_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (res.ok) {
            const users = await res.json();
            
            // Filter artisans who aren't necessarily verified but are registered
            const artisans = users.filter(u => u.role === 'Artisan');
            
            select.innerHTML = '';
            if (artisans.length === 0) {
                select.innerHTML = '<option value="">No registered artisans available</option>';
                return;
            }

            artisans.forEach(a => {
                const opt = document.createElement('option');
                opt.value = a.id;
                opt.textContent = `${a.full_name || a.username} (${a.phone_number}) - ${a.region || 'Varanasi'}`;
                select.appendChild(opt);
            });
            
            // Set input hidden field for parent cluster ID
            document.getElementById('assign-cluster-id').value = currentClusterId;
        }
    } catch (e) {
        select.innerHTML = '<option value="">Failed to load list</option>';
    }
}

async function refreshSchemes() {
    const listBody = document.getElementById('admin-scheme-list');
    listBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading Schemes...</td></tr>';

    try {
        const res = await fetch(`${BACKEND_URL}/admin/schemes`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (res.ok) {
            const schemes = await res.json();
            listBody.innerHTML = '';
            
            if (schemes.length === 0) {
                listBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No schemes published.</td></tr>';
                return;
            }

            schemes.forEach(s => {
                const validDate = s.valid_until ? new Date(s.valid_until).toLocaleDateString() : 'Continuous';
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${s.scheme_name}</strong><br><small class="text-muted">${s.description.substring(0, 100)}...</small></td>
                    <td>${s.eligibility_criteria || 'All artisans'}</td>
                    <td>${s.is_active ? '<span class="badge badge-success">Active</span>' : '<span class="badge">Inactive</span>'}</td>
                    <td>${validDate}</td>
                    <td>
                        <button class="btn btn-primary btn-sm" onclick="triggerBroadcastModal('${s.id}', '${s.scheme_name.replace(/'/g, "\\'")}')">📢 Alert Artisans</button>
                    </td>
                `;
                listBody.appendChild(tr);
            });
        }
    } catch (e) {
        listBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--error);">Failed to load government schemes.</td></tr>';
    }
}

window.triggerBroadcastModal = (schemeId, schemeName) => {
    document.getElementById('broadcast-scheme-id').value = schemeId;
    document.getElementById('broadcast-scheme-title').value = schemeName;
    openModal('modal-broadcast-alert');
};

async function refreshExhibitions() {
    const listBody = document.getElementById('admin-exhibition-list');
    listBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading Exhibitions...</td></tr>';

    try {
        const res = await fetch(`${BACKEND_URL}/admin/exhibitions`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (res.ok) {
            const exhibitions = await res.json();
            listBody.innerHTML = '';
            
            if (exhibitions.length === 0) {
                listBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No scheduled fairs/exhibitions.</td></tr>';
                return;
            }

            exhibitions.forEach(e => {
                const tr = document.createElement('tr');
                tr.style.cursor = 'pointer';
                tr.className = currentExhibitionId === e.id ? 'active-row' : '';
                tr.innerHTML = `
                    <td><strong>${e.name}</strong></td>
                    <td>${e.location}</td>
                    <td>${new Date(e.start_date).toLocaleDateString()}</td>
                    <td>${new Date(e.end_date).toLocaleDateString()}</td>
                    <td><span class="badge badge-sync gem">${e.status}</span></td>
                    <td>
                        <button class="btn btn-secondary btn-sm" onclick="viewExhibitionRegistrants('${e.id}', '${e.name.replace(/'/g, "\\'")}')">👁️ View Signups</button>
                    </td>
                `;
                listBody.appendChild(tr);
            });
        }
    } catch (e) {
        listBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--error);">Failed to load exhibitions.</td></tr>';
    }
}

window.viewExhibitionRegistrants = (exhibId, name) => {
    currentExhibitionId = exhibId;
    currentExhibitionName = name;
    
    refreshExhibitions();
    
    document.getElementById('current-exhibition-name-title').textContent = name;
    document.getElementById('exhibition-registrants-section').classList.remove('hidden');
    refreshExhibitionRegistrations(exhibId, name);
};

async function refreshExhibitionRegistrations(exhibId, exhibName) {
    const listBody = document.getElementById('exhibition-registrant-list');
    listBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading Registrations...</td></tr>';

    try {
        const res = await fetch(`${BACKEND_URL}/admin/exhibitions/${exhibId}/registrations`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (res.ok) {
            const regs = await res.json();
            listBody.innerHTML = '';
            
            if (regs.length === 0) {
                listBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No artisans have registered for this mela yet.</td></tr>';
                return;
            }

            // Load registered artisans names
            const usersRes = await fetch(`${BACKEND_URL}/admin/users`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const users = await usersRes.json();
            const userMap = {};
            users.forEach(u => { userMap[u.id] = u.full_name || u.username; });

            regs.forEach(r => {
                const tr = document.createElement('tr');
                const artisanName = userMap[r.artisan_id] || 'Registered Artisan';
                tr.innerHTML = `
                    <td><strong>${artisanName}</strong></td>
                    <td>${new Date(r.registered_at).toLocaleString()}</td>
                    <td><span class="badge ${r.status === 'Approved' ? 'badge-success' : r.status === 'Rejected' ? 'badge-danger' : ''}">${r.status}</span></td>
                    <td>
                        ${r.status === 'Pending' ? `
                            <button class="btn btn-primary btn-sm" onclick="reviewExhibReg('${r.id}', 'Approved')" style="margin-right:6px; background-color:var(--success); border-color:var(--success);">Approve</button>
                            <button class="btn btn-secondary btn-sm" onclick="reviewExhibReg('${r.id}', 'Rejected')">Reject</button>
                        ` : `
                            <span class="text-muted" style="font-size:0.85rem;">Reviewed</span>
                        `}
                    </td>
                `;
                listBody.appendChild(tr);
            });
        }
    } catch (e) {
        listBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--error);">Failed to load registrants.</td></tr>';
    }
}

async function reviewExhibReg(registrationId, status) {
    try {
        const formData = new FormData();
        formData.append('status', status);

        const res = await fetch(`${BACKEND_URL}/admin/exhibitions/registrations/${registrationId}/status`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });

        if (res.ok) {
            showToast(`Registration request ${status.toLowerCase()}!`, 'success');
            refreshExhibitionRegistrations(currentExhibitionId, currentExhibitionName);
        } else {
            const err = await res.json();
            showToast(err.detail || 'Review update failed.', 'error');
        }
    } catch (e) {
        showToast('Server connection error.', 'error');
    }
}

window.reviewExhibReg = reviewExhibReg;

async function refreshAuditLogs() {
    const listBody = document.getElementById('admin-audit-log-list');
    listBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading audit trails...</td></tr>';

    try {
        const res = await fetch(`${BACKEND_URL}/admin/audit-logs`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (res.ok) {
            const logs = await res.json();
            listBody.innerHTML = '';
            
            if (logs.length === 0) {
                listBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No audit actions logged.</td></tr>';
                return;
            }

            logs.forEach(l => {
                const snapshotStr = l.change_snapshot ? JSON.stringify(l.change_snapshot) : 'None';
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-size:0.8rem; white-space:nowrap;">${new Date(l.created_at).toLocaleString()}</td>
                    <td><strong>${l.admin_name}</strong></td>
                    <td>${l.action}</td>
                    <td style="font-family:monospace; font-size:0.8rem;">${l.entity_id ? `${l.entity_type} (${l.entity_id.substring(0,8)}...)` : 'System'}</td>
                    <td><small class="text-muted" style="font-family:monospace; font-size:0.75rem;">${snapshotStr}</small></td>
                `;
                listBody.appendChild(tr);
            });
        }
    } catch (e) {
        listBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--error);">Failed to load audit logs.</td></tr>';
    }
}

async function refreshAnalyticsChart() {
    const container = document.getElementById('admin-analytics-chart');
    container.innerHTML = '<p style="text-align:center;">Computing category statistics...</p>';

    try {
        const res = await fetch(`${BACKEND_URL}/products`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (res.ok) {
            const products = await res.json();
            
            // Tally categories
            const categoryCounts = {};
            products.forEach(p => {
                categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
            });
            
            // Default categories in case DB is fresh
            const defaultCategories = ['Textiles', 'Handicrafts', 'Pottery', 'Jewelry', 'Paintings & Art'];
            defaultCategories.forEach(cat => {
                if (!categoryCounts[cat]) categoryCounts[cat] = 0;
            });

            container.innerHTML = '';
            const maxVal = Math.max(...Object.values(categoryCounts), 1);

            // Render highly appealing custom CSS-based bar chart
            Object.entries(categoryCounts).forEach(([cat, count]) => {
                const percent = (count / maxVal) * 100;
                
                const row = document.createElement('div');
                row.style.margin = '20px 0';
                row.style.display = 'flex';
                row.style.flexDirection = 'column';
                row.style.gap = '8px';
                
                row.innerHTML = `
                    <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:var(--text-secondary);">
                        <span><strong>${cat}</strong></span>
                        <span>${count} active listing(s)</span>
                    </div>
                    <div style="background-color:rgba(255,255,255,0.03); border-radius:6px; height:18px; width:100%; overflow:hidden; border:1px solid var(--border-color);">
                        <div style="background:linear-gradient(90deg, var(--primary), var(--secondary)); width:${percent}%; height:100%; transition:width 0.8s ease-out; border-radius:5px;"></div>
                    </div>
                `;
                container.appendChild(row);
            });
        }
    } catch (e) {
        container.innerHTML = '<p style="text-align:center; color:var(--error);">Failed to load platform statistics.</p>';
    }
}

// --- Toast and Feedback Notifications ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let emoji = 'ℹ️';
    if (type === 'success') emoji = '✅';
    if (type === 'error') emoji = '❌';
    if (type === 'warning') emoji = '⚠️';
    
    toast.innerHTML = `<span style="margin-right:8px;">${emoji}</span> ${message}`;
    container.appendChild(toast);
    
    // Animate slide-in
    setTimeout(() => { toast.classList.add('visible'); }, 50);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => { toast.remove(); }, 300);
    }, 4000);
}
