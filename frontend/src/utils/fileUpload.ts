import api from '@/services/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'docx', 'xlsx'] as const;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_PDF_BYTES = 5 * 1024 * 1024;

export type UploadPurpose = 'generic' | 'student_profile';

export interface UploadOptions {
  purpose?: UploadPurpose;
  studentId?: string;
  tenantCode?: string;
  bucketType?: 'media' | 'reports';
  onProgress?: (percent: number) => void;
}

export interface UploadResult {
  file_id: string;
  storage_key: string;
  profile_picture?: string;
  thumbnail_key?: string;
  size_bytes?: number;
}

function extension(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

export function validateFileClient(
  file: File,
  opts?: { allowPdfOnly?: boolean }
): string | null {
  const ext = extension(file.name);
  if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
    return `File type .${ext} is not allowed.`;
  }
  const isPdf = ext === 'pdf';
  const isImage = ['jpg', 'jpeg', 'png'].includes(ext);
  if (opts?.allowPdfOnly && !isPdf) {
    return 'Only PDF files are allowed.';
  }
  if (isPdf && file.size > MAX_PDF_BYTES) {
    return 'PDF must be 5MB or smaller.';
  }
  if (isImage && file.size > MAX_IMAGE_BYTES) {
    return 'Images must be 10MB or smaller.';
  }
  if (!isPdf && !isImage && file.size > MAX_IMAGE_BYTES) {
    return 'File must be 10MB or smaller.';
  }
  return null;
}

export async function uploadFile(file: File, options: UploadOptions = {}): Promise<UploadResult> {
  const err = validateFileClient(file, {
    allowPdfOnly: options.purpose === 'generic' && file.name.endsWith('.pdf'),
  });
  if (err) {
    throw new Error(err);
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('purpose', options.purpose ?? 'generic');
  if (options.studentId) formData.append('student_id', options.studentId);
  if (options.tenantCode) formData.append('tenant_code', options.tenantCode);
  if (options.bucketType) formData.append('bucket_type', options.bucketType);

  const response = await api.post<UploadResult>('/storage/upload/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => {
      if (options.onProgress && event.total) {
        options.onProgress(Math.round((event.loaded * 100) / event.total));
      }
    },
  });
  return response.data;
}

export async function getSignedDownloadUrl(
  fileId: string,
  expiresIn = 3600
): Promise<string> {
  const response = await api.get<{ url: string }>(
    `/storage/files/${fileId}/download-url/`,
    { params: { expires_in: expiresIn } }
  );
  return response.data.url;
}

export async function getSignedUrlByKey(
  storageKey: string,
  bucketType = 'media'
): Promise<string> {
  const response = await api.get<{ url: string }>('/storage/download-url/', {
    params: { storage_key: storageKey, bucket_type: bucketType },
  });
  return response.data.url;
}

/** Resolve display URL for a profile path or storage key. */
export async function resolveMediaUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  if (path.startsWith('/media/') || path.startsWith('media/')) {
    const base = API_BASE.replace(/\/$/, '');
    return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
  }
  if (path.startsWith('tenant/')) {
    try {
      return await getSignedUrlByKey(path);
    } catch {
      return `${API_BASE}/${path}`;
    }
  }
  return `${API_BASE}/media/${path}`;
}

export async function uploadStudentProfile(
  studentId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  return uploadFile(file, {
    purpose: 'student_profile',
    studentId,
    onProgress,
  });
}
