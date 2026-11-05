'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import {
  FileText,
  Download,
  ExternalLink,
  ShieldCheck,
  CheckCircle,
  FileImage,
  File,
  Eye,
  Loader2,
} from 'lucide-react';

interface DocumentViewerModalProps {
  document: {
    id: string;
    fileName: string;
    fileType?: string;
    fileSize: number;
    createdAt?: string;
    customUrl?: string;
    onDownload?: () => Promise<void>;
    subtitle?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document: doc,
  isOpen,
  onClose,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!doc) return null;

  const fileUrl = doc.customUrl || api.getDocumentFileUrl(doc.id, false);
  const isPdf =
    doc.fileType === 'application/pdf' || doc.fileName.toLowerCase().endsWith('.pdf');
  const isImage =
    doc.fileType?.startsWith('image/') ||
    /\.(png|jpe?g|webp)$/i.test(doc.fileName);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      if (doc.onDownload) {
        await doc.onDownload();
      } else {
        await api.downloadDocument(doc.id, doc.fileName);
      }
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Download error:', err);
      // Fallback: direct window download via query token
      window.open(doc.customUrl || api.getDocumentFileUrl(doc.id, true), '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOpenNewTab = () => {
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
    }
    return `${(bytes / 1024).toFixed(0)} Ko`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="4xl"
      title={
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-200/60 flex items-center justify-center shrink-0">
            {isPdf ? (
              <FileText className="w-4 h-4 text-brand-700" />
            ) : isImage ? (
              <FileImage className="w-4 h-4 text-brand-700" />
            ) : (
              <File className="w-4 h-4 text-brand-700" />
            )}
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-slate-900 text-sm sm:text-base truncate block">
              {doc.fileName}
            </span>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
              <span>{formatFileSize(doc.fileSize)}</span>
              <span>•</span>
              <span className="uppercase text-slate-500 font-sans font-medium">
                {isPdf ? 'Document PDF' : isImage ? 'Image' : doc.fileType || 'Fichier'}
              </span>
            </div>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-[11px] font-medium text-slate-700">
              Pièce justificative certifiée et horodatée par la banque
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenNewTab}
              className="text-xs"
              title="Ouvrir dans un nouvel onglet"
            >
              <ExternalLink className="w-3.5 h-3.5 me-1.5" />
              <span>Ouvrir l'original</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleDownload}
              isLoading={isDownloading}
              className="text-xs"
              title="Télécharger la pièce justificative"
            >
              {downloadSuccess ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 me-1.5 text-emerald-300" />
                  <span>Téléchargé !</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 me-1.5" />
                  <span>Télécharger</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Document Content Preview Canvas */}
        <div className="relative w-full rounded-2xl border border-slate-200/90 overflow-hidden bg-slate-100 flex items-center justify-center min-h-[350px]">
          {isPdf ? (
            <iframe
              src={fileUrl}
              title={doc.fileName}
              className="w-full h-[65vh] border-0 rounded-2xl bg-white"
            />
          ) : isImage ? (
            <div className="p-4 flex items-center justify-center w-full max-h-[65vh] overflow-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fileUrl}
                alt={doc.fileName}
                className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-md border border-slate-200"
              />
            </div>
          ) : (
            <div className="p-12 text-center space-y-3">
              <File className="w-12 h-12 text-slate-400 mx-auto" />
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Aperçu non disponible directement pour ce format de fichier.
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Vous pouvez télécharger le fichier pour le consulter sur votre poste.
                </p>
              </div>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleDownload}
              >
                <Download className="w-3.5 h-3.5 me-1.5" />
                Télécharger ({doc.fileName})
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
