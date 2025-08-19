import ReactDOM from 'react-dom/client';
import { CommentModal } from '@/components/CommentModal';
import '@/globals.css';

interface SaveCommentMessage {
  command: 'save';
  comment: string;
  color: string;
}

interface CancelMessage {
  command: 'cancel';
}

// Type for webview communication  
// type WebviewMessage = SaveCommentMessage | CancelMessage;

// Extend the existing VSCode API interface
declare global {
  interface Window {
    initialState?: {
      selectedText: string;
    };
  }
}

const vscode = window.acquireVsCodeApi?.();

function CommentModalApp() {
  // Get initial data from webview
  const selectedText = window.initialState?.selectedText || 'No text selected';

  const handleSave = (comment: string, color: string) => {
    const message: SaveCommentMessage = {
      command: 'save',
      comment,
      color
    };
    vscode?.postMessage(message);
  };

  const handleCancel = () => {
    const message: CancelMessage = {
      command: 'cancel'
    };
    vscode?.postMessage(message);
  };

  return (
    <CommentModal
      selectedText={selectedText}
      onSave={handleSave}
      onCancel={handleCancel}
    />
  );
}

// Mount the React app
const container = document.getElementById('root');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(<CommentModalApp />);
}