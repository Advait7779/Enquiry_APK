import { Router } from 'express';
import { lawyerController } from '../controllers/lawyerController';

const router = Router();

router.get('/', lawyerController.getLawyers);
router.post('/', lawyerController.createLawyer);
router.patch('/:id', lawyerController.updateLawyer);
router.delete('/:id', lawyerController.deleteLawyer);

export default router;
