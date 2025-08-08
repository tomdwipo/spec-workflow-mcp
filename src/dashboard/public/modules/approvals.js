import { fetchApprovalContent, postApprovalAction } from './api.js';
import { hexToColorObject, isValidHex } from './colors.js';
import { renderMarkdownContent } from './markdown.js';

export function mountApprovalMethods(app) {
  app.approveRequest = function(...args) { return approveRequest.apply(this, args); };
  app.rejectRequest = function(...args) { return rejectRequest.apply(this, args); };
  app.viewApprovalContent = function(...args) { return viewApprovalContent.apply(this, args); };
  app.openApprovalEditor = function(...args) { return openApprovalEditor.apply(this, args); };
  app.closeApprovalEditor = function(...args) { return closeApprovalEditor.apply(this, args); };
  app.handleTextSelection = function(...args) { return handleTextSelection.apply(this, args); };
  app.addGeneralComment = function(...args) { return addGeneralComment.apply(this, args); };
  app.removeComment = function(...args) { return removeComment.apply(this, args); };
  app.editComment = function(...args) { return editComment.apply(this, args); };
  app.renderContentWithAnnotations = function(...args) { return renderContentWithAnnotations.apply(this, args); };
  app.escapeRegExp = function(...args) { return escapeRegExp.apply(this, args); };
  app.hexToColorObject = function(...args) { return hexToColorObject.apply(this, args); };
  app.updateCustomColor = function(...args) { return updateCustomColor.apply(this, args); };
  app.isValidHex = function(...args) { return isValidHex.apply(this, args); };
  app.selectPresetColor = function(...args) { return selectPresetColor.apply(this, args); };
  app.setViewMode = function(...args) { return setViewMode.apply(this, args); };
  app.renderMarkdownContent = function(content) { return renderMarkdownContent(app, content); };
  app.submitApprovalWithFeedback = function(...args) { return submitApprovalWithFeedback.apply(this, args); };
  app.generateFeedbackSummary = function(...args) { return generateFeedbackSummary.apply(this, args); };
  app.showCommentModal = function(...args) { return showCommentModal.apply(this, args); };
  app.closeCommentModal = function(...args) { return closeCommentModal.apply(this, args); };
  app.submitComment = function(...args) { return submitComment.apply(this, args); };
  app.loadApprovalPreview = function(...args) { return loadApprovalPreview.apply(this, args); };
  app.getApprovalPreview = function(...args) { return getApprovalPreview.apply(this, args); };
}

async function approveRequest(approvalId) {
  const feedback = prompt('Optional: Add approval feedback or comments:');
  const response = feedback || 'Approved via dashboard';
  const result = await postApprovalAction(approvalId, 'approve', {
    response,
    annotations: feedback ? 'User provided feedback during approval' : undefined,
  });
  if (result.ok) await this.loadData();
  else alert('Failed to approve request. Please try again.');
}

async function rejectRequest(approvalId) {
  const feedback = prompt('Please provide feedback explaining why this is being rejected:');
  if (!feedback) {
    alert('Rejection feedback is required.');
    return;
  }
  const result = await postApprovalAction(approvalId, 'reject', {
    response: feedback,
    annotations: 'Rejected with user feedback',
  });
  if (result.ok) await this.loadData();
  else alert('Failed to reject request. Please try again.');
}

function viewApprovalContent(approval) {
  const content = typeof approval.content === 'string' ? approval.content : (approval.content ? String(approval.content) : '');
  this.markdownPreview = { show: true, loading: false, title: approval.title, content };
}

async function openApprovalEditor(approval) {
  this.approvalEditor = { show: true, approvalId: approval.id, title: approval.title, content: 'Loading...', comments: [], viewMode: 'preview' };
  if (approval.filePath) {
    try {
      const data = await fetchApprovalContent(approval.id);
      this.approvalEditor.content = typeof data.content === 'string' ? data.content : String(data.content || '');
    } catch {
      // Fallback to embedded content if available
      this.approvalEditor.content = typeof approval.content === 'string'
        ? approval.content
        : (approval.content ? String(approval.content) : 'Error loading file content. Please check if the file exists.');
    }
  } else {
    this.approvalEditor.content = typeof approval.content === 'string' ? approval.content : (approval.content ? String(approval.content) : 'No content available');
  }
}

function closeApprovalEditor() {
  this.approvalEditor.show = false;
  this.approvalEditor.comments = [];
  this.closeCommentModal();
}

function handleTextSelection() {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  if (selectedText.length > 0) this.showCommentModal('selection', selectedText);
}

function addGeneralComment() {
  this.showCommentModal('general', '');
}

function removeComment(index) {
  if (confirm('Remove this comment?')) this.approvalEditor.comments.splice(index, 1);
}

function editComment(index) {
  const comment = this.approvalEditor.comments[index];
  this.commentModal = {
    show: true,
    type: comment.type,
    selectedText: comment.selectedText || '',
    comment: comment.comment,
    selectedColor: comment.highlightColor || (comment.type === 'selection' ? hexToColorObject(this.commentModal.customColorHex) : null),
    customColorHex: comment.highlightColor ? comment.highlightColor.border : this.commentModal.customColorHex,
    isEditing: true,
    editingIndex: index,
  };
}

function renderContentWithAnnotations(content) {
  if (typeof content !== 'string') {
    if (content == null) return '';
    content = String(content);
  }
  let processedContent = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const selectionComments = this.approvalEditor.comments.filter((c) => c.type === 'selection' && c.selectedText && c.highlightColor);
  selectionComments.sort((a, b) => b.selectedText.length - a.selectedText.length);
  for (const comment of selectionComments) {
    const escapedText = comment.selectedText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    const regex = new RegExp(escapeRegExp(escapedText), 'g');
    const highlightStyle = `background-color: ${comment.highlightColor.bg}; border-bottom: 2px solid ${comment.highlightColor.border}; padding: 1px 2px; border-radius: 2px;`;
    const replacement = `<span style="${highlightStyle}" class="highlight-${comment.highlightColor.name}">${escapedText}</span>`;
    processedContent = processedContent.replace(regex, replacement);
  }
  return processedContent;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function updateCustomColor(hex) {
  if (isValidHex(hex)) {
    this.commentModal.customColorHex = hex.toUpperCase();
    this.commentModal.selectedColor = hexToColorObject(hex);
  }
}

function selectPresetColor(hex) {
  updateCustomColor.call(this, hex);
}

function setViewMode(mode) {
  this.approvalEditor.viewMode = mode;
}

async function submitApprovalWithFeedback(decision) {
  if (decision === 'rejected' && this.approvalEditor.comments.length === 0) {
    alert('Please add at least one comment explaining why revisions are needed.');
    return;
  }
  if (decision === 'approved' && this.approvalEditor.comments.length > 0) {
    alert('Cannot approve when comments exist. Use "Request Revisions" to provide feedback.');
    return;
  }
  const structuredFeedback = {
    decision,
    comments: this.approvalEditor.comments,
    summary: generateFeedbackSummary.call(this),
    timestamp: new Date().toISOString(),
  };
  const endpoint = decision === 'approved' ? 'approve' : 'needs-revision';
  const result = await postApprovalAction(this.approvalEditor.approvalId, endpoint, {
    response: structuredFeedback.summary,
    annotations: JSON.stringify(structuredFeedback, null, 2),
    comments: this.approvalEditor.comments,
  });
  if (result.ok) {
    this.closeApprovalEditor();
    await this.loadData();
  } else {
    alert(`Failed to ${decision === 'approved' ? 'approve' : 'reject'} request. Please try again.`);
  }
}

function generateFeedbackSummary() {
  const comments = this.approvalEditor.comments;
  if (comments.length === 0) return 'No specific feedback provided';
  const generalComments = comments.filter((c) => c.type === 'general');
  const selectionComments = comments.filter((c) => c.type === 'selection');
  let summary = `Feedback Summary (${comments.length} comments):\n\n`;
  if (generalComments.length > 0) {
    summary += 'General Comments:\n';
    generalComments.forEach((comment, index) => {
      summary += `${index + 1}. ${comment.comment}\n`;
    });
    summary += '\n';
  }
  if (selectionComments.length > 0) {
    summary += 'Specific Text Comments:\n';
    selectionComments.forEach((comment, index) => {
      summary += `${index + 1}. "${comment.selectedText.substring(0, 50)}${comment.selectedText.length > 50 ? '...' : ''}": ${comment.comment}\n`;
    });
  }
  return summary;
}

function showCommentModal(type, selectedText = '') {
  this.commentModal = {
    show: true,
    type,
    selectedText,
    comment: '',
    selectedColor: type === 'selection' ? hexToColorObject(this.commentModal.customColorHex) : null,
    customColorHex: this.commentModal.customColorHex || '#FFEB3B',
  };
  if (type === 'selection') {
    setTimeout(() => {
      const selection = window.getSelection();
      selection.removeAllRanges();
    }, 100);
  }
}

function closeCommentModal() {
  this.commentModal.show = false;
  this.commentModal.comment = '';
  this.commentModal.selectedText = '';
  this.commentModal.selectedColor = null;
  this.commentModal.isEditing = false;
  this.commentModal.editingIndex = -1;
}

function submitComment() {
  if (!this.commentModal.comment.trim()) {
    alert('Please enter a comment');
    return;
  }
  if (this.commentModal.isEditing) {
    const existingComment = this.approvalEditor.comments[this.commentModal.editingIndex];
    existingComment.comment = this.commentModal.comment.trim();
    if (this.commentModal.type === 'selection') {
      existingComment.highlightColor = this.commentModal.selectedColor;
    }
  } else {
    const comment = { type: this.commentModal.type, comment: this.commentModal.comment.trim(), timestamp: new Date().toISOString() };
    if (this.commentModal.type === 'selection') {
      comment.selectedText = this.commentModal.selectedText;
      comment.highlightColor = this.commentModal.selectedColor;
    }
    this.approvalEditor.comments.push(comment);
  }
  this.closeCommentModal();
}

async function loadApprovalPreview(approvalId) {
  if (this.approvalPreviews[approvalId]) return this.approvalPreviews[approvalId];
  try {
    const data = await fetchApprovalContent(approvalId);
    const content = typeof data.content === 'string' ? data.content : String(data.content || '');
    const preview = content.substring(0, 300) + (content.length > 300 ? '...' : '');
    this.approvalPreviews[approvalId] = preview;
    return preview;
  } catch {
    // Fallback to approval object if present in approvals list
    const approval = (this.approvals || []).find(a => a.id === approvalId);
    if (approval && approval.content) {
      const content = typeof approval.content === 'string' ? approval.content : String(approval.content);
      const preview = content.substring(0, 300) + (content.length > 300 ? '...' : '');
      this.approvalPreviews[approvalId] = preview;
      return preview;
    }
    this.approvalPreviews[approvalId] = 'Error loading preview';
    return 'Error loading preview';
  }
}

function getApprovalPreview(approval) {
  if (!approval.filePath) {
    return approval.content ? approval.content.substring(0, 300) + (approval.content.length > 300 ? '...' : '') : 'No content available';
  }
  if (this.approvalPreviews[approval.id]) return this.approvalPreviews[approval.id];
  this.loadApprovalPreview(approval.id);
  return 'Loading preview...';
}


