import { Router } from 'express';
import { financeController } from '../controllers/financeController';

const router = Router();

router.get('/summary', financeController.getFeesSummary);
router.get('/ledger', financeController.getFeesLedger);
router.get('/export/csv', financeController.exportFeesCsv);

export default router;
