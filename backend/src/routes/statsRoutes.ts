import { Router } from 'express';
import { enquiryController } from '../controllers/enquiryController';

const router = Router();

router.get('/today', enquiryController.getTodayStats);

export default router;
