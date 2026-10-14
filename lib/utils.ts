import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Colunas de `members` visíveis publicamente (sem CPF, telefone ou e-mail)
export const PUBLIC_MEMBER_COLUMNS = 'id, name, age, photo_url, position, created_at, updated_at, user_id, level, is_active'

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024

// Retorna a extensão segura da foto (derivada do MIME, não do nome) ou null se inválida
export function safeImageExtension(file: File): string | null {
  if (file.size > MAX_PHOTO_BYTES) return null
  return IMAGE_EXTENSIONS[file.type] ?? null
}
