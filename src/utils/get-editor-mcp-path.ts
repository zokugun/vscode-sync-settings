import path from 'node:path';

export function getEditorMcpPath(userDataPath: string): string {
	return path.join(userDataPath, 'mcp.json');
}
