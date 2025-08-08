// Initial reactive state for the dashboard app
export function createState() {
  return {
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
      documents: {}, // Cache for all spec documents
    },

    approvalEditor: {
      show: false,
      approvalId: null,
      title: '',
      content: '',
      comments: [],
      viewMode: 'annotate', // 'preview' or 'annotate'
    },

    commentModal: {
      show: false,
      type: 'general', // 'general' or 'selection'
      selectedText: '',
      comment: '',
      selectedColor: null, // User-selected highlight color
      customColorHex: '#FFEB3B', // Current custom color hex value
      isEditing: false, // Whether we're editing an existing comment
      editingIndex: -1, // Index of comment being edited
    },

    approvalPreviews: {}, // Cache for approval preview content

    specViewer: {
      show: false,
      loading: false,
      specName: '',
      title: '',
      content: '',
      activeDocument: 'requirements', // 'requirements', 'design', 'tasks'
      documents: {}, // Cache for all spec documents
    },

    taskProgressViewer: {
      show: false,
      loading: false,
      specName: '',
      data: null,
    },

    // Preset color suggestions
    presetColors: [
      '#FFEB3B',
      '#FFC107',
      '#FF9800',
      '#FF5722',
      '#F44336',
      '#E91E63',
      '#9C27B0',
      '#673AB7',
      '#3F51B5',
      '#2196F3',
      '#03A9F4',
      '#00BCD4',
      '#009688',
      '#4CAF50',
      '#8BC34A',
      '#CDDC39',
      '#795548',
      '#9E9E9E',
    ],
  };
}


