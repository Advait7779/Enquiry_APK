import { Router } from 'express';
import { settingsController } from '../controllers/settingsController';

const router = Router();

router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);
router.post('/test', settingsController.testChannel);
router.get('/jobs', settingsController.getNotificationJobs);
router.post('/jobs/:id/retry', settingsController.retryNotificationJob);

export default router;
