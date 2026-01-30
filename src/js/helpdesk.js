        // ==========================================
// HELPDESK UI SCRIPTS - helpdesk-scripts.js
// ==========================================

// ==========================================
// STATE MANAGEMENT
// ==========================================
const state = {
    user: null,
    profile: null,
    isAdmin: false,
    domain: null,
    tickets: [],
    users: [],
    companies: [],
    selectedTicket: null,
    selectedCategory: null,
    selectedPriority: 'medium',
    selectedImpact: 'moderate',
    selectedTicketType: 'support',
    currentStatusFilter: 'all',
    currentTypeFilter: 'all',
    searchQuery: '',
    priorityFilter: '',
    userFilter: '',
    companyFilter: '',
    pendingAttachment: null,
    contract: null,
    referrals: [],
    referralCount: 0,
    notificationCount: 0,
    unreadNotes: {}
};

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    window.parent.postMessage({ action: 'ready' }, '*');
    initEventListeners();
});

window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || !data.action) return;

    switch (data.action) {
        case 'setUser': handleSetUser(data); break;
        case 'setTickets': handleSetTickets(data); break;
        case 'accessDenied': showAccessDenied(data.message); break;
        case 'error': showToast(data.message, 'error'); break;
        case 'ticketCreated': handleTicketCreated(data); break;
        case 'noteAdded': handleNoteAdded(data); break;
        case 'statusUpdated': handleStatusUpdated(data); break;
        case 'ticketDeleted': handleTicketDeleted(data); break;
        case 'profileSaved': handleProfileSaved(data); break;
        case 'fileUploaded': handleFileUploaded(data); break;
        case 'uploadCancelled': state.pendingAttachment = null; updatePendingAttachmentUI(); break;
        case 'uploadError': showToast(data.message || 'Upload failed', 'error'); break;
        case 'showLiveIndicator': if (data.show) document.getElementById('liveIndicator').style.display = 'inline-flex'; break;
        case 'setContractInfo': handleContractInfo(data.contract); break;
        case 'setReferrals': handleSetReferrals(data); break;
        case 'referralAdded': showToast('Referral submitted! +' + data.tasksAdded + ' tasks added', 'success'); closeReferralModal(); break;
        case 'ticketTypeUpdated': handleTicketTypeUpdated(data); break;
        case 'projectValueUpdated': handleProjectValueUpdated(data); break;
        case 'realtimeNoteAdded': handleRealtimeNoteAdded(data); break;
        case 'realtimeStatusUpdated': handleRealtimeStatusUpdated(data); break;
        case 'realtimeTicketCreated': handleRealtimeTicketCreated(data); break;
        case 'realtimeTicketDeleted': handleRealtimeTicketDeleted(data); break;
    }
});

// ==========================================
// HANDLERS
// ==========================================
function handleSetUser(data) {
    state.user = data.user;
    state.isAdmin = data.isAdmin;
    state.profile = data.profile;
    state.domain = data.domain;

    document.getElementById('loadingOverlay').classList.add('hidden');
    document.getElementById('userName').textContent = data.user.name || data.user.email;
    document.getElementById('userEmail').textContent = data.user.email;
    document.getElementById('userAvatar').textContent = (data.user.name || data.user.email).charAt(0).toUpperCase();

    if (data.profile && data.profile.companyName) {
        document.getElementById('companyName').textContent = data.profile.companyName;
        document.getElementById('headerCenter').style.display = 'block';
        if (data.profile.image) {
            document.getElementById('companyLogo').src = data.profile.image;
            document.getElementById('companyLogo').style.display = 'block';
        }
    }

    if (!data.hasProfile && !data.isAdmin) {
        document.getElementById('profileSetupBanner').style.display = 'block';
    }

    if (data.isAdmin) {
        document.getElementById('userFilter').style.display = 'block';
        document.getElementById('companyFilter').style.display = 'block';
        document.getElementById('ticketPanelTitle').textContent = 'All Tickets';
    }
}

function handleSetTickets(data) {
    state.tickets = data.tickets || [];
    state.users = data.users || [];
    state.companies = data.companies || [];
    renderTickets();
    updateStats();
    updateTypeCounts();
    populateFilters();
}

function handleContractInfo(contract) {
    state.contract = contract;
    const banner = document.getElementById('contractBanner');
    if (contract) {
        document.getElementById('contractName').textContent = contract.contractName || '-';
        document.getElementById('baseTasks').textContent = contract.baseTasks || 0;
        document.getElementById('adjustedTasks').textContent = contract.adjustedTasks || 0;
        banner.classList.add('visible');
    } else {
        banner.classList.remove('visible');
    }
}

function handleSetReferrals(data) {
    state.referrals = data.referrals || [];
    state.referralCount = data.count || 0;
    document.getElementById('referralCount').textContent = state.referralCount;
    renderReferralList();
}

function handleTicketCreated(data) {
    document.getElementById('submitTicket').classList.remove('loading');
    state.tickets.unshift(data.ticket);
    renderTickets();
    updateStats();
    updateTypeCounts();
    closeModal();
    showToast('Ticket created successfully!', 'success');
    selectTicket(data.ticket._id);
}

function handleNoteAdded(data) {
    const ticket = state.tickets.find(t => t._id === data.ticketId);
    if (ticket) {
        if (!ticket.notes) ticket.notes = [];
        ticket.notes.push(data.note);
        if (state.selectedTicket && state.selectedTicket._id === data.ticketId) {
            state.selectedTicket = ticket;
            renderTicketDetail(ticket);
        }
    }
}

function handleStatusUpdated(data) {
    const ticket = state.tickets.find(t => t._id === data.ticketId);
    if (ticket) {
        ticket.status = data.status;
        renderTickets();
        updateStats();
        if (state.selectedTicket && state.selectedTicket._id === data.ticketId) {
            state.selectedTicket = ticket;
            renderTicketDetail(ticket);
        }
    }
}

function handleTicketDeleted(data) {
    state.tickets = state.tickets.filter(t => t._id !== data.ticketId);
    renderTickets();
    updateStats();
    updateTypeCounts();
    if (state.selectedTicket && state.selectedTicket._id === data.ticketId) {
        state.selectedTicket = null;
        document.getElementById('ticketDetailContent').style.display = 'none';
        document.getElementById('noTicketSelected').style.display = 'block';
    }
    showToast('Ticket deleted', 'success');
}

function handleProfileSaved(data) {
    state.profile = data.profile;
    document.getElementById('profileSetupBanner').style.display = 'none';
    if (data.profile.companyName) {
        document.getElementById('companyName').textContent = data.profile.companyName;
        document.getElementById('headerCenter').style.display = 'block';
    }
    showToast('Profile saved!', 'success');
}

function handleFileUploaded(data) {
    state.pendingAttachment = { url: data.url, type: data.fileType, filename: data.filename };
    updatePendingAttachmentUI();
}

function handleTicketTypeUpdated(data) {
    const ticket = state.tickets.find(t => t._id === data.ticketId);
    if (ticket) {
        ticket.ticketType = data.ticketType;
        renderTickets();
        updateTypeCounts();
        if (state.selectedTicket && state.selectedTicket._id === data.ticketId) {
            state.selectedTicket = ticket;
            renderTicketDetail(ticket);
        }
    }
    showToast('Ticket type updated', 'success');
}

function handleProjectValueUpdated(data) {
    const ticket = state.tickets.find(t => t._id === data.ticketId);
    if (ticket) {
        ticket.projectValue = data.projectValue;
        renderTickets();
        if (state.selectedTicket && state.selectedTicket._id === data.ticketId) {
            state.selectedTicket = ticket;
            renderTicketDetail(ticket);
        }
    }
    showToast('Project value updated to £' + data.projectValue, 'success');
}

function handleRealtimeNoteAdded(data) {
    const ticket = state.tickets.find(t => t._id === data.ticketId);
    if (ticket) {
        if (!ticket.notes) ticket.notes = [];
        const noteExists = ticket.notes.some(n => n.id === data.note.id);
        if (!noteExists) {
            ticket.notes.push(data.note);
            if (state.selectedTicket && state.selectedTicket._id === data.ticketId) {
                state.selectedTicket = ticket;
                renderTicketDetail(ticket);
            } else {
                incrementNotifications(data.ticketId);
            }
        }
    }
}

function handleRealtimeStatusUpdated(data) {
    handleStatusUpdated(data);
}

function handleRealtimeTicketCreated(data) {
    if (data.ticket && !state.tickets.find(t => t._id === data.ticket._id)) {
        state.tickets.unshift(data.ticket);
        renderTickets();
        updateStats();
        updateTypeCounts();
    }
}

function handleRealtimeTicketDeleted(data) {
    handleTicketDeleted(data);
}

// ==========================================
// NOTIFICATIONS
// ==========================================
function incrementNotifications(ticketId) {
    if (!state.unreadNotes[ticketId]) state.unreadNotes[ticketId] = 0;
    state.unreadNotes[ticketId]++;
    updateNotificationBadge();
    playNotificationSound();
    document.getElementById('notificationBtn').classList.add('bell-ringing');
    setTimeout(() => document.getElementById('notificationBtn').classList.remove('bell-ringing'), 500);
    
    // Fire event to widget
    window.parent.postMessage({ 
        action: 'notificationReceived', 
        ticketId: ticketId, 
        totalCount: state.notificationCount 
    }, '*');
}

function updateNotificationBadge() {
    const total = Object.values(state.unreadNotes).reduce((a, b) => a + b, 0);
    state.notificationCount = total;
    const badge = document.getElementById('notificationBadge');
    badge.textContent = total;
    badge.classList.toggle('hidden', total === 0);
}

function clearNotificationsForTicket(ticketId) {
    if (state.unreadNotes[ticketId]) {
        delete state.unreadNotes[ticketId];
        updateNotificationBadge();
    }
}

function playNotificationSound() {
    try {
        const audio = document.getElementById('notificationSound');
        audio.currentTime = 0;
        audio.play().catch(() => {});
    } catch (e) { /* ignore */ }
}

// ==========================================
// RENDERING
// ==========================================
function renderTickets() {
    const container = document.getElementById('ticketList');
    let filtered = state.tickets.filter(ticket => {
        if (state.currentStatusFilter !== 'all' && ticket.status !== state.currentStatusFilter) return false;
        if (state.currentTypeFilter !== 'all' && (ticket.ticketType || 'support') !== state.currentTypeFilter) return false;
        if (state.searchQuery) {
            const q = state.searchQuery.toLowerCase();
            if (!ticket.subject.toLowerCase().includes(q) && 
                !ticket.ticketNumber.toLowerCase().includes(q) && 
                !(ticket.description || '').toLowerCase().includes(q)) return false;
        }
        if (state.priorityFilter && ticket.priority !== state.priorityFilter) return false;
        if (state.userFilter && ticket.userEmail !== state.userFilter) return false;
        if (state.companyFilter && ticket.domain !== state.companyFilter) return false;
        return true;
    });

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-1 12H5c-.55 0-1-.45-1-1V9c0-.55.45-1 1-1h14c.55 0 1 .45 1 1v8c0 .55-.45 1-1 1z"/></svg><h3>No tickets found</h3><p>Try adjusting your filters</p></div>';
        return;
    }

    container.innerHTML = filtered.map(ticket => {
        const ticketType = ticket.ticketType || 'support';
        const typeLabel = ticketType.charAt(0).toUpperCase() + ticketType.slice(1);
        const unread = state.unreadNotes[ticket._id] || 0;
        return '<div class="ticket-item ' + (state.selectedTicket && state.selectedTicket._id === ticket._id ? 'active' : '') + '" data-id="' + ticket._id + '">' +
            '<div class="ticket-item-header">' +
                '<span class="ticket-number">' + ticket.ticketNumber + (unread > 0 ? ' <span style="color:#f44336;font-weight:bold;">(' + unread + ' new)</span>' : '') + '</span>' +
                '<span class="ticket-status ' + ticket.status + '">' + formatStatus(ticket.status) + '</span>' +
            '</div>' +
            '<div class="ticket-subject">' + ticket.subject + '<span class="ticket-type-badge type-' + ticketType + '">' + typeLabel + '</span></div>' +
            (ticketType === 'project' && ticket.projectValue ? '<div class="project-value-display">£' + ticket.projectValue.toLocaleString() + '</div>' : '') +
            '<div class="ticket-meta">' +
                '<span class="ticket-priority"><span class="priority-dot ' + ticket.priority + '"></span> ' + ticket.priority + '</span>' +
                '<span>' + formatDate(ticket._createdDate) + '</span>' +
                (state.isAdmin ? '<span>' + (ticket.userName || ticket.userEmail) + '</span>' : '') +
            '</div>' +
        '</div>';
    }).join('');

    container.querySelectorAll('.ticket-item').forEach(item => {
        item.addEventListener('click', () => selectTicket(item.dataset.id));
    });
}

function renderTicketDetail(ticket) {
    const container = document.getElementById('ticketDetailContent');
    const ticketType = ticket.ticketType || 'support';

    let adminTypeSection = '';
    if (state.isAdmin) {
        adminTypeSection = '<div class="admin-type-section visible">' +
            '<h4>Change Ticket Type</h4>' +
            '<div class="admin-type-selector">' +
                '<button class="admin-type-btn ' + (ticketType === 'support' ? 'active' : '') + '" data-type="support" onclick="changeTicketType(\'' + ticket._id + '\', \'support\')">Support</button>' +
                '<button class="admin-type-btn ' + (ticketType === 'bug' ? 'active' : '') + '" data-type="bug" onclick="changeTicketType(\'' + ticket._id + '\', \'bug\')">Bug</button>' +
                '<button class="admin-type-btn ' + (ticketType === 'project' ? 'active' : '') + '" data-type="project" onclick="changeTicketType(\'' + ticket._id + '\', \'project\')">Project</button>' +
            '</div>' +
            '<div class="project-value-section ' + (ticketType === 'project' ? 'visible' : '') + '">' +
                '<div class="project-value-label">Project Value</div>' +
                '<div class="project-value-input-wrapper">' +
                    '<span class="project-value-prefix">£</span>' +
                    '<input type="number" class="project-value-input" id="projectValueInput" value="' + (ticket.projectValue || 0) + '" min="0" step="100">' +
                    '<button class="project-value-save-btn" onclick="saveProjectValue(\'' + ticket._id + '\')">Save</button>' +
                '</div>' +
                '<div class="project-value-info">Every £1000 = 5 extra tasks</div>' +
            '</div>' +
        '</div>';
    }

    container.innerHTML = '<button class="btn btn-secondary" onclick="closeDetail()" style="margin-bottom: 16px; display: none;" id="backBtn">' +
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>Back</button>' +
        '<div class="detail-header">' +
            '<h2 class="detail-title">' + ticket.subject + '</h2>' +
            '<div class="detail-meta">' +
                '<span class="detail-meta-item"><svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>' + formatDate(ticket._createdDate) + '</span>' +
                '<span class="detail-meta-item"><svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>' + (ticket.userName || ticket.userEmail) + '</span>' +
                '<span class="ticket-type-badge type-' + ticketType + '">' + ticketType.charAt(0).toUpperCase() + ticketType.slice(1) + '</span>' +
            '</div>' +
        '</div>' +
        '<div class="detail-section"><h3 class="detail-section-title">Description</h3><div class="detail-description">' + ticket.description + '</div></div>' +
        '<div class="detail-section"><h3 class="detail-section-title">Details</h3>' +
            '<div class="detail-info-grid">' +
                '<div class="detail-info-item"><div class="detail-info-label">Ticket Number</div><div class="detail-info-value">' + ticket.ticketNumber + '</div></div>' +
                '<div class="detail-info-item"><div class="detail-info-label">Status</div><div class="detail-info-value"><span class="ticket-status ' + ticket.status + '">' + formatStatus(ticket.status) + '</span></div></div>' +
                '<div class="detail-info-item"><div class="detail-info-label">Priority</div><div class="detail-info-value"><span class="ticket-priority"><span class="priority-dot ' + ticket.priority + '"></span> ' + ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1) + '</span></div></div>' +
                '<div class="detail-info-item"><div class="detail-info-label">Category</div><div class="detail-info-value">' + (ticket.customCategory || formatCategory(ticket.category)) + '</div></div>' +
                '<div class="detail-info-item"><div class="detail-info-label">Business Impact</div><div class="detail-info-value">' + ((ticket.businessImpact || 'moderate').charAt(0).toUpperCase() + (ticket.businessImpact || 'moderate').slice(1)) + '</div></div>' +
                (ticketType === 'project' && ticket.projectValue ? '<div class="detail-info-item"><div class="detail-info-label">Project Value</div><div class="detail-info-value" style="color:var(--type-project);font-weight:600;">£' + ticket.projectValue.toLocaleString() + '</div></div>' : '') +
            '</div>' +
        '</div>' +
        (state.isAdmin ? '<div class="detail-section"><h3 class="detail-section-title">Update Status</h3>' +
            '<div class="status-actions">' +
                ['open', 'in-progress', 'awaiting-response', 'resolved', 'closed'].map(s => '<button class="status-btn ' + (ticket.status === s ? 'active' : '') + '" data-status="' + s + '">' + formatStatus(s) + '</button>').join('') +
            '</div>' + adminTypeSection + '</div>' +
            '<div class="detail-section"><button class="btn btn-danger" onclick="deleteTicket(\'' + ticket._id + '\')">' +
                '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>Delete Ticket</button></div>' : '') +
        '<div class="notes-section"><h3 class="detail-section-title">Messages</h3>' +
            '<div class="notes-container" id="notesContainer">' + renderNotes(ticket.notes || []) + '</div>' +
            '<div id="pendingAttachmentContainer"></div>' +
            '<div class="note-input-container">' +
                '<div class="note-input-wrapper">' +
                    '<div class="note-input-actions">' +
                        '<button class="note-action-btn" id="attachBtn" title="Attach file">' +
                            '<svg viewBox="0 0 24 24"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>' +
                        '</button>' +
                    '</div>' +
                    '<textarea class="note-textarea" id="noteInput" placeholder="Type a message..." rows="1"></textarea>' +
                '</div>' +
                '<button class="note-send-btn" id="sendNoteBtn">' +
                    '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>' +
                '</button>' +
            '</div>' +
        '</div>';

    container.style.display = 'block';
    document.getElementById('noTicketSelected').style.display = 'none';

    if (window.innerWidth <= 900) {
        document.getElementById('ticketDetailPanel').classList.add('active');
        document.getElementById('backBtn').style.display = 'inline-flex';
    }

    container.querySelectorAll('.status-btn').forEach(btn => {
        btn.addEventListener('click', () => updateStatus(ticket._id, btn.dataset.status));
    });

    document.getElementById('attachBtn').addEventListener('click', () => {
        window.parent.postMessage({ action: 'requestUpload' }, '*');
    });

    document.getElementById('sendNoteBtn').addEventListener('click', () => sendNote(ticket._id));
    document.getElementById('noteInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendNote(ticket._id);
        }
    });

    updatePendingAttachmentUI();
    scrollNotesToBottom();
}

function renderNotes(notes) {
    if (!notes || notes.length === 0) {
        return '<div style="text-align:center;color:var(--grey-500);padding:40px;">No messages yet</div>';
    }

    return notes.map(note => {
        const isSent = note.author === 'Support Team' ? state.isAdmin : !state.isAdmin;
        let attachmentHtml = '';

        if (note.attachment) {
            const att = note.attachment;
            if (att.type === 'image') {
                attachmentHtml = '<div class="note-attachment"><img src="' + att.url + '" alt="' + att.filename + '" onclick="openImageModal(\'' + att.url + '\')"></div>';
            } else if (att.type === 'video') {
                attachmentHtml = '<div class="note-attachment"><video controls src="' + att.url + '"></video></div>';
            } else if (att.type === 'audio') {
                attachmentHtml = '<div class="note-attachment"><audio controls src="' + att.url + '"></audio></div>';
            } else {
                attachmentHtml = '<div class="note-attachment"><a href="' + att.url + '" target="_blank" class="note-attachment-doc"><svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg><span>' + att.filename + '</span></a></div>';
            }
        }

        return '<div class="note-bubble ' + (isSent ? 'sent' : 'received') + '">' +
            (!isSent ? '<div class="note-author">' + note.author + '</div>' : '') +
            (note.content ? '<div class="note-content">' + note.content + '</div>' : '') +
            attachmentHtml +
            '<div class="note-time">' + formatTime(note.date) + '</div>' +
        '</div>';
    }).join('');
}

function renderReferralList() {
    const container = document.getElementById('referralListItems');
    if (state.referrals.length === 0) {
        container.innerHTML = '<div style="color:var(--grey-500);font-size:13px;">No referrals yet</div>';
        return;
    }
    container.innerHTML = state.referrals.map(ref => 
        '<div class="referral-item">' +
            '<div class="referral-item-company">' + ref.companyReferred + '</div>' +
            '<div class="referral-item-email">' + ref.emailAddress + '</div>' +
            '<div class="referral-item-date">' + formatDate(ref._createdDate) + '</div>' +
        '</div>'
    ).join('');
}

// ==========================================
// ACTIONS
// ==========================================
function selectTicket(id) {
    const ticket = state.tickets.find(t => t._id === id);
    if (ticket) {
        state.selectedTicket = ticket;
        clearNotificationsForTicket(id);
        renderTickets();
        renderTicketDetail(ticket);
    }
}

function closeDetail() {
    document.getElementById('ticketDetailPanel').classList.remove('active');
}

function sendNote(ticketId) {
    const input = document.getElementById('noteInput');
    const content = input.value.trim();

    if (!content && !state.pendingAttachment) return;

    const noteData = { action: 'addNote', ticketId: ticketId, content: content, ticket: state.selectedTicket };
    if (state.pendingAttachment) {
        noteData.attachment = state.pendingAttachment;
    }

    window.parent.postMessage(noteData, '*');
    input.value = '';
    state.pendingAttachment = null;
    updatePendingAttachmentUI();
}

function updateStatus(ticketId, status) {
    window.parent.postMessage({ action: 'updateStatus', ticketId: ticketId, status: status }, '*');
}

function deleteTicket(ticketId) {
    if (confirm('Are you sure you want to delete this ticket?')) {
        window.parent.postMessage({ action: 'deleteTicket', ticketId: ticketId }, '*');
    }
}

function changeTicketType(ticketId, newType) {
    window.parent.postMessage({ action: 'updateTicketType', ticketId: ticketId, ticketType: newType }, '*');
}

function saveProjectValue(ticketId) {
    const input = document.getElementById('projectValueInput');
    const value = parseFloat(input.value) || 0;
    window.parent.postMessage({ action: 'updateProjectValue', ticketId: ticketId, value: value }, '*');
}

// ==========================================
// MODAL FUNCTIONS
// ==========================================
function openModal() {
    document.getElementById('newTicketModal').classList.add('active');
    resetForm();
}

function closeModal() {
    document.getElementById('newTicketModal').classList.remove('active');
}

function openReferralModal() {
    document.getElementById('referralModal').classList.add('active');
}

function closeReferralModal() {
    document.getElementById('referralModal').classList.remove('active');
    document.getElementById('referralForm').reset();
}

function openImageModal(url) {
    document.getElementById('imageModalImg').src = url;
    document.getElementById('imageModal').classList.add('active');
}

function closeImageModal() {
    document.getElementById('imageModal').classList.remove('active');
}

function resetForm() {
    document.getElementById('ticketForm').reset();
    state.selectedCategory = null;
    state.selectedPriority = 'medium';
    state.selectedImpact = 'moderate';
    state.selectedTicketType = 'support';

    document.querySelectorAll('.category-card').forEach(c => c.classList.remove('selected'));
    document.querySelectorAll('.priority-option').forEach(p => p.classList.remove('selected'));
    document.querySelectorAll('.impact-option').forEach(i => i.classList.remove('selected'));
    document.querySelectorAll('.type-option').forEach(t => t.classList.remove('selected'));

    document.querySelector('.priority-option.medium').classList.add('selected');
    document.querySelector('.impact-option.moderate').classList.add('selected');
    document.querySelector('.type-option[data-type="support"]').classList.add('selected');

    document.getElementById('customCategoryGroup').style.display = 'none';
    document.getElementById('categoryFormGroup').style.display = 'block';
    
    // Clear validation states
    document.getElementById('ticketSubject').classList.remove('invalid');
    document.getElementById('ticketDescription').classList.remove('invalid');
    document.getElementById('subjectError').style.display = 'none';
    document.getElementById('descriptionError').style.display = 'none';
    document.getElementById('submitTicket').classList.remove('loading');
}

function submitTicket() {
    const ticketType = state.selectedTicketType;
    const subject = document.getElementById('ticketSubject').value.trim();
    const description = document.getElementById('ticketDescription').value.trim();
    const subjectInput = document.getElementById('ticketSubject');
    const descriptionInput = document.getElementById('ticketDescription');
    const subjectError = document.getElementById('subjectError');
    const descriptionError = document.getElementById('descriptionError');
    const submitBtn = document.getElementById('submitTicket');
    
    // Clear previous validation states
    subjectInput.classList.remove('invalid');
    descriptionInput.classList.remove('invalid');
    subjectError.style.display = 'none';
    descriptionError.style.display = 'none';
    
    let hasError = false;
    
    if (subject.length < 5) {
        subjectInput.classList.add('invalid');
        subjectError.style.display = 'block';
        hasError = true;
    }
    if (description.length < 10) {
        descriptionInput.classList.add('invalid');
        descriptionError.style.display = 'block';
        hasError = true;
    }
    
    if (hasError) {
        showToast('Please fill in the required fields', 'error');
        return;
    }
    
    // Show loader
    submitBtn.classList.add('loading');

    window.parent.postMessage({
        action: 'createTicket',
        ticketType: ticketType,
        category: ticketType === 'support' ? (state.selectedCategory || 'general') : ticketType,
        customCategory: document.getElementById('customCategory').value.trim(),
        subject: subject,
        description: description,
        priority: state.selectedPriority,
        businessImpact: state.selectedImpact
    }, '*');
}

function submitReferral(e) {
    e.preventDefault();
    const companyReferred = document.getElementById('referralCompany').value.trim();
    const emailAddress = document.getElementById('referralEmail').value.trim();
    const phone = document.getElementById('referralPhone').value.trim();
    const comment = document.getElementById('referralComment').value.trim();

    if (!companyReferred) {
        showToast('Company name is required', 'error');
        return;
    }
    if (!emailAddress) {
        showToast('Email is required', 'error');
        return;
    }

    window.parent.postMessage({ action: 'addReferral', companyReferred: companyReferred, emailAddress: emailAddress, phone: phone, comment: comment }, '*');
}

// ==========================================
// UTILITIES
// ==========================================
function updateStats() {
    const total = state.tickets.length;
    const open = state.tickets.filter(t => t.status === 'open').length;
    const inProgress = state.tickets.filter(t => t.status === 'in-progress').length;
    const resolved = state.tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;

    document.getElementById('totalTickets').textContent = total;
    document.getElementById('openTickets').textContent = open;
    document.getElementById('inProgressTickets').textContent = inProgress;
    document.getElementById('resolvedTickets').textContent = resolved;
}

function updateTypeCounts() {
    const all = state.tickets.length;
    const support = state.tickets.filter(t => (t.ticketType || 'support') === 'support').length;
    const bug = state.tickets.filter(t => t.ticketType === 'bug').length;
    const project = state.tickets.filter(t => t.ticketType === 'project').length;

    document.getElementById('allTypeCount').textContent = all;
    document.getElementById('supportTypeCount').textContent = support;
    document.getElementById('bugTypeCount').textContent = bug;
    document.getElementById('projectTypeCount').textContent = project;
}

function populateFilters() {
    if (state.isAdmin) {
        const userFilter = document.getElementById('userFilter');
        userFilter.innerHTML = '<option value="">All Users</option>' + 
            state.users.map(u => '<option value="' + u.email + '">' + (u.name || u.email) + ' (' + u.ticketCount + ')</option>').join('');

        const companyFilter = document.getElementById('companyFilter');
        companyFilter.innerHTML = '<option value="">All Companies</option>' + 
            state.companies.map(c => '<option value="' + c.domain + '">' + c.companyName + ' (' + c.ticketCount + ')</option>').join('');
    }
}

function updatePendingAttachmentUI() {
    const container = document.getElementById('pendingAttachmentContainer');
    if (!container) return;

    if (!state.pendingAttachment) {
        container.innerHTML = '';
        return;
    }

    const att = state.pendingAttachment;
    let preview = '';
    if (att.type === 'image') {
        preview = '<img src="' + att.url + '" class="pending-attachment-preview" alt="Preview">';
    } else {
        preview = '<div class="pending-attachment-icon"><svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg></div>';
    }

    container.innerHTML = '<div class="pending-attachment">' + preview +
        '<div class="pending-attachment-info">' +
            '<div class="pending-attachment-name">' + att.filename + '</div>' +
            '<div class="pending-attachment-type">' + att.type + '</div>' +
        '</div>' +
        '<button class="pending-attachment-remove" onclick="removePendingAttachment()">' +
            '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>' +
        '</button>' +
    '</div>';
}

function removePendingAttachment() {
    state.pendingAttachment = null;
    updatePendingAttachmentUI();
}

function scrollNotesToBottom() {
    const container = document.getElementById('notesContainer');
    if (container) container.scrollTop = container.scrollHeight;
}

function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return diffMins + 'm ago';
    if (diffHours < 24) return diffHours + 'h ago';
    if (diffDays < 7) return diffDays + 'd ago';
    return d.toLocaleDateString();
}

function formatTime(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatStatus(status) {
    const map = {
        'open': 'Open',
        'in-progress': 'In Progress',
        'awaiting-response': 'Awaiting Response',
        'resolved': 'Resolved',
        'closed': 'Closed'
    };
    return map[status] || status;
}

function formatCategory(category) {
    const map = {
        'domains': 'Domains & Account',
        'billing': 'Plans & Billing',
        'payments': 'Payments',
        'marketing': 'Marketing & SEO',
        'stores': 'Wix Stores',
        'memberships': 'Memberships & Events',
        'velo': 'Velo & CMS',
        'content': 'Content / Design',
        'other': 'Custom',
        'bug': 'Bug Report',
        'project': 'Project'
    };
    return map[category] || category;
}

function showToast(message, type) {
    type = type || 'success';
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    toast.className = 'toast show ' + type;
    toastMessage.textContent = message;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function showAccessDenied(message) {
    document.getElementById('loadingOverlay').classList.add('hidden');
    document.getElementById('statsBar').style.display = 'none';
    document.getElementById('ticketTypeTabs').style.display = 'none';
    document.getElementById('statusTabs').style.display = 'none';
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('accessDenied').style.display = 'block';
    document.getElementById('accessDeniedMessage').textContent = message;
}

// In openModal() function, add:
function openModal() {
    document.getElementById('newTicketModal').classList.add('active');
    resetForm();
    window.scrollTo(0, 0);  // Scroll to top
    window.parent.postMessage({ action: 'modalOpened', modal: 'newTicket' }, '*');
}

// In openReferralModal() function, add:
function openReferralModal() {
    document.getElementById('referralModal').classList.add('active');
    window.scrollTo(0, 0);  // Scroll to top
    window.parent.postMessage({ action: 'modalOpened', modal: 'referral' }, '*');
}

// In openImageModal() function, add:
function openImageModal(url) {
    document.getElementById('imageModalImg').src = url;
    document.getElementById('imageModal').classList.add('active');
    window.scrollTo(0, 0);  // Scroll to top
    window.parent.postMessage({ action: 'modalOpened', modal: 'image' }, '*');
}

// ==========================================
// EVENT LISTENERS
// ==========================================
function initEventListeners() {
    document.getElementById('newTicketBtn').addEventListener('click', openModal);
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('cancelTicket').addEventListener('click', closeModal);
    document.getElementById('submitTicket').addEventListener('click', submitTicket);
    document.getElementById('pacmanBtn').addEventListener('click', () => window.parent.postMessage({ action: 'pacman' }, '*'));
    document.getElementById('referralBtn').addEventListener('click', openReferralModal);
    document.getElementById('closeReferralModal').addEventListener('click', closeReferralModal);
    document.getElementById('referralForm').addEventListener('submit', submitReferral);
    document.getElementById('imageModal').addEventListener('click', closeImageModal);

    document.getElementById('saveProfileBtn').addEventListener('click', () => {
        const name = document.getElementById('profileNameInput').value.trim();
        const companyName = document.getElementById('profileCompanyInput').value.trim();
        if (!name || !companyName) {
            showToast('Please fill in both fields', 'error');
            return;
        }
        window.parent.postMessage({ action: 'saveProfile', name: name, companyName: companyName }, '*');
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        renderTickets();
    });

    document.getElementById('priorityFilter').addEventListener('change', (e) => {
        state.priorityFilter = e.target.value;
        renderTickets();
    });

    document.getElementById('userFilter').addEventListener('change', (e) => {
        state.userFilter = e.target.value;
        renderTickets();
    });

    document.getElementById('companyFilter').addEventListener('change', (e) => {
        state.companyFilter = e.target.value;
        renderTickets();
    });

    // Status tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.currentStatusFilter = tab.dataset.tab;
            renderTickets();
        });
    });

    // Type tabs
    document.querySelectorAll('.ticket-type-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.ticket-type-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.currentTypeFilter = tab.dataset.type;
            renderTickets();
        });
    });

    // Type selector in form
    document.querySelectorAll('.type-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.type-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            state.selectedTicketType = option.dataset.type;

            if (option.dataset.type === 'support') {
                document.getElementById('categoryFormGroup').style.display = 'block';
            } else {
                document.getElementById('categoryFormGroup').style.display = 'none';
                document.getElementById('customCategoryGroup').style.display = 'none';
            }
        });
    });

    // Category cards
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.category-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            state.selectedCategory = card.dataset.category;
            // No longer show custom category input - subject field is sufficient
        });
        });
    });

    // Priority options
    document.querySelectorAll('.priority-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.priority-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            state.selectedPriority = option.dataset.priority;
        });
    });

    // Impact options
    document.querySelectorAll('.impact-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.impact-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            state.selectedImpact = option.dataset.impact;
        });
    });

    // Modal close on overlay click
    document.getElementById('newTicketModal').addEventListener('click', (e) => {
        if (e.target.id === 'newTicketModal') closeModal();
    });

    document.getElementById('referralModal').addEventListener('click', (e) => {
        if (e.target.id === 'referralModal') closeReferralModal();
    });
}

    </script>
</body>
</html>
