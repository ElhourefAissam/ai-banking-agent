import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Role, UserSummary } from '@proorga/shared-types';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DocumentsService {
  private readonly uploadDir = process.env.UPLOAD_DIR || './uploads';

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadDocument(
    currentUser: UserSummary,
    requestId: string,
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const request = await this.prisma.limitRequest.findUnique({
      where: { id: requestId },
      include: { customerProfile: true },
    });

    if (!request) {
      throw new NotFoundException(`Request ${requestId} not found`);
    }

    if (currentUser.role === Role.CLIENT && request.customerProfile.userId !== currentUser.id) {
      throw new ForbiddenException('You do not have permission to attach documents to this request');
    }

    // Validate MIME types
    const allowedMimeTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Allowed formats: PDF, PNG, JPG.`
      );
    }

    // 5MB maximum file size
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new BadRequestException('File size exceeds the 5 MB limit.');
    }

    // Calculate SHA-256 checksum
    const checksum = createHash('sha256').update(file.buffer).digest('hex');

    // Save to disk with unique sanitized name
    const ext = path.extname(file.originalname) || '.pdf';
    const filename = `${requestId}_${Date.now()}_${checksum.substring(0, 8)}${ext}`;
    const destinationPath = path.join(this.uploadDir, filename);

    fs.writeFileSync(destinationPath, file.buffer);

    // Save record in database
    const document = await this.prisma.requestDocument.create({
      data: {
        requestId,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        storagePath: destinationPath,
        checksum,
        uploadedById: currentUser.id,
      },
    });

    // Mark requiredDocumentsProvided = true on request
    await this.prisma.limitRequest.update({
      where: { id: requestId },
      data: { requiredDocumentsProvided: true },
    });

    await this.auditService.logEvent({
      actorId: currentUser.id,
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      action: 'DOCUMENT_UPLOADED',
      entityType: 'RequestDocument',
      entityId: document.id,
      details: {
        requestId,
        fileName: file.originalname,
        fileSize: file.size,
        checksum,
      },
    });

    return {
      id: document.id,
      requestId: document.requestId,
      fileName: document.fileName,
      fileType: document.fileType,
      fileSize: document.fileSize,
      uploadedAt: document.createdAt.toISOString(),
    };
  }

  async getDocumentsForRequest(currentUser: UserSummary, requestId: string) {
    const request = await this.prisma.limitRequest.findUnique({
      where: { id: requestId },
      include: { customerProfile: true },
    });

    if (!request) {
      throw new NotFoundException(`Request ${requestId} not found`);
    }

    if (currentUser.role === Role.CLIENT && request.customerProfile.userId !== currentUser.id) {
      throw new ForbiddenException('Not authorized');
    }

    return this.prisma.requestDocument.findMany({
      where: { requestId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        requestId: true,
        fileName: true,
        fileType: true,
        fileSize: true,
        createdAt: true,
      },
    });
  }
}
