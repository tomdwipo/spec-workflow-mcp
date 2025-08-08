export function copyCommand(app, command, event) {
  const button = event.target.closest('button');
  const originalText = button.innerHTML;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(command)
      .then(() => showCopySuccess(button, originalText))
      .catch(() => fallbackCopy(app, command, button, originalText));
  } else {
    fallbackCopy(app, command, button, originalText);
  }
}

function fallbackCopy(app, text, button, originalText) {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, 99999);
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (successful) showCopySuccess(button, originalText);
    else showCopyError(button, originalText);
  } catch {
    showCopyError(button, originalText);
  }
}

function showCopySuccess(button, originalText) {
  button.innerHTML = '<i class="fas fa-check"></i>Copied!';
  button.style.background = '#10b981';
  setTimeout(() => {
    button.innerHTML = originalText;
    button.style.background = '';
  }, 1500);
}

function showCopyError(button, originalText) {
  button.innerHTML = '<i class="fas fa-exclamation-triangle"></i>Copy Failed';
  button.style.background = '#ef4444';
  setTimeout(() => {
    button.innerHTML = originalText;
    button.style.background = '';
  }, 2000);
}

export function copyTaskCommand(app, specName, taskId, event) {
  const command = `/spec-execute ${specName} ${taskId}`;
  copyCommand(app, command, event);
}

export function copyTaskPrompt(app, specName, taskId, event) {
  const prompt = `Execute task ${taskId} from spec ${specName}`;
  copyCommand(app, prompt, event);
}


