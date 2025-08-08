import { createState } from './modules/state.js';
import { initTheme, toggleTheme, applyTheme } from './modules/theme.js';
import { loadInitialData } from './modules/api.js';
import { connectWebSocket } from './modules/ws.js';
import { renderMarkdown, renderMarkdownContent, initializeRenderedContent } from './modules/markdown.js';
import { formatDate, escapeHtml, refresh as hardRefresh } from './modules/utils.js';
import { copyCommand, copyTaskCommand, copyTaskPrompt } from './modules/clipboard.js';
import { mountApprovalMethods } from './modules/approvals.js';
import { mountSpecMethods } from './modules/specs.js';
import { mountTaskMethods } from './modules/tasks.js';
import { formatUserStory, formatAcceptanceCriteria, scrollToRequirement } from './modules/formatting.js';

// Compose PetiteVue app with modular methods while preserving the existing template API
const appConfig = {
  ...createState(),

  async init() {
    initTheme(this);
    await this.loadData();
    connectWebSocket(this);
  },

  // Theme
  initTheme() { initTheme(this); },
  toggleTheme() { toggleTheme(this); },
  applyTheme() { applyTheme(this); },
  cycleTheme() { this.toggleTheme(); },

  // Data
  async loadData() {
    try {
      await loadInitialData(this);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to load data:', e);
    }
  },

  // Markdown helpers
  renderMarkdown,
  renderMarkdownContent(content) { return renderMarkdownContent(this, content); },
  initializeRenderedContent,
  escapeHtml,

  // Utils
  formatDate,
  refresh: hardRefresh,

  // Clipboard
  copyCommand(command, event) { copyCommand(this, command, event); },
  copyTaskCommand(specName, taskId, event) { copyTaskCommand(this, specName, taskId, event); },
  copyTaskPrompt(specName, taskId, event) { copyTaskPrompt(this, specName, taskId, event); },

  // Steering notice
  toggleSteeringNotice() { this.steeringNoticeCollapsed = !this.steeringNoticeCollapsed; },

  // Requirements formatting
  formatUserStory,
  formatAcceptanceCriteria,
  scrollToRequirement,
};

// Mount domain-specific method groups
mountApprovalMethods(appConfig);
mountSpecMethods(appConfig);
mountTaskMethods(appConfig);

// Create the PetiteVue app
PetiteVue.createApp(appConfig).mount('#app');


