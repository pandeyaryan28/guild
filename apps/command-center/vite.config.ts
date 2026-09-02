import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { createHmac, timingSafeEqual } from 'crypto';
import dataHandler from './api/command-center/data';
import subHandler from './api/command-center/subscription';

function devAuthPlugin() {
  const MASTER_CODE = process.env.SUPERADMIN_MASTER_CODE || process.env.ADMIN_CODE || '2809';
  const JWT_SECRET = process.env.SUPERADMIN_JWT_SECRET || 'guild-superadmin-secret-key-2809-alpha';

  function generateSessionToken(email: string): { token: string; expiresAt: number } {
    const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7;
    const payload = JSON.stringify({ email, role: 'superadmin', exp: expiresAt });
    const base64Payload = Buffer.from(payload).toString('base64url');
    const signature = createHmac('sha256', JWT_SECRET).update(base64Payload).digest('base64url');
    return { token: `${base64Payload}.${signature}`, expiresAt };
  }

  function verifySessionToken(token: string): { valid: boolean; email?: string } {
    try {
      const parts = token.split('.');
      if (parts.length !== 2) return { valid: false };
      const [base64Payload, signature] = parts;
      const expectedSig = createHmac('sha256', JWT_SECRET).update(base64Payload).digest('base64url');
      if (signature.length !== expectedSig.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
        return { valid: false };
      }
      const payload = JSON.parse(Buffer.from(base64Payload, 'base64url').toString('utf8'));
      if (!payload.exp || Date.now() > payload.exp) return { valid: false };
      return { valid: true, email: payload.email };
    } catch {
      return { valid: false };
    }
  }

  function adaptRes(res: any) {
    res.status = (code: number) => {
      res.statusCode = code;
      return res;
    };
    res.json = (data: any) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
      return res;
    };
    return res;
  }

  return {
    name: 'dev-auth-middleware',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url === '/api/auth/verify' && req.method === 'POST') {
          let bodyStr = '';
          req.on('data', (chunk: any) => {
            bodyStr += chunk;
          });
          req.on('end', () => {
            try {
              const { code } = JSON.parse(bodyStr || '{}');
              const cleanInput = (code || '').toString().trim();
              const cleanTarget = MASTER_CODE.trim();

              let isValid = false;
              if (cleanInput.length === cleanTarget.length) {
                isValid = timingSafeEqual(Buffer.from(cleanInput), Buffer.from(cleanTarget));
              }

              if (!isValid) {
                res.statusCode = 401;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'Invalid master authorization code.' }));
                return;
              }

              const email = 'pandeyaryan28@gmail.com';
              const { token, expiresAt } = generateSessionToken(email);

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  success: true,
                  token,
                  expiresAt,
                  adminProfile: {
                    uid: 'superadmin_aryan',
                    email,
                    name: 'Aryan Pandey',
                    role: 'superadmin',
                    isSuperAdmin: true,
                    permissions: [
                      'all',
                      'view_metrics',
                      'manage_workspaces',
                      'manage_users',
                      'manage_subscriptions',
                      'override_quotas',
                      'view_audit_logs',
                      'export_data',
                      'manage_platform_admins',
                    ],
                    active: true,
                  },
                })
              );
            } catch (err: any) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'Malformed request' }));
            }
          });
          return;
        }

        if (req.url === '/api/auth/session') {
          let bodyStr = '';
          req.on('data', (chunk: any) => {
            bodyStr += chunk;
          });
          req.on('end', () => {
            try {
              const authHeader = req.headers.authorization || '';
              const parsedBody = bodyStr ? JSON.parse(bodyStr) : {};
              const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : (parsedBody.token || '');
              const { valid, email } = verifySessionToken(token);

              if (!valid || !email) {
                res.statusCode = 401;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'Session expired or invalid' }));
                return;
              }

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  success: true,
                  adminProfile: {
                    uid: 'superadmin_aryan',
                    email,
                    name: 'Aryan Pandey',
                    role: 'superadmin',
                    isSuperAdmin: true,
                    permissions: [
                      'all',
                      'view_metrics',
                      'manage_workspaces',
                      'manage_users',
                      'manage_subscriptions',
                      'override_quotas',
                      'view_audit_logs',
                      'export_data',
                      'manage_platform_admins',
                    ],
                    active: true,
                  },
                })
              );
            } catch {
              res.statusCode = 401;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'Invalid session' }));
            }
          });
          return;
        }

        if (req.url === '/api/command-center/data') {
          adaptRes(res);
          await dataHandler(req, res);
          return;
        }

        if (req.url === '/api/command-center/subscription' && req.method === 'POST') {
          let bodyStr = '';
          req.on('data', (chunk: any) => {
            bodyStr += chunk;
          });
          req.on('end', async () => {
            try {
              req.body = JSON.parse(bodyStr || '{}');
              adaptRes(res);
              await subHandler(req, res);
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  return {
    plugins: [react(), tailwindcss(), devAuthPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-lucide';
              }
              if (id.includes('motion') || id.includes('framer-motion')) {
                return 'vendor-motion';
              }
              if (id.includes('react-router') || id.includes('react-router-dom')) {
                return 'vendor-router';
              }
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor-react';
              }
              return 'vendor-core';
            }
          },
        },
      },
    },
    server: {
      port: 3003,
      headers: {
        'Cross-Origin-Opener-Policy': 'unsafe-none',
        'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
      },
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
