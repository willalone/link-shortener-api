import { Router } from 'express';
import { authRouter } from '../../modules/auth/auth.routes.js';
import { linksRouter } from '../../modules/links/links.routes.js';
import { usersRouter } from '../../modules/users/users.routes.js';
import { redirectRouter } from '../../modules/links/redirect.routes.js';
import { qrRouter } from '../../modules/links/qr.routes.js';
import { adminRouter } from '../../modules/admin/admin.routes.js';

export const v1Router = Router();

v1Router.use('/auth', authRouter);
v1Router.use('/links', linksRouter);
v1Router.use('/users', usersRouter);
v1Router.use('/redirect', redirectRouter);
v1Router.use('/qr', qrRouter);
v1Router.use('/admin', adminRouter);
