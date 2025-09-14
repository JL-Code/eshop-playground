// 支持的文件类型定义
const supportedFileTypes = {
  image: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/bmp",
    "image/webp",
    "image/svg+xml",
    "image/avif",
  ],
  video: [
    "video/mp4",
    "video/avi",
    "video/mov",
    "video/wmv",
    "video/flv",
    "video/webm",
    "video/mkv",
    "video/3gp",
  ],
  audio: [
    "audio/mp3",
    "audio/wav",
    "audio/ogg",
    "audio/aac",
    "audio/flac",
    "audio/m4a",
    "audio/wma",
    "audio/mpeg",
  ],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
    "application/vnd.xmind.workbook",
    "application/sql",
    "application/json",
    "application/javascript",
    "text/x-java-source",
  ],
  archive: [
    "application/zip",
    "application/x-rar-compressed",
    "application/x-7z-compressed",
    "application/x-tar",
    "application/gzip",
  ],
};

// 根据文件扩展名获取MIME类型
const getMimeTypeByExtension = (filename: string): string => {
  const ext = filename.toLowerCase().split(".").pop();
  const extensionMap: Record<string, string> = {
    // 图片
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    bmp: "image/bmp",
    webp: "image/webp",
    svg: "image/svg+xml",
    // 视频
    mp4: "video/mp4",
    avi: "video/avi",
    mov: "video/mov",
    wmv: "video/wmv",
    flv: "video/flv",
    webm: "video/webm",
    mkv: "video/mkv",
    "3gp": "video/3gp",
    // 音频
    mp3: "audio/mp3",
    wav: "audio/wav",
    ogg: "audio/ogg",
    aac: "audio/aac",
    flac: "audio/flac",
    m4a: "audio/m4a",
    wma: "audio/wma",
    // 文档
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    txt: "text/plain",
    csv: "text/csv",
    xmind: "application/vnd.xmind.workbook",
    sql: "application/sql",
    json: "application/json",
    js: "application/javascript",
    java: "text/x-java-source",
    // 压缩包
    zip: "application/zip",
    rar: "application/x-rar-compressed",
    "7z": "application/x-7z-compressed",
    tar: "application/x-tar",
    gz: "application/gzip",
  };
  return extensionMap[ext || ""] || "";
};

/**
 * 检查文件类型
 * @param file 文件
 * @returns 文件类型
 */
const getFileType = (file: File): MessageType => {
  const mimeType = file.type || getMimeTypeByExtension(file.name);

  if (supportedFileTypes.image.includes(mimeType)) return "IMAGE";
  if (supportedFileTypes.video.includes(mimeType)) return "VIDEO";
  if (supportedFileTypes.audio.includes(mimeType)) return "VOICE";
  if (supportedFileTypes.document.includes(mimeType)) return "FILE";
  if (supportedFileTypes.archive.includes(mimeType)) return "FILE";

  return "FILE";
};

/**
 * 检查是否为支持的文件类型
 * @param file 文件
 * @returns 是否为支持的文件类型
 */
const isSupportedFile = (file: File): boolean => {
  const mimeType = file.type || getMimeTypeByExtension(file.name);
  const allSupportedTypes = [
    ...supportedFileTypes.image,
    ...supportedFileTypes.video,
    ...supportedFileTypes.audio,
    ...supportedFileTypes.document,
    ...supportedFileTypes.archive,
  ];
  return allSupportedTypes.includes(mimeType);
};

/**
 * 检查拖拽的文件中是否包含支持的文件类型
 * @param e 拖拽事件
 * @returns 是否包含支持的文件类型
 */
const hasSupportedFiles = (e: DragEvent): boolean => {
  const items = e.dataTransfer?.items;
  if (items) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file && isSupportedFile(file)) {
          return true;
        }
      }
    }
  }
  return false;
};

/**
 * 获取文件类型对应的图标
 */
const getFileIcon = (fileType: MessageType): string => {
  const iconMap: Record<string, string> = {
    DOCUMENT: "📄",
    SPREADSHEET: "📊",
    PRESENTATION: "📋",
    PDF: "📕",
    ARCHIVE: "📦",
    AUDIO: "🎵",
    VIDEO: "🎬",
    TEXT: "📝",
    OTHER: "📎",
  };
  return iconMap[fileType] || "📎";
};

export default {
  getFileIcon,
  getFileType,
  isSupportedFile,
  hasSupportedFiles,
};
