import { ref } from "vue";
import Problems from "~/utils/problem";

const LIMIT_IMAGE_COUNT = 1;

export default function useChat() {
  const messages = ref([]);
  const inputText = ref("");
  const pendingFiles = ref<File[]>([]);

  /**
   * 处理粘贴
   * @param event 剪贴板事件
   */
  const handlePaste = async (event: ClipboardEvent) => {
    await handleSmartPaste(event);
  };

  /**
   * 处理智能粘贴
   * @param event 剪贴板事件
   */
  const handleSmartPaste = async (event: ClipboardEvent) => {
    // 图片数量限制
    if (pendingFiles.value.length >= LIMIT_IMAGE_COUNT) {
      Problems.showWarning("图片数量超过9个，请发送后再试");
      return;
    }

    const items = Array.from(event.clipboardData?.items || []);
    // 检查是否有图片
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        // 阻止默认的文本粘贴行为
        event.preventDefault();
        const file = item.getAsFile();
        if (file) {
          pendingFiles.value.push(file);
        } else {
          console.error("获取文件失败");
        }
      } else {
        // 其他内容
        console.log("item is other", item.type, item.kind);
      }
    }
  };

  /**
   * 删除文件
   * @param index 文件索引
   */
  const removeFile = (index: number) => {
    pendingFiles.value.splice(index, 1);
  };

  /**
   * 清空文件
   */
  const clearFiles = () => {
    pendingFiles.value = [];
  };

  // 发送消息
  const sendMessage = async () => {
    // 实现发送逻辑
  };

  return {
    messages,
    inputText,
    pendingFiles,
    handlePaste,
    removeFile,
    clearFiles,
    sendMessage,
  };
}
