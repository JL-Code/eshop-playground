<template>
  <div class="message-demo-card" v-loading="loading">
    <div class="message-header">
      <span>消息列表</span>
      <el-button-group>
        <el-button :icon="Refresh" circle @click="refreshMessages" />
        <el-button :icon="Bottom" circle @click="scrollToBottom" />
      </el-button-group>
    </div>
    <div class="message-content">
      <el-scrollbar ref="scrollbarRef" @scroll="handleScroll">
        <div v-if="hasMore" class="load-more">
          <el-button link @click="loadMore">加载更多</el-button>
        </div>
        <template v-if="messageList.length > 0">
          <div class="message-items">
            <MessageItem
              v-for="item in messageList"
              :key="item.tempId"
              :message="item"
              :show-time="true"
              :is-own="false"
              @pause-upload="handlePauseUpload"
              @resume-upload="handleResumeUpload"
              @retry-upload="handleRetryUpload"
              @cancel-upload="handleCancelUpload"
              class="message-item"
            />
          </div>
        </template>
        <el-empty v-else description="暂无消息" :image-size="200">
          <template #image>
            <el-icon :size="40" class="empty-icon">
              <ChatLineRound />
            </el-icon>
          </template>
        </el-empty>
      </el-scrollbar>
    </div>
    <div class="message-input">
      <MessageInput @message="handleMessage" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { Bottom, Refresh, ChatLineRound } from "@element-plus/icons-vue";
import { ElMessage, ElScrollbar } from "element-plus";
import type { ScrollbarInstance } from "element-plus";
import { nextTick } from "vue";

const loading = ref(false);
const hasMore = ref(true);
const scrollbarRef = ref<ScrollbarInstance>();
const messageListRef = ref<HTMLElement>();
const autoScroll = ref(true);

const messageList = ref<MessageContent[]>([
  // 测试文本消息
  {
    tempId: 1,
    type: "TEXT",
    content: "这是一条文本消息",
  },
  // 测试正在上传的文件
  {
    tempId: 2,
    type: "FILE",
    content: "正在上传文件...",
    payload: {
      key: "test-file-1",
      fileName: "项目文档.pdf",
      fileSize: 2048576, // 2MB
    },
    uploadProgress: {
      percent: 45,
      loaded: 921600,
      total: 2048576,
      speed: 102400, // 100KB/s
      remainingTime: 11,
      status: "uploading",
    },
  },
  // 测试暂停的文件
  {
    tempId: 3,
    type: "FILE",
    content: "暂停上传的文件",
    payload: {
      key: "test-file-2",
      fileName: "设计图.png",
      fileSize: 5242880, // 5MB
    },
    uploadProgress: {
      percent: 25,
      loaded: 1310720,
      total: 5242880,
      status: "paused",
    },
  },
  // 测试上传失败的文件
  {
    tempId: 4,
    type: "FILE",
    content: "上传失败的文件",
    payload: {
      key: "test-file-3",
      fileName: "视频文件.mp4",
      fileSize: 10485760, // 10MB
    },
    uploadProgress: {
      percent: 15,
      loaded: 1572864,
      total: 10485760,
      status: "error",
    },
  },
  // 测试已完成的文件
  {
    tempId: 5,
    type: "FILE",
    content: "已上传完成的文件",
    url: "https://example.com/file.zip",
    payload: {
      key: "test-file-4",
      fileName: "压缩包.zip",
      fileSize: 1048576, // 1MB
    },
  },
]);

const handleMessage = async (message: MessageContent[]) => {
  console.log("handleMessage", message);
  loading.value = true;

  try {
    // 模拟消息发送延迟
    await new Promise((resolve) => setTimeout(resolve, 500));
    messageList.value.push(...message);
    await nextTick();
    if (autoScroll.value) {
      scrollToBottom();
    }
    ElMessage.success("消息发送成功");
  } catch (error) {
    ElMessage.error("消息发送失败，请重试");
  } finally {
    loading.value = false;
  }
};

const scrollToBottom = () => {
  if (scrollbarRef.value) {
    const scrollbar = scrollbarRef.value;
    const scrollHeight = scrollbar.wrapRef?.scrollHeight || 0;
    scrollbar.setScrollTop(scrollHeight);
    autoScroll.value = true;
  }
};

const handleScroll = (evt: { scrollTop: number; scrollLeft: number }) => {
  const { scrollTop } = evt;
  const scrollbar = scrollbarRef.value;
  if (!scrollbar?.wrapRef) return;

  const { scrollHeight, clientHeight } = scrollbar.wrapRef;
  // 检测是否滚动到底部
  const isBottom = scrollHeight - scrollTop - clientHeight < 50;
  autoScroll.value = isBottom;

  // 检测是否滚动到顶部
  if (scrollTop < 50 && hasMore.value && !loading.value) {
    loadMore();
  }
};

const loadMore = async () => {
  if (loading.value) return;
  loading.value = true;

  try {
    // 模拟加载更多消息
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // TODO: 实际项目中这里需要调用API加载历史消息

    // 演示：没有更多消息了
    hasMore.value = false;
  } finally {
    loading.value = false;
  }
};

const refreshMessages = async () => {
  if (loading.value) return;
  loading.value = true;

  try {
    // 模拟刷新消息列表
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // TODO: 实际项目中这里需要调用API刷新消息列表
  } finally {
    loading.value = false;
  }
};

// 处理上传控制事件
const handlePauseUpload = (tempId: number) => {
  console.log("暂停上传:", tempId);
  const message = messageList.value.find((m) => m.tempId === tempId);
  if (message?.uploadProgress) {
    message.uploadProgress.status = "paused";
  }
};

const handleResumeUpload = (tempId: number) => {
  console.log("恢复上传:", tempId);
  const message = messageList.value.find((m) => m.tempId === tempId);
  if (message?.uploadProgress) {
    message.uploadProgress.status = "uploading";
  }
};

const handleRetryUpload = (tempId: number) => {
  console.log("重试上传:", tempId);
  const message = messageList.value.find((m) => m.tempId === tempId);
  if (message?.uploadProgress) {
    message.uploadProgress.status = "uploading";
    message.uploadProgress.percent = 0;
    message.uploadProgress.loaded = 0;
  }
};

const handleCancelUpload = (tempId: number) => {
  console.log("取消上传:", tempId);
  const message = messageList.value.find((m) => m.tempId === tempId);
  if (message?.uploadProgress) {
    message.uploadProgress.status = "cancelled";
  }
};
</script>
<style lang="scss" scoped>
.message-demo-card {
  height: 100%;
  display: flex;
  flex-direction: column;

  .message-header {
    height: 70px;
    padding: 12px 20px;
    border-bottom: 1px solid var(--el-border-color-light);
    background-color: var(--el-bg-color);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  /**
  content 必须加 min-height: 0;（或者 overflow: hidden;）——这是 Flex 布局下避免子元素“撑破”容器的常见坑。
  <el-scrollbar> 默认会自动撑满父容器，所以只要父容器 .content 正确限制高度，就会生效。
   */
  .message-content {
    flex: 1;
    overflow: auto;
  }

  .message-input {
    height: 230px;
  }

  .message-items {
    .message-item {
      padding: 16px 0;
      transition: background-color 0.2s ease;

      &:not(:last-child) {
        border-bottom: 1px solid var(--el-border-color-lighter);
      }
    }
  }

  .load-more {
    text-align: center;
    padding: 10px 0;
  }
  .message-list {
    padding: 20px;
  }
}
</style>
