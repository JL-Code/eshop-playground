<template>
  <div style="height: 500px">
    <el-splitter layout="vertical">
      <el-splitter-panel>
        <el-scrollbar>
          <div class="message-list">
            <div
              class="message-item"
              v-for="item in messageList"
              :key="item.tempId"
            >
              {{ item.content }}
            </div>
          </div>
        </el-scrollbar>
      </el-splitter-panel>
      <el-splitter-panel>
        <MessageInput @message="handleMessage" />
      </el-splitter-panel>
    </el-splitter>
  </div>
</template>
<script setup lang="ts">
const messageList = ref<MessageContent[]>([]);

const handleMessage = (message: MessageContent[]) => {
  console.log("handleMessage", message);
  messageList.value.push(...message);
};
</script>
<style lang="scss" scoped>
.message-list {
  height: 100%;
}
.message-item {
  padding: 12px;
  border-bottom: 1px solid var(--el-border-color);
}
</style>
