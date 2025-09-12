<template>
  <div class="qiniu-uploader">
    <!-- 上传区域 -->
    <div
      class="upload-area"
      :class="{ 'drag-over': isDragOver }"
      @drop="handleDrop"
      @dragover.prevent="handleDragOver"
      @dragenter.prevent="handleDragEnter"
      @dragleave.prevent="handleDragLeave"
    >
      <el-icon class="upload-icon">
        <Upload />
      </el-icon>
      <p class="upload-text">拖拽文件到此处或点击上传</p>
      <el-button type="primary" @click="selectFiles">选择文件</el-button>
      <input
        ref="fileInput"
        type="file"
        multiple
        style="display: none"
        @change="handleFileSelect"
      />
    </div>

    <!-- 上传任务列表 -->
    <div v-if="tasks.length > 0" class="task-list">
      <div class="task-header">
        <h3>上传任务</h3>
        <div class="task-actions">
          <el-button size="small" @click="pauseAll">全部暂停</el-button>
          <el-button size="small" @click="resumeAll">全部恢复</el-button>
          <el-button size="small" @click="clearCompleted">清理已完成</el-button>
        </div>
      </div>

      <div class="task-item" v-for="task in tasks" :key="task.id">
        <div class="task-info">
          <div class="file-info">
            <el-icon class="file-icon">
              <Document v-if="isDocument(task.file)" />
              <Picture v-else-if="isImage(task.file)" />
              <VideoPlay v-else-if="isVideo(task.file)" />
              <Microphone v-else-if="isAudio(task.file)" />
              <Folder v-else />
            </el-icon>
            <div class="file-details">
              <div class="file-name">{{ task.file.name }}</div>
              <div class="file-size">{{ formatFileSize(task.file.size) }}</div>
            </div>
          </div>

          <div class="task-status">
            <el-tag :type="getStatusType(task.status)" size="small">
              {{ getStatusText(task.status) }}
            </el-tag>
          </div>
        </div>

        <!-- 进度条 -->
        <div class="progress-section">
          <el-progress
            :percentage="task.progress.percent"
            :status="getProgressStatus(task.status)"
            :show-text="false"
          />
          <div class="progress-info">
            <span class="progress-text">
              {{ formatFileSize(task.progress.loaded) }} /
              {{ formatFileSize(task.progress.total) }}
            </span>
            <span
              v-if="task.progress.speed && task.status === 'uploading'"
              class="speed-info"
            >
              {{ formatSpeed(task.progress.speed) }}
            </span>
            <span
              v-if="task.progress.remainingTime && task.status === 'uploading'"
              class="time-info"
            >
              剩余 {{ formatRemainingTime(task.progress.remainingTime) }}
            </span>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="task-actions">
          <el-button
            v-if="task.status === 'uploading'"
            size="small"
            @click="pauseTask(task.id)"
          >
            暂停
          </el-button>
          <el-button
            v-if="task.status === 'paused'"
            size="small"
            type="primary"
            @click="resumeTask(task.id)"
          >
            恢复
          </el-button>
          <el-button
            v-if="task.status === 'error'"
            size="small"
            type="warning"
            @click="retryTask(task.id)"
          >
            重试
          </el-button>
          <el-button size="small" type="danger" @click="removeTask(task.id)">
            删除
          </el-button>
        </div>

        <!-- 错误信息 -->
        <div v-if="task.error" class="error-message">
          <el-alert :title="task.error" type="error" :closable="false" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import {
  Upload,
  Document,
  Picture,
  VideoPlay,
  Microphone,
  Folder,
} from "@element-plus/icons-vue";
import {
  QiniuUploadService,
  UploadStatus,
  createQiniuUploadService,
} from "~/composables/qiniu-upload";
import type { UploadTask, TokenResponse } from "~/composables/qiniu-upload";

// Props
interface Props {
  domain: string;
  tokenUrl?: string;
  maxFileSize?: number; // MB
  allowedTypes?: string[];
  maxConcurrent?: number;
}

const props = withDefaults(defineProps<Props>(), {
  tokenUrl: "http://localhost:8081/oss/qiniu/token",
  maxFileSize: 100,
  allowedTypes: () => ["*"],
  maxConcurrent: 3,
});

// Emits
const emits = defineEmits<{
  success: [task: UploadTask];
  error: [task: UploadTask];
  progress: [task: UploadTask];
}>();

// 响应式数据
const isDragOver = ref(false);
const fileInput = ref<HTMLInputElement>();
const tasks = ref<UploadTask[]>([]);
const uploadService = ref<QiniuUploadService | null>(null);

// Token响应接口已在composables中定义

// Token提供函数
const getUploadToken = async (fileKey: string): Promise<TokenResponse> => {
  console.log("getUploadToken fileKey", fileKey);
  if (props.tokenUrl) {
    const response = await fetch(
      `${props.tokenUrl}?fileKey=${encodeURIComponent(fileKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJVXzIwMjUwNjI0Mzk2OTA4MTAwIiwiaWF0IjoxNzU3NjYxOTU5LCJleHAiOjE3NTgyNjY3NTl9.ZOIJrPeMeiS11Y0hSzbyH7ygyEmtO6N0NCn-wRLDFZk",
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `获取上传token失败: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    if (!data.token || !data.key || !data.fname) {
      throw new Error("服务端返回的数据格式不正确，缺少必要字段");
    }

    return {
      token: data.token,
      key: data.key,
      fname: data.fname,
    };
  }

  throw new Error("请配置tokenUrl");
};

// 初始化上传服务
onMounted(() => {
  uploadService.value = createQiniuUploadService(getUploadToken, {
    domain: props.domain,
    concurrentRequestLimit: props.maxConcurrent,
  });
});

// 文件类型检测
const isImage = (file: File) => file.type.startsWith("image/");
const isVideo = (file: File) => file.type.startsWith("video/");
const isAudio = (file: File) => file.type.startsWith("audio/");
const isDocument = (file: File) => {
  const docTypes = ["application/pdf", "application/msword", "text/plain"];
  return docTypes.some((type) => file.type.includes(type));
};

// 文件验证
const validateFile = (file: File): boolean => {
  // 检查文件大小
  if (file.size > props.maxFileSize * 1024 * 1024) {
    ElMessage.error(`文件大小不能超过 ${props.maxFileSize}MB`);
    return false;
  }

  // 检查文件类型
  if (props.allowedTypes[0] !== "*") {
    const isAllowed = props.allowedTypes.some((type) => {
      if (type.startsWith(".")) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }
      return file.type.includes(type);
    });

    if (!isAllowed) {
      ElMessage.error("不支持的文件类型");
      return false;
    }
  }

  return true;
};

// 处理文件上传
const handleFiles = async (files: FileList | File[]) => {
  const fileArray = Array.from(files);

  for (const file of fileArray) {
    if (!validateFile(file)) continue;

    try {
      if (!uploadService.value) return;

      const task = await uploadService.value.upload(
        file,
        undefined, // 使用自动生成的key
        (progress) => {
          // 更新任务列表中的进度
          const taskIndex = tasks.value.findIndex((t) => t.id === task.id);
          if (taskIndex !== -1) {
            // 创建新的progress对象来触发响应式更新
            tasks.value[taskIndex] = {
              ...tasks.value[taskIndex],
              progress: { ...progress },
            };
            // 同步更新task对象的progress
            task.progress = progress;
          }
          emits("progress", task);
        },
        (status) => {
          // 更新任务状态
          const taskIndex = tasks.value.findIndex((t) => t.id === task.id);
          if (taskIndex !== -1) {
            // 创建新的task对象来触发响应式更新
            tasks.value[taskIndex] = {
              ...tasks.value[taskIndex],
              status: status,
            };
            // 同步更新task对象的status
            task.status = status;
          }

          if (status === UploadStatus.SUCCESS) {
            emits("success", task);
          } else if (status === UploadStatus.ERROR) {
            emits("error", task);
          }
        }
      );

      tasks.value.push(task);
    } catch (error) {
      ElMessage.error(`${file.name} 上传失败: ${error}`);
    }
  }
};

// 选择文件
const selectFiles = () => {
  fileInput.value?.click();
};

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files) {
    handleFiles(target.files);
    target.value = ""; // 清空input，允许重复选择同一文件
  }
};

// 拖拽处理
const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
};

const handleDragEnter = (e: DragEvent) => {
  e.preventDefault();
  isDragOver.value = true;
};

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault();
  isDragOver.value = false;
};

const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  isDragOver.value = false;

  if (e.dataTransfer?.files) {
    handleFiles(e.dataTransfer.files);
  }
};

// 任务操作
const pauseTask = (taskId: string) => {
  if (uploadService.value?.pause(taskId)) {
    // 更新UI中的任务状态
    const taskIndex = tasks.value.findIndex((t) => t.id === taskId);
    if (taskIndex !== -1) {
      tasks.value[taskIndex] = {
        ...tasks.value[taskIndex],
        status: UploadStatus.PAUSED
      };
    }
    ElMessage.info("任务已暂停");
  }
};

const resumeTask = async (taskId: string) => {
  const task = tasks.value.find((t) => t.id === taskId);
  if (!task) return;

  if (!uploadService.value) return;

  const success = await uploadService.value.resume(
    taskId,
    (progress) => {
      const taskIndex = tasks.value.findIndex((t) => t.id === taskId);
      if (taskIndex !== -1) {
        // 创建新的progress对象来触发响应式更新
        tasks.value[taskIndex] = {
          ...tasks.value[taskIndex],
          progress: { ...progress },
        };
        // 同步更新task对象的progress
        task.progress = progress;
      }
      emits("progress", task);
    },
    (status) => {
      const taskIndex = tasks.value.findIndex((t) => t.id === taskId);
      if (taskIndex !== -1) {
        // 创建新的task对象来触发响应式更新
        tasks.value[taskIndex] = {
          ...tasks.value[taskIndex],
          status: status,
        };
        // 同步更新task对象的status
        task.status = status;
      }

      if (status === UploadStatus.SUCCESS) {
        emits("success", task);
        ElMessage.success(`${task.file.name} 上传成功`);
      } else if (status === UploadStatus.ERROR) {
        emits("error", task);
        ElMessage.error(`${task.file.name} 上传失败`);
      }
    }
  );

  if (success) {
    ElMessage.info("任务已恢复");
  }
};

const removeTask = (taskId: string) => {
  uploadService.value?.remove(taskId);
  const index = tasks.value.findIndex((t) => t.id === taskId);
  if (index !== -1) {
    tasks.value.splice(index, 1);
  }
};

const retryTask = async (taskId: string) => {
  const task = tasks.value.find((t) => t.id === taskId);
  if (!task) return;

  // 移除旧任务，重新上传
  removeTask(taskId);
  await handleFiles([task.file]);
};

// 批量操作
const pauseAll = () => {
  tasks.value.forEach((task, index) => {
    if (task.status === UploadStatus.UPLOADING) {
      if (uploadService.value?.pause(task.id)) {
        // 更新UI中的任务状态
        tasks.value[index] = {
          ...tasks.value[index],
          status: UploadStatus.PAUSED
        };
      }
    }
  });
  ElMessage.info("所有任务已暂停");
};

const resumeAll = async () => {
  for (const task of tasks.value) {
    if (task.status === UploadStatus.PAUSED) {
      await resumeTask(task.id);
    }
  }
};

const clearCompleted = () => {
  tasks.value = tasks.value.filter(
    (task) =>
      task.status !== UploadStatus.SUCCESS &&
      task.status !== UploadStatus.ERROR &&
      task.status !== UploadStatus.CANCELLED
  );
  uploadService.value?.clearCompletedTasks();
};

// 状态相关
const getStatusType = (status: UploadStatus) => {
  switch (status) {
    case UploadStatus.SUCCESS:
      return "success";
    case UploadStatus.ERROR:
      return "danger";
    case UploadStatus.UPLOADING:
      return "primary";
    case UploadStatus.PAUSED:
      return "warning";
    default:
      return "info";
  }
};

const getStatusText = (status: UploadStatus) => {
  switch (status) {
    case UploadStatus.PENDING:
      return "等待中";
    case UploadStatus.UPLOADING:
      return "上传中";
    case UploadStatus.PAUSED:
      return "已暂停";
    case UploadStatus.SUCCESS:
      return "已完成";
    case UploadStatus.ERROR:
      return "上传失败";
    case UploadStatus.CANCELLED:
      return "已取消";
    default:
      return "未知状态";
  }
};

const getProgressStatus = (status: UploadStatus) => {
  switch (status) {
    case UploadStatus.SUCCESS:
      return "success";
    case UploadStatus.ERROR:
      return "exception";
    default:
      return undefined;
  }
};

// 格式化函数
const formatFileSize = (bytes: number) =>
  QiniuUploadService.formatFileSize(bytes);
const formatSpeed = (bytesPerSecond: number) =>
  QiniuUploadService.formatSpeed(bytesPerSecond);
const formatRemainingTime = (seconds: number) =>
  QiniuUploadService.formatRemainingTime(seconds);

// 清理
onUnmounted(() => {
  // 取消所有上传任务
  tasks.value.forEach((task) => {
    uploadService.value?.cancel(task.id);
  });
});
</script>

<style scoped>
.qiniu-uploader {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

.upload-area {
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  background: #fafafa;
  transition: all 0.3s ease;
  cursor: pointer;
}

.upload-area:hover,
.upload-area.drag-over {
  border-color: #409eff;
  background: #f0f9ff;
}

.upload-icon {
  font-size: 48px;
  color: #c0c4cc;
  margin-bottom: 16px;
}

.upload-text {
  margin: 16px 0;
  color: #606266;
  font-size: 14px;
}

.task-list {
  margin-top: 24px;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

.task-header h3 {
  margin: 0;
  color: #303133;
}

.task-item {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  background: white;
}

.task-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-icon {
  font-size: 24px;
  color: #409eff;
}

.file-details {
  display: flex;
  flex-direction: column;
}

.file-name {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.file-size {
  font-size: 12px;
  color: #909399;
}

.progress-section {
  margin-bottom: 12px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 12px;
  color: #606266;
}

.speed-info,
.time-info {
  color: #409eff;
}

.task-actions {
  display: flex;
  gap: 8px;
}

.error-message {
  margin-top: 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .task-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .task-info {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .progress-info {
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
  }

  .task-actions {
    justify-content: center;
  }
}
</style>
