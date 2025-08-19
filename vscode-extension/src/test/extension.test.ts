import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { ApprovalEditorService } from '../extension/services/ApprovalEditorService';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});

	suite('Path Resolution Tests', () => {
		let tempDir: string;
		let approvalEditorService: ApprovalEditorService;

		suiteSetup(async () => {
			// Create a temporary directory structure for testing
			tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-workflow-test-'));

			// Create test directory structure
			const specWorkflowDir = path.join(tempDir, '.spec-workflow');
			const specsDir = path.join(specWorkflowDir, 'specs');
			const testDir = path.join(specWorkflowDir, 'test');

			fs.mkdirSync(specWorkflowDir, { recursive: true });
			fs.mkdirSync(specsDir, { recursive: true });
			fs.mkdirSync(testDir, { recursive: true });

			// Create test files
			fs.writeFileSync(path.join(specsDir, 'tasks.md'), '# Test Tasks');
			fs.writeFileSync(path.join(testDir, 'tasks.md'), '# Test Tasks in Test Dir');
			fs.writeFileSync(path.join(tempDir, 'root-tasks.md'), '# Root Tasks');

			approvalEditorService = new ApprovalEditorService();
		});

		suiteTeardown(() => {
			// Clean up temporary directory
			if (tempDir && fs.existsSync(tempDir)) {
				fs.rmSync(tempDir, { recursive: true, force: true });
			}
		});

		test('should resolve paths with forward slashes', async () => {
			const testPath = '.spec-workflow/specs/tasks.md';
			const result = await (approvalEditorService as any).resolveApprovalFilePath(testPath, tempDir);

			assert.ok(result, 'Should resolve path with forward slashes');
			assert.ok(result.includes('specs'), 'Should resolve to specs directory');
		});

		test('should resolve paths with backslashes', async () => {
			const testPath = '.spec-workflow\\test\\tasks.md';
			const result = await (approvalEditorService as any).resolveApprovalFilePath(testPath, tempDir);

			assert.ok(result, 'Should resolve path with backslashes');
			assert.ok(result.includes('test'), 'Should resolve to test directory');
		});

		test('should resolve relative paths', async () => {
			const testPath = 'root-tasks.md';
			const result = await (approvalEditorService as any).resolveApprovalFilePath(testPath, tempDir);

			assert.ok(result, 'Should resolve relative path');
			assert.ok(result.includes('root-tasks.md'), 'Should resolve to root file');
		});

		test('should handle missing files gracefully', async () => {
			const testPath = '.spec-workflow/nonexistent/file.md';
			const result = await (approvalEditorService as any).resolveApprovalFilePath(testPath, tempDir);

			assert.strictEqual(result, null, 'Should return null for nonexistent files');
		});
	});
});
