import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions';
import { DocumentsService } from './documents.service';
import {
  RejectDocumentDto,
  UpdateDocumentDto,
  UploadDocumentDto,
} from './dto/document.dto';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @RequirePermissions(PERMISSIONS.documentsRead)
  @Get()
  findAll() {
    return this.documents.findAll();
  }

  @RequirePermissions(PERMISSIONS.documentsUpload)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile()
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype?: string;
      size?: number;
    },
    @Body() dto: UploadDocumentDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.documents.upload(file, dto, user?.id);
  }

  @RequirePermissions(PERMISSIONS.documentsRead)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.documents.findOne(id);
  }

  @RequirePermissions(PERMISSIONS.documentsDownload)
  @Get(':id/download')
  async download(
    @Param('id') id: string,
    @Res() res: Response,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const url = await this.documents.getDownloadUrl(id, user?.id);
    if (url.downloadUrl.startsWith('http')) {
      return res.json(url);
    }
    const { row, buffer } = await this.documents.download(id, user?.id);
    res.setHeader('Content-Type', row.mimeType ?? 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${row.originalFileName ?? row.fileName}"`,
    );
    res.send(buffer);
  }

  @RequirePermissions(PERMISSIONS.documentsDownload)
  @Get(':id/download-url')
  getDownloadUrl(
    @Param('id') id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.documents.getDownloadUrl(id, user?.id);
  }

  @RequirePermissions(PERMISSIONS.documentsUpdate)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.documents.update(id, dto, user?.id);
  }

  @RequirePermissions(PERMISSIONS.documentsDelete)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.documents.remove(id, user?.id);
  }

  @RequirePermissions(PERMISSIONS.documentsVerify)
  @Post(':id/verify')
  verify(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.documents.verify(id, user?.id);
  }

  @RequirePermissions(PERMISSIONS.documentsReject)
  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectDocumentDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.documents.reject(id, dto, user?.id);
  }
}
