<template>
  <div class="message-box">
    <!-- debug -->
    <div class="flex" v-if="debug">
      <div>isEmpty: {{ isEmpty }}</div>
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
      placeholder="请输入消息，支持拖拽或粘贴图片..."
    ></div>

    <!-- 拖拽提示遮罩 -->
    <div v-if="isDragOver" class="drag-overlay">
      <el-icon class="drag-icon">
        <Upload />
      </el-icon>
      <p>拖拽图片到此处上传</p>
    </div>

    <!-- 操作按钮区域 -->
    <div class="actions">
      <el-upload
        ref="uploadRef"
        :show-file-list="false"
        :before-upload="beforeUpload"
        accept="image/*"
        :auto-upload="false"
        @change="handleImageUpload"
      >
        <el-button type="primary" :icon="Picture" size="small">
          上传图片
        </el-button>
      </el-upload>

      <el-button
        type="success"
        :icon="Position"
        size="small"
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
import { ElMessage, ElMessageBox } from "element-plus";
import { Upload, Picture, Position } from "@element-plus/icons-vue";
import type { UploadFile } from "element-plus";

withDefaults(
  defineProps<{
    debug?: boolean;
  }>(),
  {
    debug: true,
  }
);

const editableDiv = ref<HTMLDivElement | null>(null);
const uploadRef = ref();
const isDragOver = ref(false);
const previewVisible = ref(false);
const previewImage = ref("");

// 用于追踪编辑器内容变化的响应式变量
const editorContent = ref("");

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

// 在组件挂载后设置监听器
onMounted(() => {
  setupContentWatcher();
});

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
          insertImage(file);
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
  if (hasImageFiles(e)) {
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

const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  isDragOver.value = false;

  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith("image/")) {
        insertImage(file);
      }
    }
  }
};

// 检查拖拽的文件中是否包含图片
const hasImageFiles = (e: DragEvent): boolean => {
  const items = e.dataTransfer?.items;
  if (items) {
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        return true;
      }
    }
  }
  return false;
};

// 处理文件上传前的验证
const beforeUpload = (file: File) => {
  const isImage = file.type.startsWith("image/");
  const isLt5M = file.size / 1024 / 1024 < 5;

  if (!isImage) {
    ElMessage.error("只能上传图片文件!");
    return false;
  }
  if (!isLt5M) {
    ElMessage.error("图片大小不能超过 5MB!");
    return false;
  }
  return false; // 阻止自动上传，手动处理
};

// 处理图片上传
const handleImageUpload = (file: UploadFile) => {
  if (file.raw) {
    insertImage(file.raw);
  }
};

// 插入图片到编辑器
const insertImage = (file: File) => {
  if (!editableDiv.value) return;

  // 验证文件类型和大小
  if (!file.type.startsWith("image/")) {
    ElMessage.error("只能上传图片文件!");
    return;
  }

  if (file.size / 1024 / 1024 > 5) {
    ElMessage.error("图片大小不能超过 5MB!");
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
  ElMessage.success("图片上传成功");
};

/**
 * 处理发送消息
 */
const handleSend = () => {
  if (!editableDiv.value) {
    ElMessage.warning("请输入消息内容");
    return;
  }

  const content = editableDiv.value.innerHTML.trim();
  console.log(content);

  if (isEmpty.value) {
    ElMessage.warning("请输入消息内容");
    return;
  }

  const nodes = editableDiv.value.childNodes;
  const messages: string[] = [];
  let buffer = "";

  nodes.forEach((node) => {
    if (node.nodeName === "IMG") {
      // 遇到图片 => 先推送文字消息，再推送图片消息
      if (buffer.trim()) {
        messages.push(buffer.trim());
        buffer = "";
      }
      messages.push((node as HTMLImageElement).src);
    } else {
      buffer += node.textContent || "";
    }
  });

  if (buffer.trim()) {
    messages.push(buffer.trim());
  }

  console.log("拆分后的消息：", messages);

  // 清空输入框
  editableDiv.value.innerHTML = "";

  // 更新编辑器内容状态
  updateEditorContent();

  ElMessage.success(`发送了 ${messages.length} 条消息`);
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
