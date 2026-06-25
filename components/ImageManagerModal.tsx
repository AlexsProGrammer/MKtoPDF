import React, { useRef, useState, useMemo } from 'react';
import { X, Upload, Copy, Trash2, PlusCircle, Image as ImageIcon, ImageOff, RefreshCw } from 'lucide-react';
import { SessionImageAsset, buildInternalImageUrl, extractMkimgIds } from '../lib/sessionImages';
import { toast } from 'sonner';

interface ImageManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: SessionImageAsset[];
  onUploadFile: (file: File) => Promise<SessionImageAsset | null>;
  onInsertImage: (imageId: string, imageName?: string) => void;
  onDeleteImage: (imageId: string) => void;
  markdownContent?: string;
  onRestoreImage?: (id: string, file: File) => Promise<void>;
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

/** Extract the first alt-text used for a given image ID in the markdown. */
function findAltText(markdown: string, id: string): string {
  const m = new RegExp(`!\\[([^\\]]*)\\]\\(mkimg:/{1,3}${id}\\)`, 'i').exec(markdown);
  return m?.[1]?.trim() || '';
}

export const ImageManagerModal: React.FC<ImageManagerModalProps> = ({
  isOpen,
  onClose,
  images,
  onUploadFile,
  onInsertImage,
  onDeleteImage,
  markdownContent = '',
  onRestoreImage,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reuploadInputRef = useRef<HTMLInputElement>(null);
  const [reuploadTargetId, setReuploadTargetId] = useState<string | null>(null);

  // IDs referenced in the markdown that have no corresponding session image
  const missingIds = useMemo(() => {
    if (!markdownContent) return [];
    const allIds = extractMkimgIds(markdownContent);
    const loadedSet = new Set(images.map((img) => img.id));
    return allIds.filter((id) => !loadedSet.has(id));
  }, [markdownContent, images]);

  const handlePickFiles = () => fileInputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    for (const file of files) await onUploadFile(file);
    event.target.value = '';
  };

  const handleReuploadClick = (id: string) => {
    setReuploadTargetId(id);
    reuploadInputRef.current?.click();
  };

  const handleReuploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !reuploadTargetId) return;
    await onRestoreImage?.(reuploadTargetId, file);
    setReuploadTargetId(null);
    e.target.value = '';
  };

  const handleCopyUrl = async (id: string) => {
    const url = buildInternalImageUrl(id);
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Internal image URL copied');
    } catch {
      toast.error('Failed to copy URL');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Session Images</h3>
            <p className="text-xs text-gray-500">Stored in memory only. Cleared on refresh.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Upload bar */}
        <div className="p-5 border-b border-gray-100">
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple className="hidden" onChange={handleFileChange} />
          <input ref={reuploadInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleReuploadChange} />
          <button
            onClick={handlePickFiles}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            <Upload size={16} />
            Upload Images
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto">
          {/* ── Missing images section ── */}
          {missingIds.length > 0 && (
            <div className="px-5 pt-4 pb-3 border-b border-amber-100 bg-amber-50/60">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <ImageOff size={13} />
                Missing images ({missingIds.length}) — referenced in document but not loaded
              </p>
              <div className="space-y-2">
                {missingIds.map((id) => {
                  const altText = findAltText(markdownContent, id);
                  const displayName = altText || id;
                  return (
                    <div key={id} className="flex items-center gap-3 rounded-lg border border-amber-200 bg-white p-3">
                      {/* Broken-image placeholder */}
                      <div className="w-14 h-14 flex-shrink-0 rounded-md border border-dashed border-amber-300 bg-amber-50 flex items-center justify-center">
                        <ImageOff size={20} className="text-amber-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        {altText && (
                          <p className="text-sm font-medium text-gray-800 truncate">{altText}</p>
                        )}
                        <p className="text-xs text-gray-400 font-mono truncate">{buildInternalImageUrl(id)}</p>
                        <p className="text-xs text-amber-600 mt-0.5">Image missing — re-upload to restore</p>
                      </div>
                      <button
                        onClick={() => handleReuploadClick(id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 transition-colors flex-shrink-0"
                        title={`Re-upload image for "${displayName}"`}
                      >
                        <RefreshCw size={13} />
                        Re-upload
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Loaded images section ── */}
          <div className="p-5 space-y-3">
            {images.length === 0 && missingIds.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
                <ImageIcon className="mx-auto text-gray-400" size={24} />
                <p className="mt-2 text-sm text-gray-600">No session images yet.</p>
              </div>
            ) : images.length === 0 ? null : (
              images.map((img) => (
                <div key={img.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                  <img
                    src={img.objectUrl}
                    alt={img.name}
                    className="w-14 h-14 object-cover rounded-md border border-gray-200 flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{img.name}</p>
                    <p className="text-xs text-gray-500">{formatBytes(img.size)} · {img.mimeType}</p>
                    <p className="text-xs text-gray-500 truncate">{buildInternalImageUrl(img.id)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => onInsertImage(img.id, img.name)} className="p-2 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-600" title="Insert markdown">
                      <PlusCircle size={16} />
                    </button>
                    <button onClick={() => handleCopyUrl(img.id)} className="p-2 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-600" title="Copy internal URL">
                      <Copy size={16} />
                    </button>
                    <button onClick={() => onDeleteImage(img.id)} className="p-2 rounded-md border border-red-200 text-red-600 hover:bg-red-50" title="Delete image">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};