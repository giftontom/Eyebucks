import jsPDF from 'jspdf';
import * as fs from 'fs';
import * as path from 'path';

interface CertificateData {
  studentName: string;
  courseTitle: string;
  certificateNumber: string;
  issueDate: Date;
  completionDate: Date;
}

/**
 * Certificate Generation Service
 * Generates professional PDF certificates for course completion
 */
export const certificateService = {
  /**
   * Ensure certificates directory exists
   */
  ensureCertificatesDirectory(): string {
    const certDir = path.join(__dirname, '../../certificates');

    if (!fs.existsSync(certDir)) {
      fs.mkdirSync(certDir, { recursive: true });
      console.log('[Certificate] Created certificates directory:', certDir);
    }

    return certDir;
  },

  /**
   * Generate a certificate PDF
   * @returns Path to the generated certificate file
   */
  async generateCertificate(data: CertificateData): Promise<string> {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();

    // Background gradient effect (using rectangles)
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(0, 0, width, height, 'F');

    // Border design
    doc.setLineWidth(0.5);
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.rect(10, 10, width - 20, height - 20);

    doc.setLineWidth(0.3);
    doc.setDrawColor(239, 68, 68); // brand red
    doc.rect(12, 12, width - 24, height - 24);

    // Header - Eyebuckz Logo/Title
    doc.setFontSize(32);
    doc.setTextColor(31, 41, 55); // gray-800
    doc.setFont('helvetica', 'bold');
    doc.text('Eyebuckz', width / 2, 30, { align: 'center' });

    // Subtitle
    doc.setFontSize(14);
    doc.setTextColor(107, 114, 128); // gray-500
    doc.setFont('helvetica', 'normal');
    doc.text('Certificate of Completion', width / 2, 40, { align: 'center' });

    // Certificate icon/decoration
    doc.setFontSize(40);
    doc.text('🎓', width / 2, 55, { align: 'center' });

    // "This certifies that" text
    doc.setFontSize(12);
    doc.setTextColor(75, 85, 99); // gray-600
    doc.text('This is to certify that', width / 2, 70, { align: 'center' });

    // Student Name (prominent)
    doc.setFontSize(28);
    doc.setTextColor(31, 41, 55); // gray-800
    doc.setFont('helvetica', 'bold');
    doc.text(data.studentName, width / 2, 85, { align: 'center' });

    // Underline student name
    const nameWidth = doc.getTextWidth(data.studentName);
    doc.setLineWidth(0.5);
    doc.setDrawColor(239, 68, 68); // brand red
    doc.line(width / 2 - nameWidth / 2, 87, width / 2 + nameWidth / 2, 87);

    // "Has successfully completed" text
    doc.setFontSize(12);
    doc.setTextColor(75, 85, 99); // gray-600
    doc.setFont('helvetica', 'normal');
    doc.text('has successfully completed the course', width / 2, 100, { align: 'center' });

    // Course Title (prominent)
    doc.setFontSize(20);
    doc.setTextColor(239, 68, 68); // brand red
    doc.setFont('helvetica', 'bold');

    // Wrap long course titles
    const maxWidth = 200;
    const courseLines = doc.splitTextToSize(data.courseTitle, maxWidth);
    const courseTitleY = 112;
    doc.text(courseLines, width / 2, courseTitleY, { align: 'center' });

    // Certificate details (bottom section)
    const bottomY = 145;

    // Certificate Number (left)
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128); // gray-500
    doc.setFont('helvetica', 'normal');
    doc.text('Certificate Number:', 30, bottomY);

    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55); // gray-800
    doc.setFont('helvetica', 'bold');
    doc.text(data.certificateNumber, 30, bottomY + 5);

    // Issue Date (center-left)
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128); // gray-500
    doc.setFont('helvetica', 'normal');
    doc.text('Date of Completion:', width / 2 - 35, bottomY);

    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55); // gray-800
    doc.setFont('helvetica', 'bold');
    const completionDateStr = data.completionDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.text(completionDateStr, width / 2 - 35, bottomY + 5);

    // Signature line (right)
    doc.setLineWidth(0.3);
    doc.setDrawColor(75, 85, 99); // gray-600
    doc.line(width - 80, bottomY + 3, width - 30, bottomY + 3);

    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128); // gray-500
    doc.setFont('helvetica', 'italic');
    doc.text('Authorized Signature', width - 55, bottomY + 8, { align: 'center' });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175); // gray-400
    doc.setFont('helvetica', 'normal');
    doc.text(
      `This certificate validates the successful completion of ${data.courseTitle}`,
      width / 2,
      height - 15,
      { align: 'center' }
    );

    doc.text(
      'Issued by Eyebuckz • www.eyebuckz.com',
      width / 2,
      height - 10,
      { align: 'center' }
    );

    // Save the PDF
    const certDir = this.ensureCertificatesDirectory();
    const filename = `${data.certificateNumber}.pdf`;
    const filepath = path.join(certDir, filename);

    // Write PDF to file
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    fs.writeFileSync(filepath, pdfBuffer);

    console.log('[Certificate] Generated certificate:', filename);

    return filepath;
  },

  /**
   * Get the public URL for a certificate
   * In production, this should return a CDN URL or S3 URL
   * For now, returns a local file path that can be served by Express
   */
  getCertificateUrl(certificateNumber: string): string {
    const baseUrl = process.env.APP_URL || 'http://localhost:4000';
    return `${baseUrl}/api/certificates/${certificateNumber}.pdf`;
  },

  /**
   * Check if a certificate file exists
   */
  certificateExists(certificateNumber: string): boolean {
    const certDir = this.ensureCertificatesDirectory();
    const filepath = path.join(certDir, `${certificateNumber}.pdf`);
    return fs.existsSync(filepath);
  },

  /**
   * Get certificate file path
   */
  getCertificatePath(certificateNumber: string): string {
    const certDir = this.ensureCertificatesDirectory();
    return path.join(certDir, `${certificateNumber}.pdf`);
  },

  /**
   * Delete a certificate file
   */
  deleteCertificate(certificateNumber: string): boolean {
    try {
      const filepath = this.getCertificatePath(certificateNumber);

      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        console.log('[Certificate] Deleted certificate:', certificateNumber);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[Certificate] Error deleting certificate:', error);
      return false;
    }
  }
};
