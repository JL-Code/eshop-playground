<script setup lang="ts">
import { Picture, VideoPlay, Link } from '@element-plus/icons-vue';

interface Props {
  message: MessageContent;
  showTime?: boolean;
  isOwn?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showTime: true,
  isOwn: false,
});

// 获取文件图标
const getFileIcon = (type: MessageType): string => {
  switch (type) {
    case "IMAGE":
      return "🖼️";
    case "VIDEO":
      return "🎥";
    case "VOICE":
      return "🎵";
    case "FILE":
      return "📎";
    case "LINK":
      return "🔗";
    default:
      return "📄";
  }
};

// 格式化文件大小
const formatFileSize = (bytes?: number): string => {
  if (!bytes) return "";
  const sizes = ["B", "KB", "MB", "GB"];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < sizes.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(1)} ${sizes[i]}`;
};

// 格式化时间
const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) {
    return "刚刚";
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`;
  } else if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`;
  } else {
    return date.toLocaleDateString();
  }
};

// 检查是否为图片URL
const isImageUrl = (url: string): boolean => {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];
  return imageExtensions.some(ext => url.toLowerCase().includes(ext));
};

// 检查是否为视频URL
const isVideoUrl = (url: string): boolean => {
  const videoExtensions = [".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm"];
  return videoExtensions.some(ext => url.toLowerCase().includes(ext));
};

// 获取上传状态文本
const getUploadStatusText = (status: string): string => {
  switch (status) {
    case 'uploading':
      return '上传中';
    case 'paused':
      return '已暂停';
    case 'error':
      return '上传失败';
    case 'cancelled':
      return '已取消';
    case 'completed':
      return '上传完成';
    default:
      return '未知状态';
  }
};

// 获取进度条状态
const getProgressStatus = (status: string): 'success' | 'exception' | 'warning' | '' | undefined => {
  switch (status) {
    case 'error':
      return 'exception';
    case 'completed':
      return 'success';
    default:
      return undefined;
  }
};

// 格式化上传速度
const formatSpeed = (speed: number): string => {
  if (speed < 1024) {
    return `${speed.toFixed(1)} B/s`;
  } else if (speed < 1024 * 1024) {
    return `${(speed / 1024).toFixed(1)} KB/s`;
  } else {
    return `${(speed / (1024 * 1024)).toFixed(1)} MB/s`;
  }
};

// 格式化剩余时间
const formatRemainingTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${Math.ceil(seconds)}秒`;
  } else if (seconds < 3600) {
    return `${Math.ceil(seconds / 60)}分钟`;
  } else {
    return `${Math.ceil(seconds / 3600)}小时`;
  }
};

// 定义组件事件
defineEmits<{
  'pause-upload': [tempId: number];
  'resume-upload': [tempId: number];
  'retry-upload': [tempId: number];
  'cancel-upload': [tempId: number];
}>();
</script>

<template>
  <div class="message-item" :class="{ 'message-own': isOwn }">
    <div class="message-content">
      <!-- 文本消息 -->
      <div v-if="message.type === 'TEXT'" class="message-text">
        {{ message.content }}
      </div>
      
      <!-- 图片消息 -->
      <div v-else-if="message.type === 'IMAGE'" class="message-image">
        <el-image
          :src="message.url || message.content"
          :preview-src-list="[message.url || message.content]"
          fit="cover"
          class="image-preview"
          :alt="message.payload?.fileName || '图片'"
        >
          <template #error>
            <div class="image-error">
              <el-icon><Picture /></el-icon>
              <span>图片加载失败</span>
            </div>
          </template>
        </el-image>
      </div>
      
      <!-- 视频消息 -->
      <div v-else-if="message.type === 'VIDEO'" class="message-video">
        <video
          v-if="message.url && isVideoUrl(message.url)"
          :src="message.url"
          controls
          class="video-player"
        >
          您的浏览器不支持视频播放
        </video>
        <div v-else class="file-item">
          <div class="file-icon">🎥</div>
          <div class="file-info">
            <div class="file-name">{{ message.payload?.fileName || '视频文件' }}</div>
            <div class="file-size">{{ formatFileSize(message.payload?.fileSize) }}</div>
          </div>
        </div>
      </div>
      
      <!-- 语音消息 -->
      <div v-else-if="message.type === 'VOICE'" class="message-voice">
        <div class="voice-item">
          <el-button type="primary" circle size="small">
            <el-icon><VideoPlay /></el-icon>
          </el-button>
          <div class="voice-info">
            <div class="voice-duration">{{ message.payload?.fileName || '语音消息' }}</div>
            <div class="voice-size">{{ formatFileSize(message.payload?.fileSize) }}</div>
          </div>
        </div>
      </div>
      
      <!-- 文件消息 -->
      <div v-else-if="message.type === 'FILE'" class="message-file">
        <div class="file-item">
          <div class="file-icon">{{ getFileIcon(message.type) }}</div>
          <div class="file-info">
            <div class="file-name">{{ message.payload?.fileName || '文件' }}</div>
            <div class="file-size">{{ formatFileSize(message.payload?.fileSize) }}</div>
            
            <!-- 上传进度显示 -->
            <div v-if="message.uploadProgress && message.uploadProgress.status !== 'completed'" class="upload-progress">
              <div class="progress-header">
                <span class="progress-status">{{ getUploadStatusText(message.uploadProgress.status) }}</span>
                <span class="progress-percent">{{ message.uploadProgress.percent }}%</span>
              </div>
              <el-progress
                :percentage="message.uploadProgress.percent"
                :status="getProgressStatus(message.uploadProgress.status)"
                :show-text="false"
                size="small"
              />
              <div class="progress-details">
                <span class="progress-text">
                  {{ formatFileSize(message.uploadProgress.loaded) }} / 
                  {{ formatFileSize(message.uploadProgress.total) }}
                </span>
                <span v-if="message.uploadProgress.speed && message.uploadProgress.status === 'uploading'" class="speed-text">
                  {{ formatSpeed(message.uploadProgress.speed) }}
                </span>
                <span v-if="message.uploadProgress.remainingTime && message.uploadProgress.status === 'uploading'" class="time-text">
                  剩余 {{ formatRemainingTime(message.uploadProgress.remainingTime) }}
                </span>
              </div>
            </div>
          </div>
          
          <!-- 操作按钮 -->
          <div class="file-actions">
            <!-- 上传控制按钮 -->
            <template v-if="message.uploadProgress && message.uploadProgress.status !== 'completed'">
              <el-button
                v-if="message.uploadProgress.status === 'uploading'"
                size="small"
                @click="$emit('pause-upload', message.tempId)"
              >
                暂停
              </el-button>
              <el-button
                v-if="message.uploadProgress.status === 'paused'"
                size="small"
                type="primary"
                @click="$emit('resume-upload', message.tempId)"
              >
                恢复
              </el-button>
              <el-button
                v-if="message.uploadProgress.status === 'error'"
                size="small"
                type="warning"
                @click="$emit('retry-upload', message.tempId)"
              >
                重试
              </el-button>
              <el-button
                v-if="['paused', 'error'].includes(message.uploadProgress.status)"
                size="small"
                type="danger"
                @click="$emit('cancel-upload', message.tempId)"
              >
                取消
              </el-button>
            </template>
            
            <!-- 下载按钮 -->
            <el-button v-if="message.url" type="primary" size="small" text>
              下载
            </el-button>
          </div>
        </div>
      </div>
      
      <!-- 链接消息 -->
      <div v-else-if="message.type === 'LINK'" class="message-link">
        <el-link :href="message.url || message.content" target="_blank" type="primary">
          <el-icon><Link /></el-icon>
          {{ message.content }}
        </el-link>
      </div>
      
      <!-- 其他类型消息 -->
      <div v-else class="message-other">
        <div class="other-content">
          <div class="other-icon">{{ getFileIcon(message.type) }}</div>
          <div class="other-text">{{ message.content }}</div>
        </div>
      </div>
    </div>
    
    <!-- 时间戳 -->
    <div v-if="showTime" class="message-time">
      {{ formatTime(message.tempId) }}
    </div>
  </div>
</template>

<style scoped lang="scss">
.message-item {
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
  
  &.message-own {
    align-items: flex-end;
    
    .message-content {
      background: var(--el-color-primary);
      color: white;
      
      .message-text {
        color: white;
      }
    }
  }
}

.message-content {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--el-bg-color-page);
  border: 1px solid var(--el-border-color-light);
  word-wrap: break-word;
  word-break: break-all;
}

.message-text {
  line-height: 1.5;
  color: var(--el-text-color-primary);
}

.message-image {
  .image-preview {
    max-width: 300px;
    max-height: 200px;
    border-radius: 8px;
    cursor: pointer;
  }
  
  .image-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 200px;
    height: 120px;
    color: var(--el-text-color-placeholder);
    background: var(--el-fill-color-light);
    border-radius: 8px;
    
    .el-icon {
      font-size: 24px;
      margin-bottom: 8px;
    }
  }
}

.message-video {
  .video-player {
    max-width: 400px;
    max-height: 300px;
    border-radius: 8px;
  }
}

.message-voice {
  .voice-item {
    display: flex;
    align-items: center;
    gap: 12px;
    
    .voice-info {
      .voice-duration {
        font-size: 14px;
        color: var(--el-text-color-primary);
      }
      
      .voice-size {
        font-size: 12px;
        color: var(--el-text-color-secondary);
        margin-top: 2px;
      }
    }
  }
}

.message-file {
  .file-item {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 200px;
    
    .file-icon {
      font-size: 24px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--el-fill-color-light);
      border-radius: 8px;
    }
    
    .file-info {
      flex: 1;
      
      .file-name {
        font-size: 14px;
        color: var(--el-text-color-primary);
        margin-bottom: 2px;
        word-break: break-all;
      }
      
      .file-size {
        font-size: 12px;
        color: var(--el-text-color-secondary);
      }
      
      .upload-progress {
        margin-top: 8px;
        
        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
          
          .progress-status {
            font-size: 12px;
            color: var(--el-text-color-regular);
          }
          
          .progress-percent {
            font-size: 12px;
            color: var(--el-color-primary);
            font-weight: 500;
          }
        }
        
        .progress-details {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 4px;
          font-size: 11px;
          color: var(--el-text-color-secondary);
          
          .progress-text {
            flex: 1;
          }
          
          .speed-text {
            margin-left: 8px;
            color: var(--el-color-success);
          }
          
          .time-text {
            margin-left: 8px;
            color: var(--el-text-color-regular);
          }
        }
      }
    }
    
    .file-actions {
      display: flex;
      flex-direction: column;
      gap: 4px;
      align-items: flex-end;
    }
  }
}

.message-link {
  .el-link {
    font-size: 14px;
    
    .el-icon {
      margin-right: 4px;
    }
  }
}

.message-other {
  .other-content {
    display: flex;
    align-items: center;
    gap: 8px;
    
    .other-icon {
      font-size: 20px;
    }
    
    .other-text {
      font-size: 14px;
      color: var(--el-text-color-primary);
    }
  }
}

.message-time {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  margin-top: 4px;
  text-align: center;
}

// 响应式设计
@media (max-width: 768px) {
  .message-content {
    max-width: 85%;
    padding: 10px 12px;
  }
  
  .message-image .image-preview {
    max-width: 250px;
    max-height: 150px;
  }
  
  .message-video .video-player {
    max-width: 300px;
    max-height: 200px;
  }
}
</style>
