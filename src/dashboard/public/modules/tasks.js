import { fetchTaskProgress } from './api.js';

export function mountTaskMethods(app) {
  app.getVisibleTasks = function(...args) { return getVisibleTasks.apply(this, args); };
  app.getCompletedTaskCount = function(...args) { return getCompletedTaskCount.apply(this, args); };
  app.areCompletedTasksCollapsed = function(...args) { return areCompletedTasksCollapsed.apply(this, args); };
  app.toggleCompletedTasks = function(...args) { return toggleCompletedTasks.apply(this, args); };
  app.viewTaskProgress = function(...args) { return viewTaskProgress.apply(this, args); };
  app.closeTaskProgressViewer = function(...args) { return closeTaskProgressViewer.apply(this, args); };
  app.refreshTaskProgressViewer = function(...args) { return refreshTaskProgressViewer.apply(this, args); };
  app.scrollToNextPendingTask = function(...args) { return scrollToNextPendingTask.apply(this, args); };
  app.scrollToTask = function(...args) { return scrollToTask.apply(this, args); };
}

function getVisibleTasks(spec) {
  if (!spec.tasks?.taskList) return [];
  const collapsed = this.areCompletedTasksCollapsed(spec.name);
  if (!collapsed) return spec.tasks.taskList;
  return spec.tasks.taskList.filter((task) => !task.completed);
}

function getCompletedTaskCount(spec) {
  if (!spec.tasks?.taskList) return 0;
  return spec.tasks.taskList.filter((task) => task.completed).length;
}

function areCompletedTasksCollapsed(specName) {
  return this.collapsedCompletedTasks.includes(specName);
}

function toggleCompletedTasks(specName) {
  const index = this.collapsedCompletedTasks.indexOf(specName);
  if (index > -1) this.collapsedCompletedTasks.splice(index, 1);
  else this.collapsedCompletedTasks.push(specName);
}

async function viewTaskProgress(specName) {
  this.taskProgressViewer.show = true;
  this.taskProgressViewer.loading = true;
  this.taskProgressViewer.specName = specName;
  this.taskProgressViewer.data = null;
  try {
    this.taskProgressViewer.data = await fetchTaskProgress(specName);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load task progress:', error);
  } finally {
    this.taskProgressViewer.loading = false;
  }
}

function closeTaskProgressViewer() {
  this.taskProgressViewer.show = false;
  this.taskProgressViewer.data = null;
}

async function refreshTaskProgressViewer() {
  if (!this.taskProgressViewer.show || !this.taskProgressViewer.specName) return;
  try {
    this.taskProgressViewer.data = await fetchTaskProgress(this.taskProgressViewer.specName);
  } catch {
    // ignore
  }
}

function scrollToNextPendingTask() {
  if (!this.taskProgressViewer.data?.taskList) return;
  const pendingTasks = this.taskProgressViewer.data.taskList.filter((task) => !task.completed && !task.inProgress && !task.isHeader);
  if (pendingTasks.length === 0) {
    const inProgressTask = this.taskProgressViewer.data.taskList.find((task) => task.inProgress && !task.isHeader);
    if (inProgressTask) this.scrollToTask(inProgressTask.id);
    return;
  }
  this.scrollToTask(pendingTasks[0].id);
}

function scrollToTask(taskId) {
  const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
  if (taskElement) {
    taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    taskElement.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50');
    setTimeout(() => {
      taskElement.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50');
    }, 2000);
  }
}


