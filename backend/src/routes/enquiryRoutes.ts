import { Router } from 'express';
import { enquiryController } from '../controllers/enquiryController';

const router = Router();

router.get('/', enquiryController.getEnquiries);
router.post('/', enquiryController.createEnquiry);
router.get('/export/csv', enquiryController.exportCSV);
router.get('/:id', enquiryController.getEnquiryById);

export default router;
