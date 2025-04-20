import { MemFileSystem, ws } from '../rewires/webdav.js';

const PASSWORD = 'pa$$w0rd!';
const PORT = 9988;
const USERNAME = 'webdav-user';

type WebDAVServer = {
	start: () => Promise<void>;
	stop: () => Promise<void>;
};

function createWebDAVServer(): WebDAVServer {
	const userManager = new ws.SimpleUserManager();
	const user = userManager.addUser(USERNAME, PASSWORD);
	const auth = new ws.HTTPBasicAuthentication(userManager);

	const privilegeManager = new ws.SimplePathPrivilegeManager();
	privilegeManager.setRights(user, '/', ['all']);

	const server = new ws.WebDAVServer({
		port: PORT,
		httpAuthentication: auth,
		privilegeManager,
		maxRequestDepth: Number.POSITIVE_INFINITY,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'HEAD, GET, PUT, PROPFIND, DELETE, OPTIONS, MKCOL, MOVE, COPY',
			'Access-Control-Allow-Headers': 'Accept, Authorization, Content-Type, Content-Length, Depth',
		},
	});

	return {
		async start() {
			return new Promise((resolve: () => void) => {
				const fs = new MemFileSystem('/webdav');

				server.setFileSystem('/webdav/server', fs, () => {
					server.start(resolve);
				});
			});
		},

		async stop() {
			return new Promise((resolve: () => void) => {
				server.stop(resolve);
			});
		},
	};
}

export {
	type WebDAVServer,
	createWebDAVServer,
};
