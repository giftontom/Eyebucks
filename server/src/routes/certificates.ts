import { Router, Request, Response, NextFunction } from 'express';
import { certificateService } from '../services/certificateService';
import { AppError } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /api/certificates/:certificateNumber.pdf
 * Download a certificate PDF
 */
router.get('/:certificateNumber.pdf', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { certificateNumber } = req.params;

    // Check if certificate exists
    if (!certificateService.certificateExists(certificateNumber)) {
      throw new AppError('Certificate not found', 404);
    }

    // Get certificate file path
    const filepath = certificateService.getCertificatePath(certificateNumber);

    // Send file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${certificateNumber}.pdf"`);
    res.sendFile(filepath);
  } catch (error) {
    next(error);
  }
});

export default router;
