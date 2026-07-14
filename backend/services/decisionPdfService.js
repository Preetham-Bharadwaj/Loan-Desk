const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const DEFAULT_MARGIN = 42;

function asDateLabel(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return 'N/A';
  return `INR ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function sanitizeFileName(fileName) {
  return String(fileName || 'document.pdf').replace(/[/\\?%*:|"<>]/g, '-');
}

function buildFileName(documentType) {
  return documentType === 'Approval Letter'
    ? 'Loan Sanction Letter.pdf'
    : 'Loan Rejection Letter.pdf';
}

function buildStoragePath(applicationId, documentType) {
  const slug = documentType === 'Approval Letter' ? 'sanction-letter' : 'rejection-letter';
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `generated/${applicationId}/${slug}-${stamp}.pdf`;
}

function drawHeader(doc, documentType) {
  const pageWidth = doc.page.width;
  const left = doc.page.margins.left;
  const top = doc.page.margins.top;

  doc.save();
  doc.roundedRect(left, top, pageWidth - left * 2, 72, 10).fill('#0f172a');
  doc.fillColor('#ffffff');
  doc.font('Helvetica-Bold').fontSize(20).text('LoanDesk', left + 20, top + 16);
  doc.font('Helvetica').fontSize(9).text('Official Loan Decision Document', left + 20, top + 41);

  doc.font('Helvetica-Bold').fontSize(17).text(documentType === 'Approval Letter' ? 'Loan Sanction Letter' : 'Loan Rejection Letter', left, top + 92, {
    align: 'left',
  });
  doc.fillColor('#475569').font('Helvetica').fontSize(10).text('Generated automatically after the manager decision is recorded.', left, top + 114);
  doc.restore();

  doc.moveDown(4);
}

function drawSectionTitle(doc, title) {
  const startY = doc.y + 6;
  doc.save();
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11).text(title.toUpperCase(), doc.page.margins.left, startY);
  doc.moveTo(doc.page.margins.left, startY + 16).lineTo(doc.page.width - doc.page.margins.right, startY + 16).strokeColor('#cbd5e1').lineWidth(0.8).stroke();
  doc.restore();
  doc.moveDown(1);
}

function drawKeyValueTable(doc, entries, columns = 2) {
  const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colWidth = usableWidth / columns;
  const rowHeight = 36;
  const startX = doc.page.margins.left;

  entries.forEach((entry, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = startX + col * colWidth;
    const y = doc.y + row * rowHeight;

    doc.save();
    doc.roundedRect(x, y, colWidth - 10, rowHeight - 6, 6).fillAndStroke('#f8fafc', '#e2e8f0');
    doc.fillColor('#64748b').font('Helvetica').fontSize(8).text(entry.label, x + 10, y + 7, {
      width: colWidth - 30,
      height: 10,
    });
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9).text(entry.value || 'N/A', x + 10, y + 18, {
      width: colWidth - 30,
      height: 12,
    });
    doc.restore();
  });

  const rows = Math.ceil(entries.length / columns);
  doc.y += rows * rowHeight + 8;
}

function drawAmountTable(doc, rows) {
  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const cols = [0.34, 0.33, 0.33];
  const colXs = [left, left + width * cols[0], left + width * (cols[0] + cols[1])];
  const rowHeight = 28;

  doc.save();
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a');
  ['Field', 'Amount / Rate', 'Value'].forEach((label, idx) => {
    doc.rect(colXs[idx], doc.y, width * cols[idx], rowHeight).fillAndStroke('#e2e8f0', '#cbd5e1');
    doc.fillColor('#0f172a').text(label, colXs[idx] + 8, doc.y + 9, {
      width: width * cols[idx] - 16,
      align: 'left',
    });
  });
  doc.moveDown(1.4);
  doc.restore();

  rows.forEach((row) => {
    const y = doc.y;
    [row[0], row[1], row[2]].forEach((value, idx) => {
      doc.rect(colXs[idx], y, width * cols[idx], rowHeight).fillAndStroke('#ffffff', '#e2e8f0');
      doc.fillColor('#0f172a').font('Helvetica').fontSize(9).text(value || 'N/A', colXs[idx] + 8, y + 9, {
        width: width * cols[idx] - 16,
      });
    });
    doc.moveDown(1.4);
  });
}

function drawBulletList(doc, items) {
  items.forEach((item) => {
    doc.circle(doc.page.margins.left + 4, doc.y + 5, 1.5).fill('#0f172a');
    doc.fillColor('#334155').font('Helvetica').fontSize(9).text(item, doc.page.margins.left + 12, doc.y, {
      width: doc.page.width - doc.page.margins.left - doc.page.margins.right - 12,
      align: 'left',
    });
    doc.moveDown(0.5);
  });
}

async function renderDecisionPdfBuffer({
  documentType,
  applicationId,
  applicationNumber,
  applicantName,
  loanType,
  applicationDate,
  decisionDate,
  officerName,
  requestedAmount,
  eligibleAmount,
  sanctionedAmount,
  interestRate,
  loanTenureMonths,
  monthlyEmi,
  rejectionReason,
  officerRemarks,
  qrPayload,
}) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: DEFAULT_MARGIN,
    bufferPages: true,
    compress: true,
  });

  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  const pdfReady = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  drawHeader(doc, documentType);

  drawSectionTitle(doc, 'Application Details');
  drawKeyValueTable(doc, [
    { label: 'Application ID', value: applicationId },
    { label: 'Application Number', value: applicationNumber || 'N/A' },
    { label: 'Applicant Name', value: applicantName },
    { label: 'Loan Type', value: loanType },
    { label: 'Application Date', value: asDateLabel(applicationDate) },
    { label: documentType === 'Approval Letter' ? 'Approved Date' : 'Decision Date', value: asDateLabel(decisionDate) },
    { label: 'Loan Officer Name', value: officerName || 'N/A' },
  ], 2);

  drawSectionTitle(doc, documentType === 'Approval Letter' ? 'Sanction Summary' : 'Rejection Summary');
  if (documentType === 'Approval Letter') {
    drawAmountTable(doc, [
      ['Requested Loan Amount', formatCurrency(requestedAmount), ''],
      ['Eligible Loan Amount', formatCurrency(eligibleAmount), ''],
      ['Final Sanctioned Amount', formatCurrency(sanctionedAmount), ''],
      ['Interest Rate', `${Number(interestRate || 0).toFixed(2)}%`, ''],
      ['Loan Tenure', `${loanTenureMonths || 'N/A'} Months`, ''],
      ['Monthly EMI', formatCurrency(monthlyEmi), ''],
    ].map(([field, value]) => [field, '', value]));
  } else {
    drawAmountTable(doc, [
      ['Requested Amount', formatCurrency(requestedAmount), ''],
      ['Reason for Rejection', rejectionReason || 'N/A', ''],
      ['Officer Remarks', officerRemarks || 'N/A', ''],
    ].map(([field, value]) => [field, '', value]));
  }

  drawSectionTitle(doc, documentType === 'Approval Letter' ? 'Terms & Conditions' : 'Customer Note');
  if (documentType === 'Approval Letter') {
    drawBulletList(doc, [
      'This sanction letter is issued subject to final verification and internal compliance checks.',
      'Disbursement will occur after the borrower completes all mandatory documentation requirements.',
      'The approved interest rate, EMI, and tenure are as recorded in the system decision at the time of approval.',
      'The lender reserves the right to revise the sanction if any submitted information is found inaccurate.',
    ]);
  } else {
    doc.fillColor('#334155').font('Helvetica').fontSize(10).text('You may reapply after improving your eligibility.', {
      width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
    });
  }

  doc.moveDown(1.2);
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text('Authorized Signature', doc.page.margins.left, doc.y);
  doc.moveDown(0.9);
  doc.moveTo(doc.page.margins.left, doc.y + 16).lineTo(doc.page.margins.left + 160, doc.y + 16).strokeColor('#0f172a').lineWidth(0.8).stroke();
  doc.fillColor('#334155').font('Helvetica').fontSize(9).text('Loan Officer', doc.page.margins.left, doc.y + 22);
  doc.text('LoanDesk', doc.page.margins.left, doc.y + 34);

  try {
    const qr = await QRCode.toDataURL(qrPayload || `${applicationId}-${documentType}`, {
      margin: 1,
      scale: 4,
      errorCorrectionLevel: 'M',
    });
    doc.image(qr, doc.page.width - doc.page.margins.right - 90, doc.y - 34, {
      fit: [80, 80],
    });
    doc.fillColor('#64748b').font('Helvetica').fontSize(8).text('QR reference', doc.page.width - doc.page.margins.right - 90, doc.y + 48, {
      width: 80,
      align: 'center',
    });
  } catch {
    doc.roundedRect(doc.page.width - doc.page.margins.right - 90, doc.y - 34, 80, 80, 8).strokeColor('#cbd5e1').lineWidth(0.8).stroke();
    doc.fillColor('#64748b').font('Helvetica').fontSize(8).text('QR placeholder', doc.page.width - doc.page.margins.right - 90, doc.y + 1, {
      width: 80,
      align: 'center',
    });
  }

  const range = doc.bufferedPageRange();
  for (let pageIndex = range.start; pageIndex < range.start + range.count; pageIndex += 1) {
    doc.switchToPage(pageIndex);
    const footerY = doc.page.height - doc.page.margins.bottom + 6;
    doc.moveTo(doc.page.margins.left, footerY - 8).lineTo(doc.page.width - doc.page.margins.right, footerY - 8).strokeColor('#cbd5e1').lineWidth(0.5).stroke();
    doc.fillColor('#64748b').font('Helvetica').fontSize(8).text('LoanDesk - Official Document', doc.page.margins.left, footerY, {
      width: 220,
    });
    doc.text(`Page ${pageIndex - range.start + 1} of ${range.count}`, doc.page.width - doc.page.margins.right - 100, footerY, {
      width: 100,
      align: 'right',
    });
  }

  doc.flushPages();
  doc.end();
  return pdfReady;
}

async function buildDecisionPdfDocument(meta) {
  const fileName = sanitizeFileName(buildFileName(meta.documentType));
  const storagePath = buildStoragePath(meta.applicationId, meta.documentType);
  const buffer = await renderDecisionPdfBuffer(meta);
  return { buffer, fileName, storagePath };
}

async function uploadDecisionPdf({
  supabase,
  bucket,
  applicationId,
  documentType,
  fileBuffer,
  fileName,
  storagePath,
}) {
  const uploadPath = storagePath || buildStoragePath(applicationId, documentType);
  const uploadResult = await supabase.storage
    .from(bucket)
    .upload(uploadPath, fileBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadResult.error) {
    throw uploadResult.error;
  }

  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(uploadResult.data.path);
  let signedUrl = null;
  try {
    const { data: signedData } = await supabase.storage.from(bucket).createSignedUrl(uploadResult.data.path, 60 * 60 * 24 * 7);
    signedUrl = signedData?.signedUrl || null;
  } catch {
    signedUrl = null;
  }

  return {
    fileName,
    storagePath: uploadResult.data.path,
    publicUrl: publicData?.publicUrl || null,
    signedUrl,
  };
}

module.exports = {
  buildDecisionPdfDocument,
  uploadDecisionPdf,
  buildFileName,
  buildStoragePath,
};
