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
    taskHistory: [],
    notificationCount: 0,
    unreadNotes: {},
    notifications: []
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
        case 'error': 
            showToast(data.message, 'error'); 
            document.getElementById('submitTicket').classList.remove('loading');
            break;
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
        case 'setTaskHistory': handleSetTaskHistory(data); break;
        case 'referralAdded': showToast('Referral submitted! +' + data.tasksAdded + ' tasks added', 'success'); break;
        case 'ticketTypeUpdated': handleTicketTypeUpdated(data); break;
        case 'projectValueUpdated': handleProjectValueUpdated(data); break;
        case 'internalNotesUpdated': handleInternalNotesUpdated(data); break;
        case 'statusNoteDeleted': handleStatusNoteDeleted(data); break;
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
    document.getElementById('accountUserName').textContent = data.user.name || data.user.email;

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
        
        // Monthly usage display
        var tasksPerMonth = contract.tasksPerMonth || 0;
        var usedThisMonth = contract.usedThisMonth || 0;
        document.getElementById('usedThisMonth').textContent = usedThisMonth;
        document.getElementById('monthlyLimit').textContent = tasksPerMonth;
        
        var pct = tasksPerMonth > 0 ? Math.min((usedThisMonth / tasksPerMonth) * 100, 100) : 0;
        var fill = document.getElementById('monthlyProgressFill');
        fill.style.width = pct + '%';
        fill.className = 'monthly-progress-fill';
        if (pct >= 100) fill.classList.add('danger');
        else if (pct >= 80) fill.classList.add('warning');
        
        // Show/hide monthly bar
        document.getElementById('contractMonthly').style.display = tasksPerMonth > 0 ? 'flex' : 'none';
        
        banner.classList.add('visible');
        
        // Check if no tasks remaining — show warning if present
        var warningEl = document.getElementById('noTasksWarning');
        if (warningEl) {
            warningEl.style.display = (contract.adjustedTasks <= 0) ? 'flex' : 'none';
        }
    } else {
        banner.classList.remove('visible');
    }
}

function handleSetReferrals(data) {
    state.referrals = data.referrals || [];
    state.referralCount = data.count || 0;
}

function handleSetTaskHistory(data) {
    state.taskHistory = data.taskHistory || [];
    renderTaskHistory();
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
        if (data.purchaseOrderReceived !== undefined) {
            ticket.purchaseOrderReceived = data.purchaseOrderReceived;
        }
        if (data.opportunityCategory !== undefined) {
            ticket.opportunityCategory = data.opportunityCategory;
            ticket.opportunityCategoryColour = data.opportunityCategoryColour || '';
        }
        renderTickets();
        if (state.selectedTicket && state.selectedTicket._id === data.ticketId) {
            state.selectedTicket = ticket;
            renderTicketDetail(ticket);
        }
    }
    showToast('Project value updated to £' + data.projectValue + (data.purchaseOrderReceived ? ' (PO received)' : ''), 'success');
}

function handleInternalNotesUpdated(data) {
    const ticket = state.tickets.find(t => t._id === data.ticketId);
    if (ticket) {
        ticket.internalNotes = data.internalNotes;
        if (state.selectedTicket && state.selectedTicket._id === data.ticketId) {
            state.selectedTicket = ticket;
            // Re-render the status notes list
            const notesList = document.getElementById('statusNotesList');
            if (notesList) {
                notesList.innerHTML = renderStatusNotes(data.internalNotes, state.isAdmin);
            }
        }
    }
    // Remove loader and clear input
    const saveBtn = document.getElementById('saveInternalNotes');
    if (saveBtn) saveBtn.classList.remove('loading');
    const input = document.getElementById('internalNotesInput');
    if (input) input.value = '';
    
    showToast('Status note saved', 'success');
}

function handleStatusNoteDeleted(data) {
    const ticket = state.tickets.find(t => t._id === data.ticketId);
    if (ticket) {
        ticket.internalNotes = data.internalNotes;
        if (state.selectedTicket && state.selectedTicket._id === data.ticketId) {
            state.selectedTicket = ticket;
            const notesList = document.getElementById('statusNotesList');
            if (notesList) {
                notesList.innerHTML = renderStatusNotes(data.internalNotes, state.isAdmin);
            }
        }
    }
    showToast('Status note deleted', 'success');
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
                incrementNotifications(data.ticketId, data.note);
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
function incrementNotifications(ticketId, noteData) {
    if (!state.unreadNotes[ticketId]) state.unreadNotes[ticketId] = 0;
    state.unreadNotes[ticketId]++;
    
    // Find ticket info
    const ticket = state.tickets.find(t => t._id === ticketId);
    
    // Add to notifications array
    state.notifications.unshift({
        ticketId: ticketId,
        ticketNumber: ticket ? ticket.ticketNumber : 'Unknown',
        ticketSubject: ticket ? ticket.subject : 'Unknown Ticket',
        author: noteData ? noteData.author : 'Support Team',
        message: noteData ? (noteData.content || 'Sent an attachment') : 'New message',
        date: new Date().toISOString()
    });
    
    updateNotificationBadge();
    renderNotificationPopup();
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
        // Remove notifications for this ticket
        state.notifications = state.notifications.filter(n => n.ticketId !== ticketId);
        updateNotificationBadge();
        renderNotificationPopup();
    }
}

function toggleNotificationPopup(e) {
    e.preventDefault();
    e.stopPropagation();
    const popup = document.getElementById('notificationPopup');
    const wrapper = popup.parentElement;
    popup.classList.toggle('active');
    wrapper.classList.toggle('mobile-open', popup.classList.contains('active'));
    console.log('Notification popup toggled:', popup.classList.contains('active'));
}

function closeNotificationPopup() {
    document.getElementById('notificationPopup').classList.remove('active');
    document.querySelector('.notification-wrapper').classList.remove('mobile-open');
}

function renderNotificationPopup() {
    const container = document.getElementById('notificationList');
    if (!container) return;
    
    if (state.notifications.length === 0) {
        container.innerHTML = '<div class="notification-empty">No new notifications</div>';
        return;
    }
    
    container.innerHTML = state.notifications.map((notif, index) => 
        '<div class="notification-item" data-ticket-id="' + notif.ticketId + '" data-index="' + index + '">' +
            '<div class="notification-item-header">' +
                '<span class="notification-ticket">#' + formatTicketNumber(notif.ticketNumber) + '</span>' +
                '<span class="notification-time">' + formatFullDateTime(notif.date) + '</span>' +
            '</div>' +
            '<div class="notification-subject">' + notif.ticketSubject + '</div>' +
            '<div class="notification-message"><strong>' + notif.author + ':</strong> ' + truncateText(notif.message, 50) + '</div>' +
        '</div>'
    ).join('');
    
    // Add click handlers
    container.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', () => {
            const ticketId = item.dataset.ticketId;
            selectTicket(ticketId);
            closeNotificationPopup();
        });
    });
}

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function clearAllNotifications() {
    state.notifications = [];
    state.unreadNotes = {};
    updateNotificationBadge();
    renderNotificationPopup();
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
                '<div class="ticket-number-block">' +
                    '<span class="ticket-number">#' + formatTicketNumber(ticket.ticketNumber) + (unread > 0 ? ' <span style="color:#f44336;font-weight:bold;">(' + unread + ' new)</span>' : '') + '</span>' +
                    '<span class="ticket-datetime">' + formatFullDateTime(ticket._createdDate) + '</span>' +
                '</div>' +
                '<span class="ticket-status ' + ticket.status + '">' + formatStatus(ticket.status) + '</span>' +
            '</div>' +
            '<div class="ticket-subject">' + ticket.subject + '<span class="ticket-type-badge type-' + ticketType + '">' + typeLabel + '</span></div>' +
            (ticketType === 'project' && ticket.projectValue ? '<div class="project-value-display">£' + ticket.projectValue.toLocaleString() + '</div>' : '') +
            (ticketType === 'referral' && ticket.projectValue && state.isAdmin ? '<div class="project-value-display" style="color:var(--type-referral);">£' + ticket.projectValue.toLocaleString() + '</div>' : '') +
            (ticketType === 'referral' && ticket.opportunityCategory && !state.isAdmin ? '<div class="project-value-display">' + renderOpportunityBadge(ticket) + '</div>' : '') +
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
    const isLocked = (ticket.status === 'resolved' || ticket.status === 'closed') && !state.isAdmin;

    let adminTypeSection = '';
    if (state.isAdmin) {
        adminTypeSection = '<div class="admin-type-section visible">' +
            '<h4>Change Ticket Type</h4>' +
            '<div class="admin-type-selector">' +
                '<button class="admin-type-btn ' + (ticketType === 'support' ? 'active' : '') + '" data-type="support" onclick="changeTicketType(\'' + ticket._id + '\', \'support\')">Support</button>' +
                '<button class="admin-type-btn ' + (ticketType === 'bug' ? 'active' : '') + '" data-type="bug" onclick="changeTicketType(\'' + ticket._id + '\', \'bug\')">Bug</button>' +
                '<button class="admin-type-btn ' + (ticketType === 'project' ? 'active' : '') + '" data-type="project" onclick="changeTicketType(\'' + ticket._id + '\', \'project\')">Project</button>' +
                '<button class="admin-type-btn ' + (ticketType === 'referral' ? 'active' : '') + '" data-type="referral" onclick="changeTicketType(\'' + ticket._id + '\', \'referral\')">Referral</button>' +
            '</div>' +
            '<div class="project-value-section ' + (ticketType === 'project' || ticketType === 'referral' ? 'visible' : '') + '">' +
                '<div class="project-value-label">Project Value</div>' +
                '<div class="project-value-input-wrapper">' +
                    '<span class="project-value-prefix">£</span>' +
                    '<input type="number" class="project-value-input" id="projectValueInput" value="' + (ticket.projectValue || 0) + '" min="0" step="100">' +
                '</div>' +
                '<label class="po-checkbox-wrapper">' +
                    '<input type="checkbox" class="po-checkbox" id="poReceivedCheckbox" ' + (ticket.purchaseOrderReceived ? 'checked' : '') + '>' +
                    '<span class="po-checkbox-text">Purchase Order Received</span>' +
                '</label>' +
                '<button class="project-value-save-btn project-value-save-full" onclick="saveProjectValue(\'' + ticket._id + '\')">Save</button>' +
                (ticketType === 'referral' ? '<div class="project-value-info">Every £1,000 = 1 extra task (capped at £5,000). Tasks allocated when PO received.</div>' : '<div class="project-value-info">Every £1,000 = 5 extra tasks. Tasks allocated when PO received.</div>') +
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
                (isLocked ? '<span class="ticket-locked-badge" title="This ticket is resolved and read-only"><svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg></span>' : '') +
            '</div>' +
        '</div>' +
        '<div class="detail-section"><h3 class="detail-section-title">Description</h3><div class="detail-description">' + ticket.description + '</div></div>' +
        '<div class="detail-section"><h3 class="detail-section-title">Details</h3>' +
            '<div class="detail-info-grid">' +
                '<div class="detail-info-item"><div class="detail-info-label">Ticket Number</div><div class="detail-info-value">#' + formatTicketNumber(ticket.ticketNumber) + '</div></div>' +
                '<div class="detail-info-item"><div class="detail-info-label">Status</div><div class="detail-info-value"><span class="ticket-status ' + ticket.status + '">' + formatStatus(ticket.status) + '</span></div></div>' +
                '<div class="detail-info-item"><div class="detail-info-label">Priority</div><div class="detail-info-value"><span class="ticket-priority"><span class="priority-dot ' + ticket.priority + '"></span> ' + ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1) + '</span></div></div>' +
                '<div class="detail-info-item"><div class="detail-info-label">Category</div><div class="detail-info-value">' + (ticket.customCategory || formatCategory(ticket.category)) + '</div></div>' +
                '<div class="detail-info-item"><div class="detail-info-label">Business Impact</div><div class="detail-info-value">' + ((ticket.businessImpact || 'moderate').charAt(0).toUpperCase() + (ticket.businessImpact || 'moderate').slice(1)) + '</div></div>' +
                (ticketType === 'project' && ticket.projectValue ? '<div class="detail-info-item"><div class="detail-info-label">Project Value</div><div class="detail-info-value" style="color:var(--type-project);font-weight:600;">£' + ticket.projectValue.toLocaleString() + '</div></div>' : '') +
                (ticketType === 'referral' && ticket.projectValue && state.isAdmin ? '<div class="detail-info-item"><div class="detail-info-label">Project Value</div><div class="detail-info-value" style="color:var(--type-referral);font-weight:600;">£' + ticket.projectValue.toLocaleString() + '</div></div>' : '') +
                (ticketType === 'referral' && ticket.opportunityCategory && !state.isAdmin ? '<div class="detail-info-item"><div class="detail-info-label">Opportunity</div><div class="detail-info-value">' + renderOpportunityBadge(ticket) + '</div></div>' : '') +
                ((ticketType === 'project' || ticketType === 'referral') && ticket.projectValue && state.isAdmin ? '<div class="detail-info-item"><div class="detail-info-label">PO Status</div><div class="detail-info-value"><span class="po-status-badge ' + (ticket.purchaseOrderReceived ? 'received' : 'pending') + '">' + (ticket.purchaseOrderReceived ? '✓ PO Received' : '⏳ Awaiting PO') + '</span></div></div>' : '') +
                (ticketType === 'referral' && ticket.companyReferred ? '<div class="detail-info-item"><div class="detail-info-label">Company Referred</div><div class="detail-info-value">' + ticket.companyReferred + '</div></div>' : '') +
                (ticketType === 'referral' && ticket.referralEmail ? '<div class="detail-info-item"><div class="detail-info-label">Referral Contact</div><div class="detail-info-value">' + ticket.referralEmail + '</div></div>' : '') +
            '</div>' +
        '</div>' +
        (state.isAdmin ? '<div class="detail-section"><h3 class="detail-section-title">Update Status</h3>' +
            '<div class="status-actions">' +
                ['open', 'in-progress', 'awaiting-response', 'resolved', 'closed'].map(s => '<button class="status-btn ' + (ticket.status === s ? 'active' : '') + '" data-status="' + s + '">' + formatStatus(s) + '</button>').join('') +
            '</div>' + adminTypeSection + '</div>' +
            '<div class="detail-section"><button class="btn btn-danger" onclick="deleteTicket(\'' + ticket._id + '\')">' +
                '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>Delete Ticket</button></div>' : '') +
        '<div class="detail-section status-notes-section">' +
            '<h3 class="detail-section-title">Status Notes</h3>' +
            '<div class="status-notes-list" id="statusNotesList">' + renderStatusNotes(ticket.internalNotes, state.isAdmin) + '</div>' +
            (state.isAdmin ? '<div class="internal-notes-input-wrapper">' +
                '<textarea class="internal-notes-textarea" id="internalNotesInput" placeholder="Add a new status note..."></textarea>' +
                '<button class="btn btn-primary" id="saveInternalNotes" onclick="addStatusNote(\'' + ticket._id + '\')">' +
                    '<span class="btn-text">Add Note</span>' +
                    '<span class="btn-loader" style="display: none;"></span>' +
                '</button>' +
            '</div>' : '') +
        '</div>' +
        '<div class="notes-section"><h3 class="detail-section-title">Messages</h3>' +
            '<div class="notes-container" id="notesContainer">' + renderNotes(ticket.notes || []) + '</div>' +
            (isLocked ? '<div class="ticket-locked-banner"><svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg><span>This ticket has been resolved</span></div>' :
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
            '</div>') +
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

    const attachBtn = document.getElementById('attachBtn');
    const sendNoteBtn = document.getElementById('sendNoteBtn');
    const noteInput = document.getElementById('noteInput');
    
    if (attachBtn) {
        attachBtn.addEventListener('click', () => {
            window.parent.postMessage({ action: 'requestUpload' }, '*');
        });
    }

    if (sendNoteBtn) {
        sendNoteBtn.addEventListener('click', () => sendNote(ticket._id));
    }
    
    if (noteInput) {
        noteInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendNote(ticket._id);
            }
        });
    }

    updatePendingAttachmentUI();
    scrollNotesToBottom();
    initMediaPlayers();
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
            // Detect actual type — fallback from URL if type is wrong
            var mediaType = att.type || 'document';
            if (att.url && att.url.indexOf('video.wixstatic.com') !== -1) mediaType = 'video';
            if (mediaType === 'image' && att.filename) {
                var ext = att.filename.split('.').pop().toLowerCase();
                if (['mp4','webm','mov','avi','mkv','m4v'].indexOf(ext) !== -1) mediaType = 'video';
                if (['mp3','wav','ogg','aac','m4a','flac','wma'].indexOf(ext) !== -1) mediaType = 'audio';
            }
            
            var pid = 'player-' + (note.id || Math.random().toString(36).slice(2));
            
            if (mediaType === 'image') {
                attachmentHtml = '<div class="note-attachment"><img src="' + att.url + '" alt="' + att.filename + '" onclick="openImageModal(\'' + att.url + '\')"></div>';
            } else if (mediaType === 'video') {
                attachmentHtml = '<div class="note-attachment"><div class="media-player video-player" id="' + pid + '">' +
                    '<div class="video-wrapper">' +
                        '<video preload="metadata" playsinline>' +
                            '<source src="' + att.url + '" type="video/mp4">' +
                        '</video>' +
                        '<div class="video-play-overlay" onclick="toggleMediaPlay(\'' + pid + '\')">' +
                            '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>' +
                        '</div>' +
                    '</div>' +
                    '<div class="media-controls">' +
                        '<button class="media-btn play-btn" onclick="toggleMediaPlay(\'' + pid + '\')">' +
                            '<svg class="icon-play" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>' +
                            '<svg class="icon-pause" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>' +
                        '</button>' +
                        '<div class="media-progress" onclick="seekMedia(event, \'' + pid + '\')">' +
                            '<div class="media-progress-fill"></div>' +
                        '</div>' +
                        '<span class="media-time">0:00 / 0:00</span>' +
                        '<button class="media-btn fullscreen-btn" onclick="toggleFullscreen(\'' + pid + '\')">' +
                            '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>' +
                        '</button>' +
                    '</div>' +
                    '<div class="media-filename">' + (att.filename || 'Video') + '</div>' +
                '</div></div>';
            } else if (mediaType === 'audio') {
                attachmentHtml = '<div class="note-attachment"><div class="media-player audio-player" id="' + pid + '" data-audio-url="' + att.url + '">' +
                    '<div class="media-controls">' +
                        '<button class="media-btn play-btn" onclick="toggleMediaPlay(\'' + pid + '\')">' +
                            '<svg class="icon-play" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>' +
                            '<svg class="icon-pause" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>' +
                        '</button>' +
                        '<div class="media-progress" onclick="seekMedia(event, \'' + pid + '\')">' +
                            '<div class="media-progress-fill"></div>' +
                        '</div>' +
                        '<span class="media-time">0:00 / 0:00</span>' +
                        '<button class="media-btn volume-btn" onclick="toggleMute(\'' + pid + '\')">' +
                            '<svg class="icon-vol-on" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>' +
                            '<svg class="icon-vol-off" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>' +
                        '</button>' +
                    '</div>' +
                    '<div class="media-filename"><svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:currentColor;"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg> ' + (att.filename || 'Audio') + '</div>' +
                '</div></div>';
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
    // Legacy - referrals now shown as ticket type
}

// ==========================================
// RULES POPUP
// ==========================================
function openRulesPopup() {
    const contract = state.contract;
    if (!contract) return;

    const maxTasksPerMonth = Math.round(contract.tasksPerMonth || Math.floor((contract.baseTasks || 0) / 12));
    const body = document.getElementById('rulesPopupBody');

    const hoursPerMonth = Math.round(maxTasksPerMonth * 2.4 * 10) / 10;

    body.innerHTML = '<div class="rules-highlight-row">' +
            '<div class="rules-highlight">' +
                '<div class="rules-highlight-number">' + maxTasksPerMonth + '</div>' +
                '<div class="rules-highlight-label">Max tasks per calendar month</div>' +
            '</div>' +
            '<div class="rules-highlight">' +
                '<div class="rules-highlight-number">' + hoursPerMonth + '</div>' +
                '<div class="rules-highlight-label">Max hours per calendar month</div>' +
            '</div>' +
        '</div>' +
        '<ul class="rules-list">' +
            '<li><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' +
                '<span>All tasks requested must fit within the <strong>' + hoursPerMonth + '-hour limit</strong>.</span></li>' +
            '<li><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' +
                '<span>Tasks or hours unused within a calendar month <strong>do not accumulate or roll over</strong> to the subsequent month.</span></li>' +
            '<li><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' +
                '<span>Average task duration: <strong>2.4 hours</strong></span></li>' +
            '<li><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' +
                '<span>Earn extra tasks by referring businesses — qualified referrals with a purchase order <strong>add bonus tasks</strong> based on project size.</span></li>' +
        '</ul>';

    document.getElementById('rulesPopup').classList.add('active');
}

function closeRulesPopup() {
    document.getElementById('rulesPopup').classList.remove('active');
}

// ==========================================
// TASK HISTORY POPUP
// ==========================================
function openTaskHistoryPopup() {
    document.getElementById('taskHistoryPopup').classList.add('active');
    document.getElementById('taskHistoryPopupBody').innerHTML = '<div style="text-align:center;padding:40px;color:var(--grey-500);">Loading task history...</div>';
    window.parent.postMessage({ action: 'getTaskHistory' }, '*');
}

function closeTaskHistoryPopup() {
    document.getElementById('taskHistoryPopup').classList.remove('active');
}

function renderTaskHistory() {
    const container = document.getElementById('taskHistoryPopupBody');
    const history = state.taskHistory;

    if (!history || history.length === 0) {
        container.innerHTML = '<div class="task-history-empty">No task history found</div>';
        return;
    }

    // Summary stats
    const totalTasks = history.length;
    const totalValue = history.reduce(function(sum, h) { return sum + (h.taskValue || 0); }, 0);
    const support = history.filter(function(h) { return h.taskType === 'SUPPORT'; }).length;
    const bugs = history.filter(function(h) { return h.taskType === 'BUG'; }).length;
    const projects = history.filter(function(h) { return h.taskType === 'PROJECT'; }).length;
    const referrals = history.filter(function(h) { return h.taskType === 'REFERRAL'; }).length;

    var html = '<div class="task-history-summary">' +
        '<div class="task-history-stat"><div class="task-history-stat-value">' + totalTasks + '</div><div class="task-history-stat-label">Total Entries</div></div>' +
        '<div class="task-history-stat"><div class="task-history-stat-value">' + totalValue.toFixed(1) + '</div><div class="task-history-stat-label">Net Task Value</div></div>' +
        '<div class="task-history-stat"><div class="task-history-stat-value">' + support + '</div><div class="task-history-stat-label">Support</div></div>' +
        '<div class="task-history-stat"><div class="task-history-stat-value">' + bugs + '</div><div class="task-history-stat-label">Bugs</div></div>' +
        '<div class="task-history-stat"><div class="task-history-stat-value">' + projects + '</div><div class="task-history-stat-label">Projects</div></div>' +
        '<div class="task-history-stat"><div class="task-history-stat-value">' + referrals + '</div><div class="task-history-stat-label">Referrals</div></div>' +
    '</div>';

    html += '<table class="task-history-table"><thead><tr>' +
        '<th>Date</th><th>Type</th><th>Ticket</th><th>Description</th><th>Task Value</th>' +
    '</tr></thead><tbody>';

    history.forEach(function(item) {
        var valueDisplay = item.taskValue || 0;
        var valueStyle = 'font-weight:600;text-align:center;';
        if (valueDisplay < 0) valueStyle += 'color:#c62828;';
        else if (valueDisplay > 0) valueStyle += 'color:#2e7d32;';
        
        html += '<tr>' +
            '<td>' + formatFullDateTime(item.taskCreatedDate) + '</td>' +
            '<td><span class="task-history-type-badge ' + (item.taskType || '') + '">' + (item.taskType || '-') + '</span></td>' +
            '<td>' + (item.ticketNumber ? '#' + formatTicketNumber(item.ticketNumber) : '-') + '</td>' +
            '<td>' + (item.description || '-') + '</td>' +
            '<td style="' + valueStyle + '">' + (valueDisplay > 0 ? '+' : '') + valueDisplay + '</td>' +
        '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
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
        
        // Scroll the ticket into view in the list
        setTimeout(() => {
            const ticketElement = document.querySelector('.ticket-item[data-id="' + id + '"]');
            if (ticketElement) {
                ticketElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 50);
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
    const poCheckbox = document.getElementById('poReceivedCheckbox');
    const purchaseOrderReceived = poCheckbox ? poCheckbox.checked : false;
    var saveBtn = document.querySelector('.project-value-save-full');
    if (saveBtn) saveBtn.classList.add('loading');
    window.parent.postMessage({ action: 'updateProjectValue', ticketId: ticketId, value: value, purchaseOrderReceived: purchaseOrderReceived }, '*');
}

function addStatusNote(ticketId) {
    const input = document.getElementById('internalNotesInput');
    const saveBtn = document.getElementById('saveInternalNotes');
    const content = input.value.trim();
    
    if (!content) {
        showToast('Please enter a note', 'error');
        return;
    }
    
    // Show loader
    saveBtn.classList.add('loading');
    
    window.parent.postMessage({ action: 'addStatusNote', ticketId: ticketId, content: content }, '*');
}

function deleteStatusNote(ticketId, noteId) {
    if (!confirm('Delete this status note?')) return;
    window.parent.postMessage({ action: 'deleteStatusNote', ticketId: ticketId, noteId: noteId }, '*');
}

function renderStatusNotes(notesData, isAdmin) {
    let notes = [];
    if (notesData) {
        try {
            notes = typeof notesData === 'string' ? JSON.parse(notesData) : notesData;
            if (!Array.isArray(notes)) notes = [];
        } catch (e) {
            notes = [];
        }
    }
    
    if (notes.length === 0) {
        return '<div class="no-notes">No status notes yet</div>';
    }
    
    return notes.map(note => 
        '<div class="status-note-item" data-note-id="' + note.id + '">' +
            '<div class="status-note-header">' +
                '<span class="status-note-date">' + formatFullDateTime(note.date) + '</span>' +
                (isAdmin ? '<button class="status-note-delete" onclick="deleteStatusNote(\'' + state.selectedTicket._id + '\', \'' + note.id + '\')" title="Delete note">' +
                    '<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>' +
                '</button>' : '') +
            '</div>' +
            '<div class="status-note-content">' + note.content + '</div>' +
        '</div>'
    ).join('');
}

// ==========================================
// MODAL FUNCTIONS
// ==========================================
function openModal() {
    document.getElementById('newTicketModal').classList.add('active');
    resetForm();
    window.scrollTo(0, 0);
    window.parent.postMessage({ action: 'modalOpened', modal: 'newTicket' }, '*');
}

function closeModal() {
    document.getElementById('newTicketModal').classList.remove('active');
}

function closeNewTicketModal() {
    closeModal();
    // Clear validation states
    document.getElementById('ticketSubject').classList.remove('invalid');
    document.getElementById('ticketDescription').classList.remove('invalid');
    document.getElementById('subjectError').style.display = 'none';
    document.getElementById('descriptionError').style.display = 'none';
    document.getElementById('submitTicket').classList.remove('loading');
    // Clear referral validation
    var rc = document.getElementById('referralCompanyName');
    var re = document.getElementById('referralEmailAddress');
    if (rc) rc.classList.remove('invalid');
    if (re) re.classList.remove('invalid');
    var rce = document.getElementById('referralCompanyError');
    var ree = document.getElementById('referralEmailError');
    if (rce) rce.style.display = 'none';
    if (ree) ree.style.display = 'none';
}

function openReferralModal() {
    // Legacy - referrals now handled via new ticket form
    openModal();
    // Auto-select referral type
    setTimeout(function() {
        var referralOption = document.querySelector('.type-option[data-type="referral"]');
        if (referralOption) referralOption.click();
    }, 100);
}

function closeReferralModal() {
    // Legacy stub
}

function openImageModal(url) {
    document.getElementById('imageModalImg').src = url;
    document.getElementById('imageModal').classList.add('active');
    window.scrollTo(0, 0);
    window.parent.postMessage({ action: 'modalOpened', modal: 'image' }, '*');
}

function closeImageModal() {
    document.getElementById('imageModal').classList.remove('active');
}

// ==========================================
// CUSTOM MEDIA PLAYER CONTROLS
// ==========================================
var audioRegistry = {};

function getMediaElement(playerId) {
    var player = document.getElementById(playerId);
    if (!player) return null;
    // Check for video element in DOM
    var video = player.querySelector('video');
    if (video) return video;
    // Check audio registry
    if (audioRegistry[playerId]) return audioRegistry[playerId];
    return null;
}

function createAudioForPlayer(playerId, url) {
    if (audioRegistry[playerId]) return audioRegistry[playerId];
    var audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.preload = 'auto';
    audio.src = url;
    audioRegistry[playerId] = audio;
    return audio;
}

function formatMediaTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    var m = Math.floor(seconds / 60);
    var s = Math.floor(seconds % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
}

function toggleMediaPlay(playerId) {
    var player = document.getElementById(playerId);
    if (!player) return;
    
    // Lazily create Audio object for audio players
    var audioUrl = player.getAttribute('data-audio-url');
    if (audioUrl && !audioRegistry[playerId]) {
        createAudioForPlayer(playerId, audioUrl);
        startProgressUpdate(playerId);
    }
    
    var media = getMediaElement(playerId);
    if (!media) return;
    
    if (media.paused) {
        // Pause all other players first
        document.querySelectorAll('.media-player').forEach(function(p) {
            if (p.id !== playerId) {
                var otherMedia = getMediaElement(p.id);
                if (otherMedia && !otherMedia.paused) {
                    otherMedia.pause();
                    p.classList.remove('playing');
                }
            }
        });
        startProgressUpdate(playerId);
        var playPromise = media.play();
        if (playPromise !== undefined) {
            playPromise.then(function() {
                player.classList.add('playing');
            }).catch(function(err) {
                console.error('Playback failed:', err);
                player.classList.remove('playing');
                // Try without crossOrigin
                if (audioUrl && media.crossOrigin) {
                    media.crossOrigin = null;
                    media.src = audioUrl;
                    media.load();
                    media.addEventListener('canplay', function retryPlay() {
                        media.removeEventListener('canplay', retryPlay);
                        media.play().then(function() {
                            player.classList.add('playing');
                        }).catch(function(e2) {
                            console.error('Retry also failed:', e2);
                            var timeEl = player.querySelector('.media-time');
                            if (timeEl) timeEl.textContent = 'Playback error';
                        });
                    });
                }
            });
        } else {
            player.classList.add('playing');
        }
    } else {
        media.pause();
        player.classList.remove('playing');
    }
}

function seekMedia(event, playerId) {
    var media = getMediaElement(playerId);
    if (!media || !media.duration) return;
    var bar = event.currentTarget;
    var rect = bar.getBoundingClientRect();
    var ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    media.currentTime = ratio * media.duration;
    updateProgress(playerId);
}

function updateProgress(playerId) {
    var media = getMediaElement(playerId);
    var player = document.getElementById(playerId);
    if (!media || !player) return;
    
    var fill = player.querySelector('.media-progress-fill');
    var timeEl = player.querySelector('.media-time');
    
    if (fill && media.duration) {
        fill.style.width = ((media.currentTime / media.duration) * 100) + '%';
    }
    if (timeEl) {
        timeEl.textContent = formatMediaTime(media.currentTime) + ' / ' + formatMediaTime(media.duration);
    }
    
    // Hide video overlay when playing
    var overlay = player.querySelector('.video-play-overlay');
    if (overlay) {
        overlay.style.display = media.paused ? 'flex' : 'none';
    }
}

function startProgressUpdate(playerId) {
    var media = getMediaElement(playerId);
    if (!media) return;
    
    media.onended = function() {
        var player = document.getElementById(playerId);
        if (player) player.classList.remove('playing');
        var overlay = player ? player.querySelector('.video-play-overlay') : null;
        if (overlay) overlay.style.display = 'flex';
    };
    media.ontimeupdate = function() { updateProgress(playerId); };
    media.onloadedmetadata = function() { updateProgress(playerId); };
    media.onerror = function(e) {
        console.error('Media error for ' + playerId + ':', media.error);
        var player = document.getElementById(playerId);
        var timeEl = player ? player.querySelector('.media-time') : null;
        if (timeEl) timeEl.textContent = 'Error';
        if (player) player.classList.remove('playing');
    };
}

function toggleMute(playerId) {
    var media = getMediaElement(playerId);
    if (!media) return;
    media.muted = !media.muted;
    var player = document.getElementById(playerId);
    if (player) {
        if (media.muted) player.classList.add('muted');
        else player.classList.remove('muted');
    }
}

function toggleFullscreen(playerId) {
    var player = document.getElementById(playerId);
    if (!player) return;
    var video = player.querySelector('video');
    if (!video) return;
    if (video.requestFullscreen) video.requestFullscreen();
    else if (video.webkitRequestFullscreen) video.webkitRequestFullscreen();
    else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
}

// Initialize any media players already in the DOM
function initMediaPlayers() {
    document.querySelectorAll('.media-player').forEach(function(player) {
        var media = player.querySelector('video') || player.querySelector('audio');
        if (media) startProgressUpdate(player.id);
    });
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

    document.getElementById('categoryFormGroup').style.display = 'block';
    document.getElementById('referralFieldsGroup').style.display = 'none';
    document.getElementById('subjectFormGroup').style.display = 'block';
    document.getElementById('descriptionFormGroup').style.display = 'block';
    document.getElementById('priorityFormGroup').style.display = 'block';
    document.getElementById('impactFormGroup').style.display = 'block';
    
    // Clear validation states
    document.getElementById('ticketSubject').classList.remove('invalid');
    document.getElementById('ticketDescription').classList.remove('invalid');
    document.getElementById('subjectError').style.display = 'none';
    document.getElementById('descriptionError').style.display = 'none';
    document.getElementById('submitTicket').classList.remove('loading');
    
    // Clear referral validation
    var refCompany = document.getElementById('referralCompanyName');
    var refEmail = document.getElementById('referralEmailAddress');
    if (refCompany) { refCompany.classList.remove('invalid'); refCompany.value = ''; }
    if (refEmail) { refEmail.classList.remove('invalid'); refEmail.value = ''; }
    var refPhone = document.getElementById('referralPhoneNumber');
    var refComment = document.getElementById('referralCommentText');
    if (refPhone) refPhone.value = '';
    if (refComment) refComment.value = '';
    var refCompanyErr = document.getElementById('referralCompanyError');
    var refEmailErr = document.getElementById('referralEmailError');
    if (refCompanyErr) refCompanyErr.style.display = 'none';
    if (refEmailErr) refEmailErr.style.display = 'none';
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
    
    // Clear referral validation
    var refCompanyInput = document.getElementById('referralCompanyName');
    var refEmailInput = document.getElementById('referralEmailAddress');
    var refCompanyError = document.getElementById('referralCompanyError');
    var refEmailError = document.getElementById('referralEmailError');
    if (refCompanyInput) refCompanyInput.classList.remove('invalid');
    if (refEmailInput) refEmailInput.classList.remove('invalid');
    if (refCompanyError) refCompanyError.style.display = 'none';
    if (refEmailError) refEmailError.style.display = 'none';
    
    let hasError = false;
    
    if (ticketType !== 'referral') {
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
    }
    
    // Referral-specific validation
    var referralData = {};
    if (ticketType === 'referral') {
        var companyReferred = refCompanyInput ? refCompanyInput.value.trim() : '';
        var emailAddress = refEmailInput ? refEmailInput.value.trim() : '';
        var phone = document.getElementById('referralPhoneNumber') ? document.getElementById('referralPhoneNumber').value.trim() : '';
        var comment = document.getElementById('referralCommentText') ? document.getElementById('referralCommentText').value.trim() : '';
        
        if (!companyReferred) {
            if (refCompanyInput) refCompanyInput.classList.add('invalid');
            if (refCompanyError) refCompanyError.style.display = 'block';
            hasError = true;
        }
        if (!emailAddress || !emailAddress.includes('@')) {
            if (refEmailInput) refEmailInput.classList.add('invalid');
            if (refEmailError) refEmailError.style.display = 'block';
            hasError = true;
        }
        
        referralData = {
            companyReferred: companyReferred,
            emailAddress: emailAddress,
            phone: phone,
            comment: comment
        };
    }
    
    if (hasError) {
        showToast('Please fill in the required fields', 'error');
        return;
    }
    
    // Check if user has available tasks for support tickets
    if (ticketType === 'support' && state.contract && state.contract.adjustedTasks <= 0) {
        showToast('You have used all your contracted tasks for this period. Please contact support.', 'error');
        return;
    }
    
    // Show loader
    submitBtn.classList.add('loading');

    var messageData = {
        action: 'createTicket',
        ticketType: ticketType,
        category: ticketType === 'support' ? (state.selectedCategory || 'general') : ticketType,
        customCategory: (document.getElementById('customCategory') ? document.getElementById('customCategory').value.trim() : ''),
        subject: ticketType === 'referral' ? 'Referral' : subject,
        description: ticketType === 'referral' ? '' : description,
        priority: ticketType === 'referral' ? 'medium' : state.selectedPriority,
        businessImpact: ticketType === 'referral' ? 'none' : state.selectedImpact
    };
    
    // Add referral fields if referral type
    if (ticketType === 'referral') {
        messageData.companyReferred = referralData.companyReferred;
        messageData.referralEmail = referralData.emailAddress;
        messageData.referralPhone = referralData.phone;
        messageData.referralComment = referralData.comment;
        messageData.subject = 'Referral: ' + referralData.companyReferred;
    }

    window.parent.postMessage(messageData, '*');
}

function submitReferral(e) {
    // Legacy - referrals now submitted through the new ticket form
    if (e) e.preventDefault();
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
    const referral = state.tickets.filter(t => t.ticketType === 'referral').length;

    document.getElementById('allTypeCount').textContent = all;
    document.getElementById('supportTypeCount').textContent = support;
    document.getElementById('bugTypeCount').textContent = bug;
    document.getElementById('projectTypeCount').textContent = project;
    document.getElementById('referralTypeCount').textContent = referral;
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

function formatTicketNumber(num) {
    const str = String(num).replace(/[^0-9]/g, '');
    if (str.length > 3) {
        return str.slice(0, 3) + '-' + str.slice(3);
    }
    return str;
}

function renderOpportunityBadge(ticket) {
    if (!ticket.opportunityCategory) return '';
    var colour = ticket.opportunityCategoryColour || '999999';
    if (colour.charAt(0) !== '#') colour = '#' + colour;
    // Light background: 20% opacity of colour
    var r = parseInt(colour.slice(1,3), 16);
    var g = parseInt(colour.slice(3,5), 16);
    var b = parseInt(colour.slice(5,7), 16);
    var bg = 'rgba(' + r + ',' + g + ',' + b + ',0.12)';
    return '<span class="opportunity-badge" style="background:' + bg + ';color:' + colour + ';">' +
        '<span class="opportunity-badge-dot" style="background:' + colour + ';"></span>' +
        ticket.opportunityCategory +
    '</span>';
}

function formatFullDateTime(date) {
    if (!date) return '';
    const d = new Date(date);
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return day + ' ' + month + ' ' + year + ', ' + hours + ':' + mins;
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

// ==========================================
// EVENT LISTENERS
// ==========================================
function initEventListeners() {
    document.getElementById('newTicketBtn').addEventListener('click', openModal);
    document.getElementById('closeModal').addEventListener('click', closeNewTicketModal);
    document.getElementById('cancelTicket').addEventListener('click', closeNewTicketModal);
    document.getElementById('submitTicket').addEventListener('click', submitTicket);
    document.getElementById('pacmanBtn').addEventListener('click', () => window.parent.postMessage({ action: 'pacman' }, '*'));
    document.getElementById('brandingBtn').addEventListener('click', () => window.parent.postMessage({ action: 'brandingGuide' }, '*'));
    document.getElementById('imageModal').addEventListener('click', closeImageModal);
    
    // Rules and Task History popups
    document.getElementById('rulesBtn').addEventListener('click', openRulesPopup);
    document.getElementById('feedbackBtn').addEventListener('click', () => {
        window.parent.postMessage({ action: 'navigateToFeedback' }, '*');
    });
    
    // Account dropdown
    document.getElementById('accountBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        var dropdown = document.getElementById('accountDropdown');
        dropdown.classList.toggle('visible');
    });
    document.getElementById('logoutBtn').addEventListener('click', () => {
        document.getElementById('accountDropdown').classList.remove('visible');
        window.parent.postMessage({ action: 'logout' }, '*');
    });
    document.addEventListener('click', () => {
        document.getElementById('accountDropdown').classList.remove('visible');
    });
    document.getElementById('closeRulesPopup').addEventListener('click', closeRulesPopup);
    document.getElementById('rulesPopup').addEventListener('click', function(e) { if (e.target.id === 'rulesPopup') closeRulesPopup(); });
    document.getElementById('taskHistoryBtn').addEventListener('click', openTaskHistoryPopup);
    document.getElementById('closeTaskHistoryPopup').addEventListener('click', closeTaskHistoryPopup);
    document.getElementById('taskHistoryPopup').addEventListener('click', function(e) { if (e.target.id === 'taskHistoryPopup') closeTaskHistoryPopup(); });
    
    // Notification popup
    document.getElementById('notificationBtn').addEventListener('click', toggleNotificationPopup);
    document.getElementById('closeNotificationPopup').addEventListener('click', closeNotificationPopup);
    document.getElementById('clearAllNotifications').addEventListener('click', clearAllNotifications);
    // Close notification popup when clicking outside (for mobile backdrop)
    document.querySelector('.notification-wrapper').addEventListener('click', function(e) {
        if (e.target === this && this.classList.contains('mobile-open')) {
            closeNotificationPopup();
        }
    });

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
            
            // Reset status filter to All Tickets
            state.currentStatusFilter = 'all';
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            var allTab = document.querySelector('.tab[data-tab="all"]');
            if (allTab) allTab.classList.add('active');
            
            // Reset priority filter to All Priorities
            state.priorityFilter = '';
            var prioritySelect = document.getElementById('priorityFilter');
            if (prioritySelect) prioritySelect.value = '';
            
            renderTickets();
        });
    });

    // Type selector in form
    document.querySelectorAll('.type-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.type-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            state.selectedTicketType = option.dataset.type;

            // Show/hide category fields
            if (option.dataset.type === 'support') {
                document.getElementById('categoryFormGroup').style.display = 'block';
            } else {
                document.getElementById('categoryFormGroup').style.display = 'none';
            }
            
            // Show/hide referral fields
            if (option.dataset.type === 'referral') {
                document.getElementById('referralFieldsGroup').style.display = 'block';
                document.getElementById('subjectFormGroup').style.display = 'none';
                document.getElementById('descriptionFormGroup').style.display = 'none';
                document.getElementById('priorityFormGroup').style.display = 'none';
                document.getElementById('impactFormGroup').style.display = 'none';
            } else {
                document.getElementById('referralFieldsGroup').style.display = 'none';
                document.getElementById('subjectFormGroup').style.display = 'block';
                document.getElementById('descriptionFormGroup').style.display = 'block';
                document.getElementById('priorityFormGroup').style.display = 'block';
                document.getElementById('impactFormGroup').style.display = 'block';
            }
        });
    });

    // Category cards
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.category-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            state.selectedCategory = card.dataset.category;
            var subjectField = document.getElementById('ticketSubject');
            if (card.dataset.category === 'other') {
                if (subjectField) { subjectField.value = ''; subjectField.focus(); }
            } else {
                var title = card.querySelector('.category-card-title');
                if (title && subjectField) subjectField.value = title.textContent.trim();
            }
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
        if (e.target.id === 'newTicketModal') closeNewTicketModal();
    });
}
