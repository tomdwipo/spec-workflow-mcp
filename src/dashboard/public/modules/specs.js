import { fetchAllSpecDocuments } from './api.js';

export function mountSpecMethods(app) {
  app.viewMarkdown = function(...args) { return viewMarkdown.apply(this, args); };
  app.switchMarkdownDocument = function(...args) { return switchMarkdownDocument.apply(this, args); };
  app.closeMarkdownPreview = function(...args) { return closeMarkdownPreview.apply(this, args); };
  app.viewSpecDocument = function(...args) { return viewSpecDocument.apply(this, args); };
  app.switchSpecDocument = function(...args) { return switchSpecDocument.apply(this, args); };
  app.closeSpecViewer = function(...args) { return closeSpecViewer.apply(this, args); };
  app.refreshSpecViewer = function(...args) { return refreshSpecViewer.apply(this, args); };
  app.refreshMarkdownPreview = function(...args) { return refreshMarkdownPreview.apply(this, args); };
}

async function viewMarkdown(specName, document) {
  this.markdownPreview.show = true;
  this.markdownPreview.loading = true;
  this.markdownPreview.specName = specName;
  this.markdownPreview.title = `${specName.replace(/-/g, ' ')} - Source Documents`;
  this.markdownPreview.activeDocument = document;
  try {
    const documents = await fetchAllSpecDocuments(specName);
    this.markdownPreview.documents = documents;
    const activeDoc = documents[document];
    this.markdownPreview.content = activeDoc ? activeDoc.content : 'No content available';
  } catch {
    this.markdownPreview.content = 'Error loading content';
  } finally {
    this.markdownPreview.loading = false;
  }
}

function switchMarkdownDocument(documentType) {
  this.markdownPreview.activeDocument = documentType;
  const activeDoc = this.markdownPreview.documents[documentType];
  this.markdownPreview.content = activeDoc ? activeDoc.content : 'No content available';
}

function closeMarkdownPreview() {
  this.markdownPreview.show = false;
  this.markdownPreview.content = '';
  this.markdownPreview.documents = {};
}

async function viewSpecDocument(specName, documentType = 'requirements') {
  this.specViewer.show = true;
  this.specViewer.loading = true;
  this.specViewer.specName = specName;
  this.specViewer.title = `${specName.replace(/-/g, ' ')} - Spec Documents`;
  this.specViewer.activeDocument = documentType;
  try {
    const documents = await fetchAllSpecDocuments(specName);
    this.specViewer.documents = documents;
    const activeDoc = documents[documentType];
    this.specViewer.content = activeDoc ? activeDoc.content : null;
  } catch {
    this.specViewer.content = null;
  } finally {
    this.specViewer.loading = false;
  }
}

function switchSpecDocument(documentType) {
  this.specViewer.activeDocument = documentType;
  const activeDoc = this.specViewer.documents[documentType];
  this.specViewer.content = activeDoc ? activeDoc.content : null;
}

function closeSpecViewer() {
  this.specViewer.show = false;
  this.specViewer.content = '';
  this.specViewer.documents = {};
}

async function refreshSpecViewer() {
  if (!this.specViewer.show || !this.specViewer.specName) return;
  try {
    const documents = await fetchAllSpecDocuments(this.specViewer.specName);
    this.specViewer.documents = documents;
    const activeDoc = documents[this.specViewer.activeDocument];
    this.specViewer.content = activeDoc ? activeDoc.content : null;
  } catch {
    // ignore
  }
}

async function refreshMarkdownPreview() {
  if (!this.markdownPreview.show || !this.markdownPreview.specName) return;
  try {
    const documents = await fetchAllSpecDocuments(this.markdownPreview.specName);
    this.markdownPreview.documents = documents;
    const activeDoc = documents[this.markdownPreview.activeDocument];
    this.markdownPreview.content = activeDoc ? activeDoc.content : 'No content available';
  } catch {
    // ignore
  }
}


