const templates = {
  rescue: {
    title: 'Missed-call rescue',
    text: 'Hi, this is [Business]. Sorry we missed your call. Do you need locksmith help right now, or would you like to schedule a visit?'
  },
  intake: {
    title: 'Emergency lockout intake',
    text: 'I can help get the details ready. Are you locked out of a home, business, or vehicle, and what area are you in?'
  },
  followup: {
    title: 'No-reply follow-up',
    text: 'Just checking back. Do you still need help from [Business]?'
  },
  handoff: {
    title: 'Human handoff',
    text: 'Thanks. I am going to have our dispatcher confirm availability and next steps.'
  },
  review: {
    title: 'Review request',
    text: 'Thanks for choosing [Business]. If everything went well, would you mind leaving us a quick Google review? [demo link]'
  },
  optout: {
    title: 'Opt-out acknowledgement',
    text: 'Understood. We will not text this number again.'
  }
};

const viewCopy = {
  inbox: ['Missed-call inbox', 'Recover high-intent calls without bypassing consent or human judgment.'],
  approvals: ['Human approval queue', 'Sensitive or unusual actions pause until an accountable operator decides.'],
  scripts: ['Approved message library', 'Controlled templates keep outreach consistent, reviewable, and easy to audit.'],
  audit: ['Session audit trail', 'Inspect what happened, who acted, which lead was affected, and the result.'],
  settings: ['Safety controls', 'See the explicit boundary between this portfolio demo and a production system.']
};

const state = {
  leads: [],
  selectedId: '',
  audit: []
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function label(value) {
  return String(value).replaceAll('_', ' ');
}

function nowStamp() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function announce(message) {
  document.querySelector('#status-message').textContent = message;
}

function addAudit(action, lead, details = {}) {
  const event = {
    id: `audit_${Date.now()}_${Math.random().toString(16).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    actorType: details.actorType || 'operator',
    actorId: details.actorId || 'portfolio-demo',
    action,
    leadId: lead?.id || null,
    channel: details.channel || 'internal',
    templateId: details.templateId || null,
    approvalRequired: Boolean(details.approvalRequired),
    result: details.result || 'ok',
    before: details.before || null,
    after: details.after || null,
    riskFlags: lead?.riskFlags || []
  };
  state.audit.unshift(event);
}

function selectedLead() {
  return state.leads.find(lead => lead.id === state.selectedId) || state.leads[0];
}

function canSend(lead) {
  return lead.consentStatus !== 'opted_out' && !lead.riskFlags.includes('do_not_contact');
}

function setStatus(lead, status, text) {
  const before = { status: lead.status };
  lead.status = status;
  lead.timeline.push({ at: nowStamp(), type: 'status', text });
  addAudit('status_change', lead, { before, after: { status } });
}

function simulateRescue(lead) {
  if (!canSend(lead)) {
    addAudit('send_blocked_opt_out', lead, { channel: 'sms', result: 'blocked' });
    lead.timeline.push({ at: nowStamp(), type: 'blocked', text: 'Send blocked by opt-out/do-not-contact policy.' });
    announce(`Send blocked for ${lead.customer}.`);
    render();
    return;
  }

  const before = { status: lead.status };
  lead.status = 'contacted';
  lead.timeline.push({
    at: nowStamp(),
    type: 'simulated SMS',
    text: templates.rescue.text.replace('[Business]', 'Demo Locksmith')
  });
  addAudit('send_sms_simulated', lead, {
    channel: 'sms',
    templateId: 'missed_call_rescue_v1',
    before,
    after: { status: 'contacted' }
  });
  announce(`Rescue message simulated for ${lead.customer}.`);
  render();
}

function simulateReply(lead) {
  if (!canSend(lead)) {
    announce(`Reply capture is blocked for ${lead.customer}.`);
    return;
  }

  const before = { status: lead.status, intake: clone(lead.intake) };
  lead.status = lead.riskFlags.length ? 'needs_approval' : 'ready_for_dispatch';
  lead.intake.address = lead.intake.address || 'Address captured in demo';
  lead.intake.notes = lead.intake.notes || 'Customer replied with location and urgency.';
  lead.timeline.push({ at: nowStamp(), type: 'reply', text: 'Customer replied with area, urgency, and callback preference.' });
  addAudit('customer_reply_captured', lead, {
    before,
    after: { status: lead.status, intake: clone(lead.intake) },
    approvalRequired: lead.status === 'needs_approval'
  });
  announce(`Customer reply captured for ${lead.customer}.`);
  render();
}

function requestApproval(lead) {
  if (!canSend(lead)) {
    announce(`Approval cannot override do-not-contact for ${lead.customer}.`);
    return;
  }

  const before = { status: lead.status };
  lead.status = 'needs_approval';
  lead.timeline.push({ at: nowStamp(), type: 'approval', text: 'Dispatcher approval required before handoff.' });
  addAudit('approval_requested', lead, {
    templateId: 'handoff_v1',
    approvalRequired: true,
    before,
    after: { status: 'needs_approval' }
  });
  announce(`Approval requested for ${lead.customer}.`);
  render();
}

function approveHandoff(lead) {
  if (!lead || lead.status !== 'needs_approval' || !canSend(lead)) return;
  const before = { status: lead.status };
  lead.status = 'scheduled';
  lead.timeline.push({ at: nowStamp(), type: 'approved', text: 'Human approved dispatcher handoff. Simulated send recorded.' });
  addAudit('handoff_approved_simulated', lead, {
    channel: 'sms',
    templateId: 'handoff_v1',
    approvalRequired: true,
    before,
    after: { status: 'scheduled' }
  });
  announce(`Handoff approved for ${lead.customer}.`);
  render();
}

function completeJob(lead) {
  if (!['scheduled', 'ready_for_dispatch'].includes(lead.status)) return;
  setStatus(lead, 'won', 'Job marked complete. A voluntary review request is now eligible.');
  announce(`Job marked complete for ${lead.customer}.`);
  render();
}

function sendReview(lead) {
  if (lead.status !== 'won' || !canSend(lead) || lead.reviewSent) return;
  lead.reviewSent = true;
  lead.timeline.push({
    at: nowStamp(),
    type: 'simulated review request',
    text: templates.review.text.replace('[Business]', 'Demo Locksmith')
  });
  addAudit('review_request_simulated', lead, {
    channel: 'sms',
    templateId: 'review_request_v1'
  });
  announce(`Review request simulated for ${lead.customer}.`);
  render();
}

function renderLeadList() {
  const box = document.querySelector('#lead-list');
  box.innerHTML = state.leads.map(lead => `
    <button class="lead-card ${lead.id === selectedLead()?.id ? 'active' : ''}" data-lead="${escapeHtml(lead.id)}" data-testid="lead-${escapeHtml(lead.id)}" aria-pressed="${lead.id === selectedLead()?.id}">
      <div class="lead-top">
        <strong>${escapeHtml(lead.customer)}</strong>
        <span class="badge ${escapeHtml(lead.status)}">${escapeHtml(label(lead.status))}</span>
      </div>
      <p class="lead-summary">${escapeHtml(lead.serviceType)} · ${escapeHtml(lead.area)} · ${escapeHtml(lead.urgency)}</p>
      <p>${escapeHtml(lead.suggestedNextAction)}</p>
      ${lead.riskFlags.length ? `<p class="risk">Flag: ${escapeHtml(lead.riskFlags.map(label).join(', '))}</p>` : ''}
    </button>
  `).join('');

  box.querySelectorAll('[data-lead]').forEach(card => {
    card.addEventListener('click', () => {
      state.selectedId = card.dataset.lead;
      render();
    });
  });
}

function renderDetail() {
  const lead = selectedLead();
  const detail = document.querySelector('#lead-detail');
  if (!lead) {
    detail.innerHTML = '<div class="empty-state"><p class="muted">No lead selected.</p></div>';
    return;
  }

  const blocked = !canSend(lead);
  detail.innerHTML = `
    <div class="lead-top">
      <div>
        <p class="eyebrow">${escapeHtml(lead.source)} · ${escapeHtml(lead.area)}</p>
        <h3>${escapeHtml(lead.customer)}</h3>
      </div>
      <span class="badge ${escapeHtml(lead.status)}" data-testid="lead-status">${escapeHtml(label(lead.status))}</span>
    </div>
    <div class="detail-grid">
      <div class="field"><span>Demo phone</span>${escapeHtml(lead.phone)}</div>
      <div class="field"><span>Service</span>${escapeHtml(lead.serviceType)}</div>
      <div class="field"><span>Urgency</span>${escapeHtml(lead.urgency)}</div>
      <div class="field"><span>Property</span>${escapeHtml(lead.intake.property)}</div>
      <div class="field"><span>Consent</span>${escapeHtml(label(lead.consentStatus))}</div>
      <div class="field"><span>Risk flags</span>${lead.riskFlags.length ? escapeHtml(lead.riskFlags.map(label).join(', ')) : 'None'}</div>
    </div>
    <div class="field intake-field">
      <span>Structured intake</span>
      ${escapeHtml(lead.intake.preferredTime || 'Time unknown')} · ${escapeHtml(lead.intake.address || 'Address needed')}
      <br>${escapeHtml(lead.intake.notes || 'Waiting for customer details.')}
    </div>
    <div class="actions">
      <button class="primary" data-action="rescue" ${blocked || lead.status === 'contacted' ? 'disabled' : ''}>Simulate rescue SMS</button>
      <button class="secondary" data-action="reply" ${blocked || ['ready_for_dispatch', 'scheduled', 'won'].includes(lead.status) ? 'disabled' : ''}>Capture reply</button>
      <button class="warning" data-action="approval" ${blocked || lead.status === 'needs_approval' || lead.status === 'won' ? 'disabled' : ''}>Request approval</button>
      <button class="primary" data-action="approve" ${lead.status !== 'needs_approval' ? 'disabled' : ''}>Approve handoff</button>
      <button class="secondary" data-action="complete" ${!['scheduled', 'ready_for_dispatch'].includes(lead.status) ? 'disabled' : ''}>Mark complete</button>
      <button class="primary" data-action="review" ${lead.status !== 'won' || blocked || lead.reviewSent ? 'disabled' : ''}>${lead.reviewSent ? 'Review request sent' : 'Send review request'}</button>
    </div>
    <h3>Lead timeline</h3>
    <div class="timeline">
      ${lead.timeline.slice().reverse().map(item => `<div class="timeline-item"><strong>${escapeHtml(item.at)} · ${escapeHtml(item.type)}</strong><br>${escapeHtml(item.text)}</div>`).join('')}
    </div>
  `;

  detail.querySelectorAll('[data-action]').forEach(button => {
    button.addEventListener('click', () => {
      const actions = {
        rescue: simulateRescue,
        reply: simulateReply,
        approval: requestApproval,
        approve: approveHandoff,
        complete: completeJob,
        review: sendReview
      };
      actions[button.dataset.action]?.(lead);
    });
  });
}

function renderApprovals() {
  const list = document.querySelector('#approval-list');
  const approvals = state.leads.filter(lead => lead.status === 'needs_approval');
  list.innerHTML = approvals.length ? approvals.map(lead => `
    <article class="panel" data-testid="approval-${escapeHtml(lead.id)}">
      <div class="lead-top">
        <div>
          <p class="eyebrow">Decision required</p>
          <h3>${escapeHtml(lead.customer)}</h3>
        </div>
        <span class="badge needs_approval">Needs approval</span>
      </div>
      <p>${escapeHtml(lead.suggestedNextAction)}</p>
      <p class="risk">${escapeHtml(lead.riskFlags.map(label).join(', ') || 'Approval required by policy.')}</p>
      <button class="primary" data-approve="${escapeHtml(lead.id)}">Approve simulated handoff</button>
    </article>
  `).join('') : '<div class="panel empty-state"><p class="muted">No human decisions are waiting.</p></div>';

  list.querySelectorAll('[data-approve]').forEach(button => {
    button.addEventListener('click', () => approveHandoff(state.leads.find(lead => lead.id === button.dataset.approve)));
  });
}

function renderScripts() {
  const list = document.querySelector('#script-list');
  list.innerHTML = Object.entries(templates).map(([id, template]) => `
    <article class="script-card">
      <p class="eyebrow">${escapeHtml(id)} template</p>
      <h3>${escapeHtml(template.title)}</h3>
      <code>${escapeHtml(template.text)}</code>
    </article>
  `).join('');
}

function renderAudit() {
  const list = document.querySelector('#audit-list');
  list.innerHTML = state.audit.length ? state.audit.map(event => `
    <article class="audit-event" data-testid="audit-event">
      <time datetime="${escapeHtml(event.timestamp)}">${escapeHtml(new Date(event.timestamp).toLocaleTimeString())}</time>
      <div>
        <strong>${escapeHtml(label(event.action))}</strong>
        <div class="audit-meta">${escapeHtml(event.actorType)}:${escapeHtml(event.actorId)} · ${escapeHtml(event.leadId || 'system')} · ${escapeHtml(event.channel)}</div>
      </div>
      <span class="badge ${event.result === 'blocked' ? 'blocked' : 'ready_for_dispatch'}">${escapeHtml(event.result)}</span>
    </article>
  `).join('') : '<div class="panel empty-state"><p class="muted">No audit events yet.</p></div>';
}

function renderStats() {
  document.querySelector('#stat-missed').textContent = state.leads.length;
  document.querySelector('#stat-approvals').textContent = state.leads.filter(lead => lead.status === 'needs_approval').length;
  document.querySelector('#stat-audit').textContent = state.audit.length;
}

function render() {
  if (!state.selectedId && state.leads.length) state.selectedId = state.leads[0].id;
  renderLeadList();
  renderDetail();
  renderApprovals();
  renderScripts();
  renderAudit();
  renderStats();
}

async function loadDemo() {
  try {
    const response = await fetch('/api/leads');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const leads = await response.json();
    state.leads = leads;
    state.selectedId = leads[0]?.id || '';
    state.audit = [];
    addAudit('demo_loaded', null, { actorType: 'system', actorId: 'browser-demo' });
    announce('Demo scenario reset to synthetic seed data.');
    render();
  } catch (error) {
    document.querySelector('#lead-detail').innerHTML = `<div class="empty-state"><h3>Demo data unavailable</h3><p class="muted">${escapeHtml(error.message)}</p></div>`;
    announce('Demo data could not be loaded.');
  }
}

function activateView(viewName) {
  document.querySelectorAll('.nav').forEach(item => {
    const active = item.dataset.view === viewName;
    item.classList.toggle('active', active);
    if (active) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });
  document.querySelectorAll('.view').forEach(item => item.classList.toggle('active', item.id === viewName));
  const [title, subtitle] = viewCopy[viewName];
  document.querySelector('#view-title').textContent = title;
  document.querySelector('#view-subtitle').textContent = subtitle;
}

document.querySelectorAll('.nav').forEach(button => {
  button.addEventListener('click', () => activateView(button.dataset.view));
});

document.querySelector('#reset-demo').addEventListener('click', loadDemo);

loadDemo();
