// MCP Workflow Dashboard
PetiteVue.createApp({
  // State
  specs: [],
  approvals: [],
  connected: false,
  ws: null,
  projectName: 'Project',
  branch: null,
  githubUrl: null,
  theme: 'dark',
  steeringStatus: null,
  steeringNoticeCollapsed: true,
  selectedSpec: null,
  collapsedCompletedTasks: [],
  markdownPreview: {
    show: false,
    loading: false,
    title: '',
    content: '',
    specName: '',
    activeDocument: 'requirements', // 'requirements', 'design', 'tasks'
    documents: {} // Cache for all spec documents
  },
  approvalEditor: {
    show: false,
    approvalId: null,
    title: '',
    content: '',
    comments: [],
    viewMode: 'annotate' // 'preview' or 'annotate'
  },
  commentModal: {
    show: false,
    type: 'general', // 'general' or 'selection'
    selectedText: '',
    comment: '',
    selectedColor: null, // User-selected highlight color
    customColorHex: '#FFEB3B', // Current custom color hex value
    isEditing: false, // Whether we're editing an existing comment
    editingIndex: -1 // Index of comment being edited
  },
  approvalPreviews: {}, // Cache for approval preview content
  specViewer: {
    show: false,
    loading: false,
    specName: '',
    title: '',
    content: '',
    activeDocument: 'requirements', // 'requirements', 'design', 'tasks'
    documents: {} // Cache for all spec documents
  },
  taskProgressViewer: {
    show: false,
    loading: false,
    specName: '',
    data: null
  },
  
  // Preset color suggestions
  presetColors: [
    '#FFEB3B', '#FFC107', '#FF9800', '#FF5722', '#F44336', '#E91E63',
    '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4',
    '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#795548', '#9E9E9E'
  ],

  // Computed properties


  // Initialize the dashboard
  async init() {
    console.log('MCP Dashboard initializing...');
    this.initTheme();
    await this.loadData();
    this.connectWebSocket();
  },

  // Theme management
  initTheme() {
    const savedTheme = localStorage.getItem('dashboard-theme') || 'dark';
    this.theme = savedTheme;
    this.applyTheme();
  },

  toggleTheme() {
    const themes = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(this.theme);
    this.theme = themes[(currentIndex + 1) % themes.length];
    localStorage.setItem('dashboard-theme', this.theme);
    this.applyTheme();
  },

  applyTheme() {
    const html = document.documentElement;
    if (this.theme === 'dark' || (this.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    // Update highlight.js theme when theme changes
    this.updateHighlightTheme();
  },

  // Data loading
  async loadData() {
    try {
      const [specsRes, approvalsRes, infoRes] = await Promise.all([
        fetch('/api/specs'),
        fetch('/api/approvals'),
        fetch('/api/info')
      ]);

      this.specs = await specsRes.json();
      this.approvals = await approvalsRes.json();
      
      const info = await infoRes.json();
      this.projectName = info.projectName || 'Project';
      this.steeringStatus = info.steering;
      
      console.log('Data loaded:', { specs: this.specs.length, approvals: this.approvals.length });
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  },

  // WebSocket connection
  connectWebSocket() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${location.host}/ws`;
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.connected = true;
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.connected = false;
      // Reconnect after 3 seconds
      setTimeout(() => this.connectWebSocket(), 3000);
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleWebSocketMessage(message);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  },

  handleWebSocketMessage(message) {
    console.log('WebSocket message:', message);
    
    switch (message.type) {
      case 'initial':
        this.specs = message.data.specs || [];
        this.approvals = message.data.approvals || [];
        break;
        
      case 'update':
        // Add small delay to ensure backend has processed the file changes
        setTimeout(() => {
          this.loadData(); // Reload all data on spec updates
        
        // Update spec viewer if open
        if (this.specViewer.show) {
          this.refreshSpecViewer();
        }
        
        // Update task progress viewer if open
        if (this.taskProgressViewer.show) {
          this.refreshTaskProgressViewer();
        }
        
        // Update markdown preview if open
        if (this.markdownPreview.show) {
          this.refreshMarkdownPreview();
        }
        }, 200);
        break;
        
        
      case 'approval-update':
        this.approvals = message.data || [];
        break;
        
      case 'spec-update':
        // Specific spec document updates
        if (message.data.specName && this.specViewer.show && this.specViewer.specName === message.data.specName) {
          this.refreshSpecViewer();
        }
        break;
        
      case 'task-update':
        // Task progress updates
        if (message.data.specName && this.taskProgressViewer.show && this.taskProgressViewer.specName === message.data.specName) {
          this.refreshTaskProgressViewer();
        }
        break;
    }
  },

  // Approval management
  async approveRequest(approvalId) {
    const feedback = prompt('Optional: Add approval feedback or comments:');
    const response = feedback || 'Approved via dashboard';
    
    try {
      const result = await fetch(`/api/approvals/${approvalId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          response: response,
          annotations: feedback ? 'User provided feedback during approval' : undefined 
        })
      });
      
      if (result.ok) {
        console.log('Approval approved:', approvalId);
        await this.loadData();
      } else {
        alert('Failed to approve request. Please try again.');
      }
    } catch (error) {
      console.error('Failed to approve request:', error);
      alert('Failed to approve request. Please try again.');
    }
  },

  async rejectRequest(approvalId) {
    const feedback = prompt('Please provide feedback explaining why this is being rejected:');
    if (!feedback) {
      alert('Rejection feedback is required.');
      return;
    }
    
    try {
      const result = await fetch(`/api/approvals/${approvalId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          response: feedback,
          annotations: 'Rejected with user feedback'
        })
      });
      
      if (result.ok) {
        console.log('Approval rejected:', approvalId);
        await this.loadData();
      } else {
        alert('Failed to reject request. Please try again.');
      }
    } catch (error) {
      console.error('Failed to reject request:', error);
      alert('Failed to reject request. Please try again.');
    }
  },

  viewApprovalContent(approval) {
    this.markdownPreview = {
      show: true,
      loading: false,
      title: approval.title,
      content: approval.content
    };
  },

  // Markdown preview
  async viewMarkdown(specName, document) {
    this.markdownPreview.show = true;
    this.markdownPreview.loading = true;
    this.markdownPreview.specName = specName;
    this.markdownPreview.title = `${specName.replace(/-/g, ' ')} - Source Documents`;
    this.markdownPreview.activeDocument = document;

    try {
      // Load all documents for this spec
      const response = await fetch(`/api/specs/${specName}/all`);
      const documents = await response.json();
      this.markdownPreview.documents = documents;
      
      // Set content for active document
      const activeDoc = documents[document];
      this.markdownPreview.content = activeDoc ? activeDoc.content : 'No content available';
      
    } catch (error) {
      console.error('Failed to load spec documents:', error);
      this.markdownPreview.content = 'Error loading content';
    } finally {
      this.markdownPreview.loading = false;
    }
  },


  switchMarkdownDocument(documentType) {
    this.markdownPreview.activeDocument = documentType;
    const activeDoc = this.markdownPreview.documents[documentType];
    this.markdownPreview.content = activeDoc ? activeDoc.content : 'No content available';
  },

  closeMarkdownPreview() {
    this.markdownPreview.show = false;
    this.markdownPreview.content = '';
    this.markdownPreview.documents = {};
  },

  renderMarkdown(content) {
    if (!content) return '';
    if (typeof window.markdownit === 'undefined') {
      console.warn('markdown-it not available for simple rendering');
      return this.escapeHtml(content);
    }
    try {
      // Ensure content is a string
      if (typeof content !== 'string') {
        content = String(content);
      }
      
      const md = window.markdownit({
        html: true,
        breaks: true,
        linkify: true,
        typographer: true
      });
      return md.render(content);
    } catch (error) {
      console.error('Simple markdown parsing error:', error);
      return this.escapeHtml(content);
    }
  },

  // Utility functions
  formatDate(dateString) {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  refresh() {
    window.location.reload();
  },


  // Task management functions
  getVisibleTasks(spec) {
    if (!spec.tasks?.taskList) return [];
    
    const collapsed = this.areCompletedTasksCollapsed(spec.name);
    if (!collapsed) return spec.tasks.taskList;
    
    return spec.tasks.taskList.filter(task => !task.completed);
  },

  getCompletedTaskCount(spec) {
    if (!spec.tasks?.taskList) return 0;
    return spec.tasks.taskList.filter(task => task.completed).length;
  },

  areCompletedTasksCollapsed(specName) {
    return this.collapsedCompletedTasks.includes(specName);
  },

  toggleCompletedTasks(specName) {
    const index = this.collapsedCompletedTasks.indexOf(specName);
    if (index > -1) {
      this.collapsedCompletedTasks.splice(index, 1);
    } else {
      this.collapsedCompletedTasks.push(specName);
    }
  },

  // Command copying functions
  copyCommand(command, event) {
    const button = event.target.closest('button');
    const originalText = button.innerHTML;
    
    // Try modern clipboard API first (HTTPS contexts)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(command).then(() => {
        this.showCopySuccess(button, originalText);
      }).catch(() => {
        this.fallbackCopy(command, button, originalText);
      });
    } else {
      // Fallback for HTTP contexts or browsers without clipboard API
      this.fallbackCopy(command, button, originalText);
    }
  },

  // Fallback copy method using temporary textarea
  fallbackCopy(text, button, originalText) {
    try {
      // Create temporary textarea element
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      
      // Select and copy
      textarea.select();
      textarea.setSelectionRange(0, 99999); // For mobile devices
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      
      if (successful) {
        this.showCopySuccess(button, originalText);
      } else {
        this.showCopyError(button, originalText);
      }
    } catch (err) {
      this.showCopyError(button, originalText);
    }
  },

  // Success feedback
  showCopySuccess(button, originalText) {
    button.innerHTML = '<i class="fas fa-check"></i>Copied!';
    button.style.background = '#10b981';
    setTimeout(() => {
      button.innerHTML = originalText;
      button.style.background = '';
    }, 1500);
  },

  // Error feedback
  showCopyError(button, originalText) {
    button.innerHTML = '<i class="fas fa-exclamation-triangle"></i>Copy Failed';
    button.style.background = '#ef4444';
    setTimeout(() => {
      button.innerHTML = originalText;
      button.style.background = '';
    }, 2000);
  },

  copyTaskCommand(specName, taskId, event) {
    const command = `/spec-execute ${specName} ${taskId}`;
    this.copyCommand(command, event);
  },

  copyTaskPrompt(specName, taskId, event) {
    const prompt = `Execute task ${taskId} from spec ${specName}`;
    this.copyCommand(prompt, event);
  },

  // Steering notice functions
  toggleSteeringNotice() {
    this.steeringNoticeCollapsed = !this.steeringNoticeCollapsed;
  },

  // Theme functions
  cycleTheme() {
    this.toggleTheme();
  },

  // Requirements formatting
  formatUserStory(userStory) {
    if (!userStory) return '';
    // Simple HTML formatting for user stories
    return userStory.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  },

  formatAcceptanceCriteria(criteria) {
    if (!criteria) return '';
    // Simple HTML formatting for acceptance criteria
    return criteria.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  },

  scrollToRequirement(reqId) {
    const element = document.getElementById(`requirement-${reqId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      element.classList.add('bg-yellow-100', 'dark:bg-yellow-900/50');
      setTimeout(() => {
        element.classList.remove('bg-yellow-100', 'dark:bg-yellow-900/50');
      }, 2000);
    }
  },

  // Approval Editor Functions
  async openApprovalEditor(approval) {
    this.approvalEditor = {
      show: true,
      approvalId: approval.id,
      title: approval.title,
      content: 'Loading...',
      comments: [],
      viewMode: 'preview'  // Default to preview mode
    };

    // Fetch file content if filePath is provided, otherwise use embedded content
    if (approval.filePath) {
      try {
        const response = await fetch(`/api/approvals/${approval.id}/content`);
        const data = await response.json();
        this.approvalEditor.content = data.content;
      } catch (error) {
        console.error('Failed to load file content:', error);
        this.approvalEditor.content = 'Error loading file content. Please check if the file exists.';
      }
    } else {
      // Fallback for old format with embedded content
      this.approvalEditor.content = approval.content || 'No content available';
    }
  },

  closeApprovalEditor() {
    this.approvalEditor.show = false;
    this.approvalEditor.comments = [];
    this.closeCommentModal();
  },

  handleTextSelection(event) {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText.length > 0) {
      this.showCommentModal('selection', selectedText);
    }
  },

  addGeneralComment() {
    this.showCommentModal('general', '');
  },

  removeComment(index) {
    if (confirm('Remove this comment?')) {
      this.approvalEditor.comments.splice(index, 1);
    }
  },

  editComment(index) {
    const comment = this.approvalEditor.comments[index];
    
    this.commentModal = {
      show: true,
      type: comment.type,
      selectedText: comment.selectedText || '',
      comment: comment.comment,
      selectedColor: comment.highlightColor || (comment.type === 'selection' ? this.hexToColorObject(this.commentModal.customColorHex) : null),
      customColorHex: comment.highlightColor ? comment.highlightColor.border : this.commentModal.customColorHex,
      isEditing: true,
      editingIndex: index
    };
  },

  renderContentWithAnnotations(content) {
    let processedContent = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    // Apply highlights for selection comments
    const selectionComments = this.approvalEditor.comments.filter(c => c.type === 'selection' && c.selectedText && c.highlightColor);
    
    // Sort by text length (longest first) to handle overlapping selections better
    selectionComments.sort((a, b) => b.selectedText.length - a.selectedText.length);
    
    for (const comment of selectionComments) {
      const escapedText = comment.selectedText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
      
      // Create regex to find the text (case sensitive, exact match)
      const regex = new RegExp(this.escapeRegExp(escapedText), 'g');
      
      // Apply highlight styling
      const highlightStyle = `background-color: ${comment.highlightColor.bg}; border-bottom: 2px solid ${comment.highlightColor.border}; padding: 1px 2px; border-radius: 2px;`;
      const replacement = `<span style="${highlightStyle}" class="highlight-${comment.highlightColor.name}">${escapedText}</span>`;
      
      processedContent = processedContent.replace(regex, replacement);
    }
    
    return processedContent;
  },

  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  },

  // Color utility functions
  hexToColorObject(hex) {
    // Convert hex to RGB
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    // Create semi-transparent background and solid border
    const bg = `rgba(${r}, ${g}, ${b}, 0.3)`;
    const border = hex;
    const name = hex.toLowerCase();
    
    return { bg, border, name };
  },

  updateCustomColor(hex) {
    // Validate hex format
    if (this.isValidHex(hex)) {
      this.commentModal.customColorHex = hex.toUpperCase();
      this.commentModal.selectedColor = this.hexToColorObject(hex);
    }
  },

  isValidHex(hex) {
    return /^#[0-9A-Fa-f]{6}$/.test(hex);
  },

  selectPresetColor(hex) {
    this.updateCustomColor(hex);
  },

  // View mode functions
  setViewMode(mode) {
    this.approvalEditor.viewMode = mode;
  },

  renderMarkdownContent(content) {
    if (typeof window.markdownit === 'undefined') {
      console.warn('markdown-it library not available, returning escaped content');
      return this.escapeHtml(content);
    }
    
    try {
      // Ensure content is a string
      if (typeof content !== 'string') {
        console.error('Content is not a string:', typeof content, content);
        return this.escapeHtml(String(content));
      }

      // Initialize highlight.js if available
      if (typeof hljs !== 'undefined') {
        this.updateHighlightTheme();
      }

      // Create markdown-it instance with enhanced configuration
      const md = window.markdownit({
        html: true,           // Enable HTML tags in source
        breaks: true,         // Convert '\n' in paragraphs into <br>
        linkify: true,        // Autoconvert URL-like text to links
        typographer: true,    // Enable some language-neutral replacement + quotes beautification
        langPrefix: 'language-', // CSS language prefix for fenced blocks
        
        // Syntax highlighting function
        highlight: function (code, lang) {
          // Handle mermaid diagrams specially
          if (lang === 'mermaid') {
            const mermaidId = 'mermaid-' + Math.random().toString(36).substr(2, 9);
            return `<div class="mermaid" id="${mermaidId}">${code}</div>`;
          }
          
          // Use highlight.js for syntax highlighting
          if (typeof hljs !== 'undefined' && lang) {
            try {
              return `<pre class="hljs-code-block"><code class="hljs language-${lang}">` +
                     hljs.highlight(code, { language: lang }).value +
                     '</code></pre>';
            } catch (e) {
              console.warn('Language not supported for highlighting:', lang);
              // Fallback to auto-detection
              try {
                return `<pre class="hljs-code-block"><code class="hljs">` +
                       hljs.highlightAuto(code).value +
                       '</code></pre>';
              } catch (e2) {
                // Fallback to plain code
                return `<pre class="hljs-code-block"><code class="language-${lang}">` +
                       md.utils.escapeHtml(code) +
                       '</code></pre>';
              }
            }
          }
          
          // Return escaped code if no highlighting available
          return `<pre class="hljs-code-block"><code class="language-${lang || 'text'}">` +
                 md.utils.escapeHtml(code) +
                 '</code></pre>';
        }
      });
      
      // Render the content
      const html = md.render(content);
      
      // Initialize mermaid diagrams and highlight any remaining code blocks
      setTimeout(() => {
        this.initializeRenderedContent();
      }, 100);
      
      return html;
    } catch (error) {
      console.error('Markdown parsing error:', error, 'Content type:', typeof content);
      return this.escapeHtml(String(content));
    }
  },

  // Helper function to escape HTML
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  // Update highlight.js theme based on current theme
  updateHighlightTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    const lightTheme = document.getElementById('highlight-theme-light');
    const darkTheme = document.getElementById('highlight-theme-dark');
    
    if (lightTheme && darkTheme) {
      lightTheme.disabled = isDark;
      darkTheme.disabled = !isDark;
    }
  },

  // Initialize rendered content (mermaid, syntax highlighting, etc.)
  initializeRenderedContent() {
    // Initialize mermaid diagrams
    if (typeof mermaid !== 'undefined') {
      mermaid.initialize({ 
        startOnLoad: false,
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
        securityLevel: 'loose',
        fontFamily: 'inherit'
      });
      mermaid.run();
    }

    // Highlight any code blocks that weren't processed
    if (typeof hljs !== 'undefined') {
      document.querySelectorAll('pre code:not(.hljs)').forEach((block) => {
        hljs.highlightElement(block);
      });
    }
  },

  async submitApprovalWithFeedback(decision) {
    // For rejections, require comments
    if (decision === 'rejected' && this.approvalEditor.comments.length === 0) {
      alert('Please add at least one comment explaining why revisions are needed.');
      return;
    }
    
    // For approvals with comments, don't allow (comments mean feedback is needed)
    if (decision === 'approved' && this.approvalEditor.comments.length > 0) {
      alert('Cannot approve when comments exist. Use "Request Revisions" to provide feedback.');
      return;
    }

    const structuredFeedback = {
      decision: decision,
      comments: this.approvalEditor.comments,
      summary: this.generateFeedbackSummary(),
      timestamp: new Date().toISOString()
    };

    const endpoint = decision === 'approved' ? 'approve' : 'needs-revision';
    const actionText = decision === 'approved' ? 'approved' : 'marked for revision with detailed feedback';

    try {
      const result = await fetch(`/api/approvals/${this.approvalEditor.approvalId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          response: structuredFeedback.summary,
          annotations: JSON.stringify(structuredFeedback, null, 2),
          comments: this.approvalEditor.comments
        })
      });
      
      if (result.ok) {
        console.log(`Approval ${actionText}:`, this.approvalEditor.approvalId);
        this.closeApprovalEditor();
        await this.loadData();
      } else {
        alert(`Failed to ${decision === 'approved' ? 'approve' : 'reject'} request. Please try again.`);
      }
    } catch (error) {
      console.error(`Failed to ${decision === 'approved' ? 'approve' : 'reject'} request:`, error);
      alert(`Failed to ${decision === 'approved' ? 'approve' : 'reject'} request. Please try again.`);
    }
  },

  generateFeedbackSummary() {
    const comments = this.approvalEditor.comments;
    if (comments.length === 0) {
      return 'No specific feedback provided';
    }

    const generalComments = comments.filter(c => c.type === 'general');
    const selectionComments = comments.filter(c => c.type === 'selection');

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
  },

  // Comment modal functions
  showCommentModal(type, selectedText = '') {
    this.commentModal = {
      show: true,
      type: type,
      selectedText: selectedText,
      comment: '',
      selectedColor: type === 'selection' ? this.hexToColorObject(this.commentModal.customColorHex) : null,
      customColorHex: this.commentModal.customColorHex || '#FFEB3B'
    };
    
    // Clear text selection after showing modal
    if (type === 'selection') {
      setTimeout(() => {
        const selection = window.getSelection();
        selection.removeAllRanges();
      }, 100);
    }
  },

  closeCommentModal() {
    this.commentModal.show = false;
    this.commentModal.comment = '';
    this.commentModal.selectedText = '';
    this.commentModal.selectedColor = null;
    this.commentModal.isEditing = false;
    this.commentModal.editingIndex = -1;
    // Keep customColorHex for next use
  },

  submitComment() {
    if (!this.commentModal.comment.trim()) {
      alert('Please enter a comment');
      return;
    }

    if (this.commentModal.isEditing) {
      // Update existing comment
      const existingComment = this.approvalEditor.comments[this.commentModal.editingIndex];
      existingComment.comment = this.commentModal.comment.trim();
      
      // Update color if it's a selection comment
      if (this.commentModal.type === 'selection') {
        existingComment.highlightColor = this.commentModal.selectedColor;
      }
    } else {
      // Create new comment
      const comment = {
        type: this.commentModal.type,
        comment: this.commentModal.comment.trim(),
        timestamp: new Date().toISOString()
      };

      if (this.commentModal.type === 'selection') {
        comment.selectedText = this.commentModal.selectedText;
        comment.highlightColor = this.commentModal.selectedColor;
      }

      this.approvalEditor.comments.push(comment);
    }

    this.closeCommentModal();
  },

  // Approval preview functions
  async loadApprovalPreview(approvalId) {
    if (this.approvalPreviews[approvalId]) {
      return this.approvalPreviews[approvalId];
    }

    try {
      const response = await fetch(`/api/approvals/${approvalId}/content`);
      const data = await response.json();
      const preview = data.content.substring(0, 300) + (data.content.length > 300 ? '...' : '');
      this.approvalPreviews[approvalId] = preview;
      return preview;
    } catch (error) {
      console.error('Failed to load approval preview:', error);
      this.approvalPreviews[approvalId] = 'Error loading preview';
      return 'Error loading preview';
    }
  },

  getApprovalPreview(approval) {
    if (!approval.filePath) {
      return approval.content ? approval.content.substring(0, 300) + (approval.content.length > 300 ? '...' : '') : 'No content available';
    }
    
    if (this.approvalPreviews[approval.id]) {
      return this.approvalPreviews[approval.id];
    }
    
    // Load preview asynchronously
    this.loadApprovalPreview(approval.id);
    return 'Loading preview...';
  },

  // Spec Document Viewer
  async viewSpecDocument(specName, documentType = 'requirements') {
    this.specViewer.show = true;
    this.specViewer.loading = true;
    this.specViewer.specName = specName;
    this.specViewer.title = `${specName.replace(/-/g, ' ')} - Spec Documents`;
    this.specViewer.activeDocument = documentType;

    try {
      // Load all documents for this spec
      const response = await fetch(`/api/specs/${specName}/all`);
      const documents = await response.json();
      this.specViewer.documents = documents;
      
      // Set content for active document
      const activeDoc = documents[documentType];
      this.specViewer.content = activeDoc ? activeDoc.content : null;
      
    } catch (error) {
      console.error('Failed to load spec documents:', error);
      this.specViewer.content = null;
    } finally {
      this.specViewer.loading = false;
    }
  },

  switchSpecDocument(documentType) {
    this.specViewer.activeDocument = documentType;
    const activeDoc = this.specViewer.documents[documentType];
    this.specViewer.content = activeDoc ? activeDoc.content : null;
  },

  closeSpecViewer() {
    this.specViewer.show = false;
    this.specViewer.content = '';
    this.specViewer.documents = {};
  },

  // Task Progress Viewer
  async viewTaskProgress(specName) {
    this.taskProgressViewer.show = true;
    this.taskProgressViewer.loading = true;
    this.taskProgressViewer.specName = specName;
    this.taskProgressViewer.data = null;

    try {
      const response = await fetch(`/api/specs/${specName}/tasks/progress`);
      if (response.ok) {
        this.taskProgressViewer.data = await response.json();
      } else {
        console.error('Failed to load task progress:', response.status);
      }
    } catch (error) {
      console.error('Failed to load task progress:', error);
    } finally {
      this.taskProgressViewer.loading = false;
    }
  },

  closeTaskProgressViewer() {
    this.taskProgressViewer.show = false;
    this.taskProgressViewer.data = null;
  },

  // Real-time refresh methods
  async refreshSpecViewer() {
    if (!this.specViewer.show || !this.specViewer.specName) return;
    
    try {
      const response = await fetch(`/api/specs/${this.specViewer.specName}/all`);
      const documents = await response.json();
      this.specViewer.documents = documents;
      
      // Update current document content
      const activeDoc = documents[this.specViewer.activeDocument];
      this.specViewer.content = activeDoc ? activeDoc.content : null;
    } catch (error) {
      console.error('Failed to refresh spec viewer:', error);
    }
  },

  async refreshTaskProgressViewer() {
    if (!this.taskProgressViewer.show || !this.taskProgressViewer.specName) return;
    
    try {
      const response = await fetch(`/api/specs/${this.taskProgressViewer.specName}/tasks/progress`);
      if (response.ok) {
        this.taskProgressViewer.data = await response.json();
      }
    } catch (error) {
      console.error('Failed to refresh task progress viewer:', error);
    }
  },

  scrollToNextPendingTask() {
    if (!this.taskProgressViewer.data?.taskList) return;
    
    // Find the next pending task (not completed, not in progress, and not a header)
    const pendingTasks = this.taskProgressViewer.data.taskList.filter(task => 
      !task.completed && !task.inProgress && !task.isHeader
    );
    
    if (pendingTasks.length === 0) {
      // If no pending tasks, find the in-progress task (that's not a header)
      const inProgressTask = this.taskProgressViewer.data.taskList.find(task => 
        task.inProgress && !task.isHeader
      );
      if (inProgressTask) {
        this.scrollToTask(inProgressTask.id);
      }
      return;
    }
    
    // Scroll to the first pending task
    this.scrollToTask(pendingTasks[0].id);
  },

  scrollToTask(taskId) {
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    if (taskElement) {
      taskElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      
      // Add a brief highlight effect
      taskElement.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50');
      setTimeout(() => {
        taskElement.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50');
      }, 2000);
    }
  },

  async refreshMarkdownPreview() {
    if (!this.markdownPreview.show || !this.markdownPreview.specName) return;
    
    try {
      const response = await fetch(`/api/specs/${this.markdownPreview.specName}/all`);
      const documents = await response.json();
      this.markdownPreview.documents = documents;
      
      // Update current document content
      const activeDoc = documents[this.markdownPreview.activeDocument];
      this.markdownPreview.content = activeDoc ? activeDoc.content : 'No content available';
    } catch (error) {
      console.error('Failed to refresh markdown preview:', error);
    }
  }
}).mount('#app');