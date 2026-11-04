import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserSummary } from '@proorga/shared-types';
import * as fs from 'fs';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post(':requestId/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Param('requestId') requestId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: UserSummary,
  ) {
    return this.documentsService.uploadDocument(user, requestId, file);
  }

  @Get(':requestId')
  async getDocuments(
    @Param('requestId') requestId: string,
    @CurrentUser() user: UserSummary,
  ) {
    return this.documentsService.getDocumentsForRequest(user, requestId);
  }

  @Get(':documentId/file')
  async getDocumentFile(
    @Param('documentId') documentId: string,
    @Query('download') download: string,
    @CurrentUser() user: UserSummary,
    @Res() res: Response,
  ) {
    const { document, filePath } = await this.documentsService.getDocumentFile(user, documentId);

    const isDownload = download === 'true' || download === '1';
    const disposition = isDownload ? 'attachment' : 'inline';
    const safeFileName = encodeURIComponent(document.fileName);

    res.setHeader('Content-Type', document.fileType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename="${document.fileName}"; filename*=UTF-8''${safeFileName}`
    );

    const stat = fs.statSync(filePath);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'private, max-age=3600');

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }

  @Get(':documentId/download')
  async downloadDocument(
    @Param('documentId') documentId: string,
    @CurrentUser() user: UserSummary,
    @Res() res: Response,
  ) {
    return this.getDocumentFile(documentId, 'true', user, res);
  }
}
