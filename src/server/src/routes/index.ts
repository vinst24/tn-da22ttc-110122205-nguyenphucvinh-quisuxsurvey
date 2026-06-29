import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { categoryRouter } from './category.routes.js';
import { dashboardRouter } from './dashboard.routes.js';
import { healthRouter } from './health.routes.js';
import { participantRouter } from './participant.routes.js';
import { questionRouter } from './question.routes.js';
import { responseRouter } from './response.routes.js';
import { surveyRouter } from './survey.routes.js';

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(authRouter);
apiRouter.use(surveyRouter);
apiRouter.use(categoryRouter);
apiRouter.use(questionRouter);
apiRouter.use(responseRouter);
apiRouter.use(dashboardRouter);
apiRouter.use(participantRouter);
