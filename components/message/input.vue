<template>
  <div class="message-box">
    <!-- debug -->
    <div class="flex gap-4" v-if="debug">
      <div>isEmpty: {{ isEmpty }}</div>
      <div>文件数量: {{ getCurrentFileCount() }} / {{ props.maxFiles }}</div>
    </div>
    <!-- 可编辑输入框 -->
    <div
      ref="editableDiv"
      class="editor"
      contenteditable="true"
      @paste.prevent="handlePaste"
      @drop.prevent="handleDrop"
      @dragover.prevent="handleDragOver"
      @dragenter.prevent="handleDragEnter"
      @dragleave.prevent="handleDragLeave"
      :class="{ 'drag-over': isDragOver }"
      placeholder="请输入消息，支持拖拽或粘贴文件..."
    ></div>

    <!-- 拖拽提示遮罩 -->
    <div v-if="isDragOver" class="drag-overlay">
      <el-icon class="drag-icon">
        <Upload />
      </el-icon>
      <p>拖拽文件到此处上传</p>
    </div>

    <!-- 操作按钮区域 -->
    <div class="actions">
      <el-upload
        ref="uploadRef"
        :show-file-list="false"
        :before-upload="beforeUpload"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.tar,.gz"
        :auto-upload="false"
        @change="handleFileUpload"
      >
        <el-button :icon="Folder" circle />
      </el-upload>

      <el-button
        type="success"
        :icon="Position"
        :disabled="isEmpty"
        @click="handleSend"
      >
        发送
      </el-button>
    </div>

    <!-- 图片预览弹窗 -->
    <el-dialog v-model="previewVisible" title="图片预览" width="60%" center>
      <div class="preview-container">
        <img :src="previewImage" alt="预览图片" class="preview-img" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
/**
 * TODO: 支持发送文件【图片、视频、音频、PDF、 Word、Excel、PPT、TXT、压缩包、log】
 * TODO: 支持文件拖拽到输入框
 */

import { ElMessage, ElMessageBox } from "element-plus";
import { Upload, Picture, Position, Folder } from "@element-plus/icons-vue";
import type { UploadFile } from "element-plus";
import { createQiniuUploadService } from "~/composables/qiniu-upload";
import type { UploadTask } from "~/composables/qiniu-upload";

const props = withDefaults(
  defineProps<{
    debug?: boolean;
    maxFiles?: number; // 最大文件数量限制
  }>(),
  {
    debug: true,
    maxFiles: 9,
  }
);

// 定义事件
const emits = defineEmits<{
  "message-group-ready": [
    messageGroup: {
      id: string;
      messages: MessageContent[];
      uploadedFiles: { url: string; key: string; fileName: string }[];
    }
  ];
  "upload-progress": [
    progress: { groupId: string; percent: number; uploadingCount: number }
  ];
  "upload-error": [
    error: { groupId: string; message: string; failedFiles: string[] }
  ];
  message: [message: MessageContent[]];
}>();

const editableDiv = ref<HTMLDivElement | null>(null);
const uploadRef = ref();
const isDragOver = ref(false);
const previewVisible = ref(false);
const previewImage = ref("");

// 七牛云上传服务
const qiniuUploadService = ref<ReturnType<
  typeof createQiniuUploadService
> | null>(null);

// 初始化七牛云上传服务
const initQiniuService = () => {
  if (!qiniuUploadService.value) {
    qiniuUploadService.value = createQiniuUploadService(
      async (fileKey: string) => {
        // 获取上传token的函数，需要根据实际情况实现
        const response = await fetch(
          "http://localhost:8081/oss/qiniu/token?fileKey=" + fileKey,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization:
                "Bearer " +
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJVXzIwMjUwNjI0Mzk2OTA4MTAwIiwiaWF0IjoxNzU3NjgxMTI1LCJleHAiOjE3NTgyODU5MjV9.Afqo8bDiBCO4Bs87FXxoYmo7KAtwqh2W7uY5w5lqXCA",
            },
          }
        );

        if (!response.ok) {
          throw new Error("获取上传token失败");
        }

        const data = await response.json();
        if (!data.token || !data.key || !data.fname) {
          throw new Error("token响应格式错误");
        }

        return data;
      },
      {
        region: "z2", // 华南区域
        domain: "upload.qiniup.com",
      }
    );
  }
};

// 组件挂载时初始化服务
onMounted(() => {
  setupContentWatcher();
  initQiniuService();
});

// 用于追踪编辑器内容变化的响应式变量
const editorContent = ref("");

// 获取当前编辑器中的文件数量
const getCurrentFileCount = (): number => {
  if (!editableDiv.value) return 0;

  const images = editableDiv.value.querySelectorAll("img");
  const fileDivs = editableDiv.value.querySelectorAll(
    'div[contenteditable="false"]'
  );
  const videos = editableDiv.value.querySelectorAll("video");
  const audios = editableDiv.value.querySelectorAll("audio");

  return images.length + fileDivs.length + videos.length + audios.length;
};

// 检查是否可以添加更多文件
const canAddMoreFiles = (newFileCount: number = 1): boolean => {
  const currentCount = getCurrentFileCount();
  return currentCount + newFileCount <= props.maxFiles;
};

// 计算输入框是否为空
const isEmpty = computed(() => {
  const content = editorContent.value.trim();
  return content === "" || content === "<br>";
});

// 更新编辑器内容的函数
const updateEditorContent = () => {
  if (editableDiv.value) {
    editorContent.value = editableDiv.value.innerHTML;
  }
};

// 监听编辑器内容变化
const setupContentWatcher = () => {
  if (editableDiv.value) {
    // 初始化内容
    updateEditorContent();

    // 监听输入事件
    editableDiv.value.addEventListener("input", updateEditorContent);
    editableDiv.value.addEventListener("keyup", updateEditorContent);
    editableDiv.value.addEventListener("paste", () => {
      // 延迟更新，确保粘贴内容已经插入
      nextTick(() => {
        updateEditorContent();
      });
    });
    editableDiv.value.addEventListener("drop", () => {
      // 延迟更新，确保拖拽内容已经插入
      nextTick(() => {
        updateEditorContent();
      });
    });
  }
};

// 消息组管理
const messageGroup = ref<{
  id: string;
  messages: MessageContent[];
  uploadTasks: UploadTask[];
  isUploading: boolean;
  uploadProgress: number;
} | null>(null);

// 生成消息组ID
const generateMessageGroupId = (): string => {
  return `msg_group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// 计算上传进度
const calculateUploadProgress = (tasks: UploadTask[]): number => {
  if (tasks.length === 0) return 100;

  const totalProgress = tasks.reduce(
    (sum, task) => sum + task.progress.percent,
    0
  );
  return Math.round(totalProgress / tasks.length);
};

// 检查所有文件是否上传完成
const areAllFilesUploaded = (tasks: UploadTask[]): boolean => {
  return tasks.every((task) => task.status === "success");
};

// 清理事件监听器
onUnmounted(() => {
  if (editableDiv.value) {
    editableDiv.value.removeEventListener("input", updateEditorContent);
    editableDiv.value.removeEventListener("keyup", updateEditorContent);
  }
});

// 处理粘贴事件
const handlePaste = (e: ClipboardEvent) => {
  const items = e.clipboardData?.items;

  if (items) {
    // 检查是否有图片
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf("image") !== -1) {
        const file = item.getAsFile();
        if (file) {
          insertFile(file);
          return;
        }
      }
    }
  }

  // 如果没有图片，处理文本粘贴
  const text = e.clipboardData?.getData("text/plain");
  if (text) {
    document.execCommand("insertText", false, text);
  }
};

// ============== 拖拽相关事件处理 ===============
const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
};

const handleDragEnter = (e: DragEvent) => {
  e.preventDefault();
  if (hasSupportedFiles(e)) {
    isDragOver.value = true;
  }
};

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault();
  // 检查是否真正离开了编辑器区域
  const rect = editableDiv.value?.getBoundingClientRect();
  if (rect) {
    const isOutside =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom;

    if (isOutside) {
      isDragOver.value = false;
    }
  }
};

/**
 * 处理文件拖拽释放事件
 * @param e 拖拽事件对象
 */
const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  isDragOver.value = false;

  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    // 检查文件数量限制
    if (!canAddMoreFiles(files.length)) {
      const currentCount = getCurrentFileCount();
      const remaining = props.maxFiles - currentCount;
      ElMessage.error(
        `最多只能添加 ${props.maxFiles} 个文件，当前已有 ${currentCount} 个，还可添加 ${remaining} 个`
      );
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (isSupportedFile(file)) {
        insertFile(file);
      } else {
        ElMessage.error(`不支持的文件类型: ${file.name}`);
      }
    }
  }
};

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
    // 压缩包
    zip: "application/zip",
    rar: "application/x-rar-compressed",
    "7z": "application/x-7z-compressed",
    tar: "application/x-tar",
    gz: "application/gzip",
  };
  return extensionMap[ext || ""] || "";
};

// 检查文件类型
const getFileType = (file: File): MessageType => {
  const mimeType = file.type || getMimeTypeByExtension(file.name);

  if (supportedFileTypes.image.includes(mimeType)) return "IMAGE";
  if (supportedFileTypes.video.includes(mimeType)) return "VIDEO";
  if (supportedFileTypes.audio.includes(mimeType)) return "VOICE";
  if (supportedFileTypes.document.includes(mimeType)) return "FILE";
  if (supportedFileTypes.archive.includes(mimeType)) return "FILE";

  return "FILE";
};

// 检查是否为支持的文件类型
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

// 检查拖拽的文件中是否包含支持的文件类型
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

// 处理文件上传前的验证
const beforeUpload = (file: File) => {
  const isSupported = isSupportedFile(file);
  const fileType = getFileType(file);
  // 图片、视频、音频文件限制20MB，其他文档类文件限制50MB
  const maxSize = ["IMAGE", "VIDEO", "VOICE"].includes(fileType) ? 20 : 50;
  const isValidSize = file.size / 1024 / 1024 < maxSize;

  if (!isSupported) {
    ElMessage.error("不支持的文件类型!");
    return false;
  }
  if (!isValidSize) {
    ElMessage.error(`文件大小不能超过 ${maxSize}MB!`);
    return false;
  }
  return false; // 阻止自动上传，手动处理
};

// 处理文件上传
const handleFileUpload = (file: UploadFile) => {
  if (file.raw) {
    // 检查文件数量限制
    if (!canAddMoreFiles(1)) {
      const currentCount = getCurrentFileCount();
      const remaining = props.maxFiles - currentCount;
      ElMessage.error(
        `最多只能添加 ${props.maxFiles} 个文件，当前已有 ${currentCount} 个，还可添加 ${remaining} 个`
      );
      return;
    }
    insertFile(file.raw);
  }
};

// 统一的文件插入函数
const insertFile = (file: File) => {
  if (!editableDiv.value) return;

  // 检查文件数量限制（单个文件插入时的额外检查）
  if (!canAddMoreFiles(1)) {
    const currentCount = getCurrentFileCount();
    const remaining = props.maxFiles - currentCount;
    ElMessage.error(
      `最多只能添加 ${props.maxFiles} 个文件，当前已有 ${currentCount} 个，还可添加 ${remaining} 个`
    );
    return;
  }

  // 验证文件类型和大小
  if (!isSupportedFile(file)) {
    ElMessage.error("不支持的文件类型!");
    return;
  }

  const fileType = getFileType(file);
  // 图片、视频、音频文件限制20MB，其他文档类文件限制50MB
  const maxSize = ["IMAGE", "VIDEO", "VOICE"].includes(fileType) ? 20 : 50;

  if (file.size / 1024 / 1024 > maxSize) {
    ElMessage.error(`文件大小不能超过 ${maxSize}MB!`);
    return;
  }

  if (fileType === "IMAGE") {
    insertImageElement(file);
  } else {
    insertFileElement(file);
  }
};

// 插入文件元素到编辑器
const insertFileElement = (file: File) => {
  const fileType = getFileType(file);
  const fileSize = (file.size / 1024 / 1024).toFixed(2);

  // 创建文件显示元素
  const fileDiv = document.createElement("div");
  fileDiv.style.display = "inline-block";
  fileDiv.style.margin = "2px 4px";
  fileDiv.style.padding = "8px 12px";
  fileDiv.style.border = "1px solid #ddd";
  fileDiv.style.borderRadius = "6px";
  fileDiv.style.backgroundColor = "#f5f5f5";
  fileDiv.style.cursor = "pointer";
  fileDiv.style.maxWidth = "200px";
  // 防止文件内容被编辑
  fileDiv.contentEditable = "false";
  fileDiv.setAttribute("contenteditable", "false");

  // 文件图标
  const icon = getFileIcon(fileType);
  fileDiv.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 16px;">${icon}</span>
      <div style="flex: 1; min-width: 0;">
        <div style="font-size: 12px; font-weight: 500; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${file.name}</div>
        <div style="font-size: 10px; color: #666;">${fileSize}MB</div>
      </div>
    </div>
  `;

  // 存储文件信息
  (fileDiv as any).fileData = {
    name: file.name,
    size: file.size,
    type: fileType,
    url: URL.createObjectURL(file),
  };

  // 添加删除功能
  fileDiv.addEventListener("dblclick", async () => {
    try {
      await ElMessageBox.confirm("确定要删除这个文件吗？", "确认删除", {
        type: "warning",
        confirmButtonText: "删除",
        cancelButtonText: "取消",
      });
      fileDiv.remove();
      ElMessage.success("文件已删除");
      updateEditorContent();
    } catch {
      // 用户取消删除
    }
  });

  editableDiv.value?.appendChild(fileDiv);

  // 在文件后添加一个空格
  const space = document.createTextNode(" ");
  editableDiv.value?.appendChild(space);

  updateEditorContent();
};

// 获取文件图标
const getFileIcon = (fileType: MessageType): string => {
  const icons = {
    IMAGE: "🖼️",
    VIDEO: "🎥",
    VOICE: "🎵",
    FILE: "📄",
    LINK: "🔗",
    TEXT: "📝",
  };
  return icons[fileType] || "📄";
};

// 插入图片元素到编辑器
const insertImageElement = (file: File) => {
  if (!editableDiv.value) return;

  // 验证文件类型和大小
  if (!file.type.startsWith("image/")) {
    ElMessage.error("只能上传图片文件!");
    return;
  }

  if (file.size / 1024 / 1024 > 20) {
    ElMessage.error("图片大小不能超过 20MB!");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const img = document.createElement("img");
    img.src = reader.result as string;
    img.style.maxWidth = "120px";
    img.style.maxHeight = "120px";
    img.style.verticalAlign = "middle";
    img.style.margin = "2px 4px";
    img.style.cursor = "pointer";
    img.style.borderRadius = "4px";
    img.style.border = "1px solid #ddd";
    // 防止图片内容被编辑
    img.contentEditable = "false";
    img.setAttribute("contenteditable", "false");

    // 添加点击预览功能
    img.addEventListener("click", () => {
      previewImage.value = img.src;
      previewVisible.value = true;
    });

    // 添加删除功能（双击删除）
    img.addEventListener("dblclick", async () => {
      try {
        await ElMessageBox.confirm("确定要删除这张图片吗？", "确认删除", {
          type: "warning",
          confirmButtonText: "删除",
          cancelButtonText: "取消",
        });
        img.remove();
        ElMessage.success("图片已删除");
        // 更新编辑器内容状态
        updateEditorContent();
      } catch {
        // 用户取消删除
      }
    });

    editableDiv.value?.appendChild(img);

    // 在图片后添加一个空格，方便继续输入
    const space = document.createTextNode(" ");
    editableDiv.value?.appendChild(space);

    // 设置光标位置到图片后面
    const range = document.createRange();
    const selection = window.getSelection();
    range.setStartAfter(space);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);

    // 更新编辑器内容状态
    updateEditorContent();
  };

  reader.readAsDataURL(file);
};

/**
 * 处理发送消息 - 支持异步文件上传
 */
const handleSend = async () => {
  if (!editableDiv.value || isEmpty.value) {
    ElMessage.warning("请输入消息内容");
    return;
  }

  if (!qiniuUploadService.value) {
    ElMessage.error("上传服务未初始化");
    return;
  }

  const nodes = editableDiv.value.childNodes;
  const messages: MessageContent[] = [];
  const filesToUpload: { file: File; messageIndex: number; node: Node }[] = [];
  let buffer = "";

  // 辅助函数：根据文件扩展名或MIME类型判断消息类型
  const getMessageTypeFromUrl = (url: string): MessageType => {
    const imageExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".bmp",
      ".webp",
      ".svg",
    ];
    const videoExtensions = [
      ".mp4",
      ".avi",
      ".mov",
      ".wmv",
      ".flv",
      ".webm",
      ".mkv",
    ];
    const audioExtensions = [".mp3", ".wav", ".ogg", ".aac", ".flac", ".m4a"];

    const lowerUrl = url.toLowerCase();

    if (imageExtensions.some((ext) => lowerUrl.includes(ext))) {
      return "IMAGE";
    }
    if (videoExtensions.some((ext) => lowerUrl.includes(ext))) {
      return "VIDEO";
    }
    if (audioExtensions.some((ext) => lowerUrl.includes(ext))) {
      return "VOICE";
    }
    if (lowerUrl.startsWith("http") || lowerUrl.startsWith("https")) {
      return "LINK";
    }
    return "FILE";
  };

  // 从blob URL获取File对象
  const getFileFromBlobUrl = async (
    blobUrl: string,
    node: Node
  ): Promise<File | null> => {
    try {
      if (node.nodeName === "IMG") {
        // 对于图片，从img元素获取文件信息
        const img = node as HTMLImageElement;
        const response = await fetch(blobUrl);
        const blob = await response.blob();
        const fileName = `image_${Date.now()}.${
          blob.type.split("/")[1] || "png"
        }`;
        return new File([blob], fileName, { type: blob.type });
      } else if (node.nodeName === "DIV" && (node as any).fileData) {
        // 对于文件元素，从fileData获取信息
        const fileData = (node as any).fileData;
        const response = await fetch(blobUrl);
        const blob = await response.blob();
        return new File([blob], fileData.name, { type: blob.type });
      }
    } catch (error) {
      console.error("获取文件失败:", error);
    }
    return null;
  };

  // 解析消息内容
  for (const node of nodes) {
    if (node.nodeName === "IMG") {
      // 遇到图片 => 先推送文字消息，再推送图片消息
      if (buffer.trim()) {
        messages.push({
          type: "TEXT",
          tempId: Date.now() + Math.random(),
          content: buffer.trim(),
        });
        buffer = "";
      }

      const imgSrc = (node as HTMLImageElement).src;
      const messageIndex = messages.length;

      // 如果是blob URL，需要上传
      if (imgSrc.startsWith("blob:")) {
        const file = await getFileFromBlobUrl(imgSrc, node);
        if (file) {
          filesToUpload.push({ file, messageIndex, node });
        }

        messages.push({
          type: "IMAGE",
          tempId: Date.now() + Math.random(),
          content: "[图片上传中...]",
          url: imgSrc, // 临时URL，上传完成后会更新
        });
      } else {
        messages.push({
          type: "IMAGE",
          tempId: Date.now() + Math.random(),
          content: imgSrc,
          url: imgSrc,
        });
      }
    } else if (node.nodeName === "DIV" && (node as any).fileData) {
      // 处理文件元素
      if (buffer.trim()) {
        messages.push({
          type: "TEXT",
          tempId: Date.now() + Math.random(),
          content: buffer.trim(),
        });
        buffer = "";
      }

      const fileData = (node as any).fileData;
      const messageIndex = messages.length;

      // 如果是blob URL，需要上传
      if (fileData.url.startsWith("blob:")) {
        const file = await getFileFromBlobUrl(fileData.url, node);
        if (file) {
          filesToUpload.push({ file, messageIndex, node });
        }

        messages.push({
          type: fileData.type,
          tempId: Date.now() + Math.random(),
          content: `[${fileData.name} 上传中...]`,
          url: fileData.url, // 临时URL，上传完成后会更新
          payload: {
            key: "", // 上传完成后填充
            fileName: fileData.name,
            fileSize: fileData.size,
            url: "", // 上传完成后填充
          },
        });
      } else {
        messages.push({
          type: fileData.type,
          tempId: Date.now() + Math.random(),
          content: fileData.name,
          url: fileData.url,
          payload: {
            key: fileData.url,
            fileName: fileData.name,
            fileSize: fileData.size,
            url: fileData.url,
          },
        });
      }
    } else {
      // 处理文本内容，检查是否包含URL
      const textContent = node.textContent || "";
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = textContent.match(urlRegex);

      if (urls) {
        // 如果文本中包含URL，需要分别处理
        let remainingText = textContent;
        urls.forEach((url) => {
          const parts = remainingText.split(url);
          if (parts[0]) {
            buffer += parts[0];
          }

          // 推送之前的文本
          if (buffer.trim()) {
            messages.push({
              type: "TEXT",
              tempId: Date.now() + Math.random(),
              content: buffer.trim(),
            });
            buffer = "";
          }

          // 推送URL
          const messageType = getMessageTypeFromUrl(url);
          messages.push({
            type: messageType,
            tempId: Date.now() + Math.random(),
            content: url,
            url: messageType !== "TEXT" ? url : undefined,
          });

          remainingText = parts.slice(1).join(url);
        });
        buffer += remainingText;
      } else {
        buffer += textContent;
      }
    }
  }

  // 处理剩余的文本内容
  if (buffer.trim()) {
    messages.push({
      type: "TEXT",
      tempId: Date.now() + Math.random(),
      content: buffer.trim(),
    });
  }

  emits("message", messages);
  // 创建消息组
  const groupId = generateMessageGroupId();
  messageGroup.value = {
    id: groupId,
    messages,
    uploadTasks: [],
    isUploading: filesToUpload.length > 0,
    uploadProgress: 0,
  };

  // 清空输入框
  editableDiv.value.innerHTML = "";
  updateEditorContent();

  // 如果没有文件需要上传，直接触发消息准备完毕事件
  if (filesToUpload.length === 0) {
    emits("message-group-ready", {
      id: groupId,
      messages,
      uploadedFiles: [],
    });
    ElMessage.success(`消息准备完毕，包含 ${messages.length} 条内容`);
    return;
  }

  const uploadTasks: UploadTask[] = [];
  const uploadedFiles: { url: string; key: string; fileName: string }[] = [];
  let completedCount = 0;
  let hasError = false;
  const failedFiles: string[] = [];

  // 上传每个文件
  for (const { file, messageIndex } of filesToUpload) {
    try {
      const task = await qiniuUploadService.value.upload(
        file,
        undefined, // 让服务端生成key
        (progress) => {
          // 更新上传进度
          const totalProgress = calculateUploadProgress(uploadTasks);
          messageGroup.value!.uploadProgress = totalProgress;

          emits("upload-progress", {
            groupId,
            percent: totalProgress,
            uploadingCount: uploadTasks.filter((t) => t.status === "uploading")
              .length,
          });
        },
        (status) => {
          if (status === "success") {
            completedCount++;

            // 更新消息中的URL
            if (task.url) {
              messages[messageIndex].url = task.url;
              messages[messageIndex].content =
                messages[messageIndex].type === "IMAGE" ? task.url : file.name;

              if (messages[messageIndex].payload) {
                messages[messageIndex].payload!.url = task.url;
                messages[messageIndex].payload!.key = task.key;
              }

              uploadedFiles.push({
                url: task.url,
                key: task.key,
                fileName: file.name,
              });
            }

            // 检查是否所有文件都上传完成
            if (completedCount === filesToUpload.length && !hasError) {
              messageGroup.value!.isUploading = false;
              messageGroup.value!.uploadProgress = 100;

              emits("message-group-ready", {
                id: groupId,
                messages,
                uploadedFiles,
              });

              ElMessage.success(`所有文件上传完成，消息准备完毕`);
            }
          } else if (status === "error") {
            hasError = true;
            failedFiles.push(file.name);

            emits("upload-error", {
              groupId,
              message: `文件 ${file.name} 上传失败`,
              failedFiles,
            });

            ElMessage.error(`文件 ${file.name} 上传失败`);
          }
        }
      );

      uploadTasks.push(task);
      messageGroup.value!.uploadTasks = uploadTasks;
    } catch (error) {
      hasError = true;
      failedFiles.push(file.name);
      console.error(`文件 ${file.name} 上传失败:`, error);

      emits("upload-error", {
        groupId,
        message: `文件 ${file.name} 上传失败: ${error}`,
        failedFiles,
      });

      ElMessage.error(`文件 ${file.name} 上传失败`);
    }
  }
};

// 组件挂载后设置焦点
nextTick(() => {
  editableDiv.value?.focus();
});
</script>

<style scoped lang="scss">
.message-box {
  position: relative;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  padding: 12px;
  background: var(--el-bg-color);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.editor {
  min-height: 120px;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 12px;
  background: var(--el-bg-color-page);
  transition: all 0.3s ease;
  position: relative;
}

.editor:focus {
  outline: none;
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 2px var(--el-color-primary-light-9);
}

.editor.drag-over {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-style: dashed;
}

.editor:empty:before {
  content: attr(placeholder);
  color: var(--el-text-color-placeholder);
  pointer-events: none;
}

.drag-overlay {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  bottom: 60px;
  background: rgba(64, 158, 255, 0.1);
  border: 2px dashed var(--el-color-primary);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 10;
  pointer-events: none;
}

.drag-icon {
  font-size: 32px;
  color: var(--el-color-primary);
  margin-bottom: 8px;
}

.drag-overlay p {
  color: var(--el-color-primary);
  font-size: 14px;
  margin: 0;
}

.actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.preview-container {
  text-align: center;
}

.preview-img {
  max-width: 100%;
  max-height: 70vh;
  border-radius: 4px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .message-box {
    padding: 8px;
  }

  .editor {
    min-height: 80px;
  }

  .actions {
    justify-content: center;
  }
}
</style>
