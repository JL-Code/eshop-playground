<template>
  <div class="message-box">
    <!-- 可编辑输入框 -->
    <div
      ref="editableDiv"
      class="editor"
      contenteditable="true"
      @paste.prevent="handlePaste"
    ></div>

    <div class="actions">
      <input type="file" accept="image/*" @change="handleImageUpload" />
      <button @click="handleSend">发送</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const editableDiv = ref<HTMLDivElement | null>(null);

// 处理粘贴（阻止粘贴 HTML，只保留文本）
const handlePaste = (e: ClipboardEvent) => {
  const text = e.clipboardData?.getData("text/plain");
  document.execCommand("insertText", false, text ?? "");
};

// 处理上传图片
const handleImageUpload = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const img = document.createElement("img");
    img.src = reader.result as string;
    img.style.maxWidth = "100px";
    img.style.verticalAlign = "middle";
    editableDiv.value?.appendChild(img);
  };
  reader.readAsDataURL(file);
};

// 发送消息
const handleSend = () => {
  if (!editableDiv.value) return;

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
      buffer += node.textContent;
    }
  });

  if (buffer.trim()) {
    messages.push(buffer.trim());
  }

  console.log("拆分后的消息：", messages);

  // 清空输入框
  editableDiv.value.innerHTML = "";
};
</script>

<style scoped>
.message-box {
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 8px;
}
.editor {
  min-height: 100px;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 6px;
  margin-bottom: 8px;
}
.actions {
  display: flex;
  gap: 8px;
}
</style>
