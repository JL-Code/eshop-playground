<template>
  <div class="qiniu-upload-demo">
    <div class="demo-header">
      <h1>七牛云文件上传演示</h1>
      <p>支持进度展示、暂停/恢复、断点续传功能</p>
    </div>

    <div class="demo-content">
      <!-- 配置面板 -->
      <el-card class="config-panel">
        <template #header>
          <span>上传配置</span>
        </template>

        <el-form :model="config" label-width="120px">
          <el-form-item label="存储域名">
            <el-input
              v-model="config.domain"
              placeholder="请输入七牛云存储域名"
            />
          </el-form-item>

          <el-form-item label="Token接口">
            <el-input
              v-model="config.tokenUrl"
              placeholder="请输入获取上传token的接口地址"
            />
          </el-form-item>

          <el-form-item label="最大文件大小">
            <el-input-number
              v-model="config.maxFileSize"
              :min="1"
              :max="1000"
              controls-position="right"
            />
            <span style="margin-left: 8px">MB</span>
          </el-form-item>

          <el-form-item label="并发上传数">
            <el-input-number
              v-model="config.maxConcurrent"
              :min="1"
              :max="10"
              controls-position="right"
            />
          </el-form-item>

          <el-form-item label="允许的文件类型">
            <el-select
              v-model="config.allowedTypes"
              multiple
              placeholder="选择允许的文件类型"
              style="width: 100%"
            >
              <el-option label="所有类型" value="*" />
              <el-option label="图片" value="image/" />
              <el-option label="视频" value="video/" />
              <el-option label="音频" value="audio/" />
              <el-option label="PDF" value="application/pdf" />
              <el-option label="Word文档" value="application/msword" />
              <el-option label="Excel表格" value="application/vnd.ms-excel" />
            </el-select>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 上传组件 -->
      <el-card class="upload-panel">
        <template #header>
          <span>文件上传</span>
        </template>

        <UploadQiniuUploader
          :domain="config.domain"
          :token-url="config.tokenUrl"
          :max-file-size="config.maxFileSize"
          :allowed-types="config.allowedTypes"
          :max-concurrent="config.maxConcurrent"
          @success="handleUploadSuccess"
          @error="handleUploadError"
          @progress="handleUploadProgress"
        />
      </el-card>

      <!-- 统计信息 -->
      <el-card class="stats-panel">
        <template #header>
          <span>上传统计</span>
        </template>

        <el-row :gutter="20">
          <el-col :span="6">
            <el-statistic title="成功上传" :value="stats.success" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="上传失败" :value="stats.error" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="总文件数" :value="stats.total" />
          </el-col>
          <el-col :span="6">
            <el-statistic
              title="成功率"
              :value="
                stats.total > 0
                  ? Math.round((stats.success / stats.total) * 100)
                  : 0
              "
              suffix="%"
            />
          </el-col>
        </el-row>
      </el-card>

      <!-- 上传历史 -->
      <el-card class="history-panel">
        <template #header>
          <div class="history-header">
            <span>上传历史</span>
            <el-button size="small" @click="clearHistory">清空历史</el-button>
          </div>
        </template>

        <el-table :data="uploadHistory" style="width: 100%">
          <el-table-column prop="fileName" label="文件名" min-width="200" />
          <el-table-column prop="fileSize" label="文件大小" width="120">
            <template #default="{ row }">
              {{ formatFileSize(row.fileSize) }}
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" size="small">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="uploadTime" label="上传时间" width="180">
            <template #default="{ row }">
              {{ formatTime(row.uploadTime) }}
            </template>
          </el-table-column>
          <el-table-column prop="url" label="文件链接" min-width="200">
            <template #default="{ row }">
              <el-link
                v-if="row.url"
                :href="row.url"
                target="_blank"
                type="primary"
              >
                查看文件
              </el-link>
              <span v-else>-</span>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import type { UploadTask } from "~/composables/qiniu-upload";
import { UploadStatus } from "~/composables/qiniu-upload";

// 页面标题
useHead({
  title: "七牛云上传演示 - Eshop Playground",
});

// 配置数据
const config = reactive({
  /**
   * OSS 上传域名，不带 http 协议
   */
  domain: "upload.qiniup.com",
  /**
   * 上传令牌接口
   */
  tokenUrl: "http://localhost:8081/oss/qiniu/token",
  /**
   * 上传文件大小限制，单位MB
   */
  maxFileSize: 300,
  /**
   * 最大并发上传数量
   */
  maxConcurrent: 3,
  /**
   * 允许上传的文件类型，* 表示所有类型
   */
  allowedTypes: ["*"],
});

// 统计数据
const stats = reactive({
  success: 0,
  error: 0,
  total: 0,
});

// 上传历史
interface UploadHistoryItem {
  id: string;
  fileName: string;
  fileSize: number;
  status: UploadStatus;
  uploadTime: Date;
  url?: string;
  error?: string;
}

const uploadHistory = ref<UploadHistoryItem[]>([]);

// 事件处理
const handleUploadSuccess = (task: UploadTask) => {
  stats.success++;
  stats.total++;

  // 添加到历史记录
  uploadHistory.value.unshift({
    id: task.id,
    fileName: task.file.name,
    fileSize: task.file.size,
    status: task.status,
    uploadTime: new Date(),
    url: task.url,
  });

  ElMessage.success(`${task.file.name} 上传成功！`);
};

const handleUploadError = (task: UploadTask) => {
  stats.error++;
  stats.total++;

  // 添加到历史记录
  uploadHistory.value.unshift({
    id: task.id,
    fileName: task.file.name,
    fileSize: task.file.size,
    status: task.status,
    uploadTime: new Date(),
    error: task.error,
  });

  ElMessage.error(`${task.file.name} 上传失败：${task.error}`);
};

const handleUploadProgress = (task: UploadTask) => {
  // 可以在这里处理进度更新，比如显示全局进度
  console.log(`${task.file.name} 上传进度: ${task.progress.percent}%`);
};

// 清空历史
const clearHistory = () => {
  uploadHistory.value = [];
  stats.success = 0;
  stats.error = 0;
  stats.total = 0;
  ElMessage.info("历史记录已清空");
};

// 工具函数
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const formatTime = (date: Date): string => {
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

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
</script>

<style scoped>
.qiniu-upload-demo {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.demo-header {
  text-align: center;
  margin-bottom: 32px;
}

.demo-header h1 {
  color: #303133;
  margin-bottom: 8px;
}

.demo-header p {
  color: #606266;
  font-size: 16px;
}

.demo-content {
  display: grid;
  gap: 24px;
}

.config-panel {
  margin-bottom: 24px;
}

.upload-panel {
  margin-bottom: 24px;
}

.stats-panel {
  margin-bottom: 24px;
}

.history-panel {
  margin-bottom: 24px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .qiniu-upload-demo {
    padding: 16px;
  }

  .demo-content {
    gap: 16px;
  }

  .config-panel,
  .upload-panel,
  .stats-panel,
  .history-panel {
    margin-bottom: 16px;
  }
}
</style>
