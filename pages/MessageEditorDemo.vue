<template>
  <div class="h-full flex flex-col">
    <div class="message-header">
      <span>消息列表</span>
      <el-button-group>
        <el-button :icon="Refresh" circle @click="refreshMessages" />
        <el-button :icon="Bottom" circle @click="scrollToBottom" />
      </el-button-group>
    </div>
    <div class="flex-1 overflow-auto" v-loading="loading">
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
      <MessageEditor @message="handleMessage" :to-nickname="toNickname" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { Bottom, Refresh, ChatLineRound } from "@element-plus/icons-vue";
import type { ScrollbarInstance } from "element-plus";

const loading = ref(false);
const hasMore = ref(true);
const scrollbarRef = ref<ScrollbarInstance>();
const autoScroll = ref(true);

const toNickname = ref("接收方昵称");
const messageList = ref<MessageContent[]>([]);

const handleMessage = async (message: MessageContent[]) => {
  console.log("handleMessage", JSON.stringify(message));
  loading.value = true;

  try {
    // 模拟消息发送延迟 TODO: 对接发送消息到服务器 API
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
.message-header {
  height: 70px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--el-border-color-light);
  background-color: var(--el-bg-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
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
</style>
