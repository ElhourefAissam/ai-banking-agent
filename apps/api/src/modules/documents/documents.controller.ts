import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserSummary } from '@proorga/shared-types';

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
}
