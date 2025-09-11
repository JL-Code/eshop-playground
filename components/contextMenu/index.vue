<template>
  <div
    ref="containerRef"
    class="context-menu-demo"
    @contextmenu="handleContextMenu"
  >
    <!-- 演示内容区域 -->
    <div class="demo-workspace">
      <div class="demo-header">
        <h2>Windows 11 风格右键菜单</h2>
        <p>在任意位置右键查看效果</p>
      </div>

      <div class="demo-files">
        <div
          v-for="file in demoFiles"
          :key="file.id"
          class="file-item"
          @contextmenu="handleFileContextMenu($event, file)"
        >
          <el-icon class="file-icon">
            <component :is="file.iconComponent" />
          </el-icon>
          <span class="file-name">{{ file.name }}</span>
        </div>
      </div>
    </div>

    <!-- 主右键菜单 -->
    <Teleport to="body">
      <Transition name="context-menu">
        <div
          v-if="contextMenu.show"
          ref="menuRef"
          :style="menuStyle"
          class="win11-context-menu"
          @click.stop
        >
          <template
            v-for="(item, index) in currentMenuItems"
            :key="item.id || index"
          >
            <!-- 分割线 -->
            <div v-if="item.type === 'divider'" class="menu-divider" />

            <!-- 菜单项 -->
            <div
              v-else
              class="menu-item"
              :class="{
                'is-disabled': item.disabled,
                'is-danger': item.danger,
                'has-submenu': item.children,
              }"
              @click="handleMenuClick(item as MenuItem)"
              @mouseenter="handleMenuItemHover(item as MenuItem, $event, index)"
              @mouseleave="handleMenuItemLeave()"
            >
              <div class="menu-item-content">
                <!-- 图标 -->
                <el-icon v-if="item.icon" class="menu-item-icon">
                  <component :is="item.icon" />
                </el-icon>
                <span v-else-if="item.emoji" class="menu-item-emoji">{{
                  item.emoji
                }}</span>

                <!-- 标签 */
                <span class="menu-item-label">{{ item.label }}</span>
                
                <!-- 快捷键 -->
                <span v-if="item.shortcut" class="menu-item-shortcut">{{
                  item.shortcut
                }}</span>

                <!-- 子菜单箭头 -->
                <el-icon v-if="item.children" class="menu-item-arrow">
                  <ArrowRight />
                </el-icon>
              </div>
            </div>
          </template>
        </div>
      </Transition>

      <!-- 子菜单 -->
      <Transition name="submenu">
        <div
          v-if="submenu.show && activeSubmenuItem?.children"
          ref="submenuRef"
          :style="submenuStyle"
          class="win11-context-menu submenu"
          @click.stop
        >
          <div
            v-for="subItem in activeSubmenuItem.children"
            :key="subItem.id"
            class="menu-item"
            :class="{
              'is-disabled': subItem.disabled,
              'is-danger': subItem.danger,
            }"
            @click="handleMenuClick(subItem as MenuItem)"
          >
            <div class="menu-item-content">
              <el-icon v-if="subItem.icon" class="menu-item-icon">
                <component :is="subItem.icon" />
              </el-icon>
              <span v-else-if="subItem.emoji" class="menu-item-emoji">{{
                subItem.emoji
              }}</span>

              <span class="menu-item-label">{{ subItem.label }}</span>

              <span v-if="subItem.shortcut" class="menu-item-shortcut">{{
                subItem.shortcut
              }}</span>
            </div>
          </div>
        </div>
      </Transition>

      <!-- 多级子菜单 -->
      <template v-for="[key, submenuData] in submenus" :key="key">
        <Transition name="submenu">
          <div
            v-if="submenuData.show"
            :style="{ left: submenuData.x + 'px', top: submenuData.y + 'px' }"
            class="win11-context-menu submenu"
            @click.stop
          >
            <template
              v-for="(item, index) in submenuData.items"
              :key="item.id || index"
            >
              <!-- 分割线 -->
              <div v-if="item.type === 'divider'" class="menu-divider" />

              <!-- 菜单项 -->
              <div
                v-else
                class="menu-item"
                :class="{
                  'is-disabled': item.disabled,
                  'is-danger': item.danger,
                  'has-submenu': item.children,
                }"
                @click="handleMenuClick(item as MenuItem, [...submenuData.path, index])"
                @mouseenter="handleMenuItemHover(item as MenuItem, $event, index, submenuData.path)"
                @mouseleave="handleMenuItemLeave(submenuData.path)"
              >
                <div class="menu-item-content">
                  <!-- 图标 -->
                  <el-icon v-if="item.icon" class="menu-item-icon">
                    <component :is="item.icon" />
                  </el-icon>
                  <span v-else-if="item.emoji" class="menu-item-emoji">{{
                    item.emoji
                  }}</span>

                  <!-- 标签 -->
                  <span class="menu-item-label">{{ item.label }}</span>
                  
                  <!-- 快捷键 -->
                  <span v-if="item.shortcut" class="menu-item-shortcut">{{
                    item.shortcut
                  }}</span>

                  <!-- 子菜单箭头 -->
                  <el-icon v-if="item.children" class="menu-item-arrow">
                    <ArrowRight />
                  </el-icon>
                </div>
              </div>
            </template>
          </div>
        </Transition>
      </template>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
// 定义菜单项类型
interface MenuItem {
  id?: string;
  label?: string;
  icon?: any;
  emoji?: string;
  shortcut?: string;
  action?: string;
  disabled?: boolean;
  danger?: boolean;
  type?: string;
  children?: MenuItem[];
}

interface FileItem {
  id: number;
  name: string;
  iconComponent: any;
}
import { useEventListener, onClickOutside } from "@vueuse/core";
import {
  Document,
  Folder,
  Picture,
  VideoPlay,
  ArrowRight,
  CopyDocument,
  Delete,
  Edit,
  Share,
  Setting,
  Plus,
  Message,
  Link,
  Phone,
} from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";

// Props
const props = defineProps({
  menuItems: {
    type: Array,
    default: () => [],
  },
});

// Emits
const emits = defineEmits(["menu-click"]);

// 模板引用
const containerRef = ref();
const menuRef = ref();
const submenuRef = ref();

// 响应式状态
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  target: null as FileItem | null,
});

const submenu = ref({
  show: false,
  x: 0,
  y: 0,
});

const activeSubmenuIndex = ref(-1);
const submenuTimer = ref<NodeJS.Timeout | null>(null);

// 多级子菜单状态管理
interface SubmenuState {
  show: boolean;
  x: number;
  y: number;
  items: MenuItem[];
  path: number[];
}

const submenus = ref(new Map<string, SubmenuState>());
const submenuTimers = ref(new Map<string, NodeJS.Timeout>());
const activeSubmenuPath = ref<number[]>([]);

// 演示文件数据
const demoFiles = ref([
  { id: 1, name: "Documents", iconComponent: Folder },
  { id: 2, name: "Report.docx", iconComponent: Document },
  { id: 3, name: "Image.png", iconComponent: Picture },
  { id: 4, name: "Video.mp4", iconComponent: VideoPlay },
  { id: 6, name: "Presentation.pptx", iconComponent: Document },
]);

// 默认菜单项
const defaultMenuItems: MenuItem[] = [
  {
    id: "open",
    emoji: "📂",
    label: "打开",
    shortcut: "Enter",
    action: "open",
  },
  {
    id: "edit",
    icon: Edit,
    label: "编辑",
    action: "edit",
  },
  { type: "divider" },
  {
    id: "new",
    icon: Plus,
    label: "新建",
    children: [
      { id: "new-folder", emoji: "📁", label: "文件夹", action: "new-folder" },
      {
        id: "new-document",
        emoji: "📄",
        label: "文档",
        children: [
          { id: "new-word", emoji: "📝", label: "Word 文档", action: "new-word" },
          { id: "new-txt", emoji: "📄", label: "文本文件", action: "new-txt" },
          { id: "new-pdf", emoji: "📕", label: "PDF 文档", action: "new-pdf" },
        ],
      },
      {
        id: "new-spreadsheet",
        emoji: "📊",
        label: "电子表格",
        children: [
          { id: "new-excel", emoji: "📈", label: "Excel 表格", action: "new-excel" },
          { id: "new-csv", emoji: "📋", label: "CSV 文件", action: "new-csv" },
        ],
      },
      {
        id: "new-presentation",
        emoji: "📺",
        label: "演示文稿",
        action: "new-presentation",
      },
      { type: "divider" },
      {
        id: "new-media",
        emoji: "🎬",
        label: "媒体文件",
        children: [
          { id: "new-image", emoji: "🖼️", label: "图片", action: "new-image" },
          { id: "new-video", emoji: "🎥", label: "视频", action: "new-video" },
          { id: "new-audio", emoji: "🎵", label: "音频", action: "new-audio" },
        ],
      },
    ],
  },
  {
    id: "share",
    icon: Share,
    label: "分享",
    children: [
      {
        id: "share-email",
        icon: Message,
        label: "通过邮件",
        children: [
          { id: "share-gmail", emoji: "📧", label: "Gmail", action: "share-gmail" },
          { id: "share-outlook", emoji: "📨", label: "Outlook", action: "share-outlook" },
          { id: "share-other-email", emoji: "✉️", label: "其他邮箱", action: "share-other-email" },
        ],
      },
      {
        id: "share-social",
        emoji: "🌐",
        label: "社交媒体",
        children: [
          { id: "share-wechat", emoji: "💬", label: "微信", action: "share-wechat" },
          { id: "share-weibo", emoji: "🐦", label: "微博", action: "share-weibo" },
          { id: "share-qq", emoji: "🐧", label: "QQ", action: "share-qq" },
        ],
      },
      { id: "share-link", icon: Link, label: "复制链接", action: "share-link" },
      { id: "share-qr", icon: Phone, label: "生成二维码", action: "share-qr" },
    ],
  },
  { type: "divider" },
  {
    id: "copy",
    icon: CopyDocument,
    label: "复制",
    shortcut: "Ctrl+C",
    action: "copy",
  },
  {
    id: "paste",
    emoji: "📋",
    label: "粘贴",
    shortcut: "Ctrl+V",
    disabled: true,
    action: "paste",
  },
  {
    id: "delete",
    icon: Delete,
    label: "删除",
    shortcut: "Del",
    danger: true,
    action: "delete",
  },
  { type: "divider" },
  {
    id: "properties",
    icon: Setting,
    label: "属性",
    action: "properties",
  },
];

// 计算属性
const currentMenuItems = computed((): MenuItem[] => {
  return props.menuItems.length > 0 ? props.menuItems as MenuItem[] : defaultMenuItems;
});

const activeSubmenuItem = computed((): MenuItem | null => {
  if (activeSubmenuIndex.value === -1) return null;
  return currentMenuItems.value[activeSubmenuIndex.value] || null;
});

// 获取指定路径的菜单项
const getMenuItemByPath = (path: number[]): MenuItem | null => {
  let items = currentMenuItems.value;
  let item: MenuItem | null = null;
  
  for (const index of path) {
    if (items && items[index]) {
      item = items[index];
      items = item.children || [];
    } else {
      return null;
    }
  }
  
  return item;
};

const menuStyle = computed(() => ({
  left: `${contextMenu.value.x}px`,
  top: `${contextMenu.value.y}px`,
}));

const submenuStyle = computed(() => ({
  left: `${submenu.value.x}px`,
  top: `${submenu.value.y}px`,
}));

// 方法
const handleContextMenu = (event: MouseEvent) => {
  event.preventDefault();
  showContextMenu(event);
};

const handleFileContextMenu = (event: MouseEvent, file: FileItem) => {
  event.preventDefault();
  event.stopPropagation();
  contextMenu.value.target = file;
  showContextMenu(event);
};

const showContextMenu = (event: MouseEvent) => {
  const containerRect = containerRef.value?.getBoundingClientRect();
  if (!containerRect) return;

  let x = event.clientX;
  let y = event.clientY;

  // 确保菜单不超出视窗
  const menuWidth = 300;
  const menuHeight = 400;

  if (x + menuWidth > window.innerWidth) {
    x = window.innerWidth - menuWidth - 10;
  }

  if (y + menuHeight > window.innerHeight) {
    y = window.innerHeight - menuHeight - 10;
  }

  contextMenu.value = {
    show: true,
    x,
    y,
    target: contextMenu.value.target,
  };

  hideSubmenu();
};

const hideContextMenu = () => {
  contextMenu.value.show = false;
  hideSubmenu();
  hideAllSubmenus();
  contextMenu.value.target = null;
};

const showSubmenu = (item: MenuItem, event: MouseEvent, index: number) => {
  if (!item.children) return;

  activeSubmenuIndex.value = index;

  nextTick(() => {
    const menuRect = menuRef.value?.getBoundingClientRect();
    const itemRect = (event.currentTarget as HTMLElement)?.getBoundingClientRect();

    if (!menuRect || !itemRect) return;

    let submenuX = menuRect.right - 5;
    let submenuY = itemRect.top - 5;

    // 检查右侧空间
    const submenuWidth = 280;
    if (submenuX + submenuWidth > window.innerWidth) {
      submenuX = menuRect.left - submenuWidth + 5;
    }

    // 检查下方空间
  const submenuHeight = (item.children?.length || 0) * 40 + 20;
    if (submenuY + submenuHeight > window.innerHeight) {
      submenuY = window.innerHeight - submenuHeight - 10;
    }

    submenu.value = {
      show: true,
      x: submenuX,
      y: submenuY,
    };
  });
};

const hideSubmenu = () => {
  submenu.value.show = false;
  activeSubmenuIndex.value = -1;
};

// 隐藏所有子菜单
const hideAllSubmenus = () => {
  submenus.value.clear();
  submenuTimers.value.forEach(timer => clearTimeout(timer));
  submenuTimers.value.clear();
  activeSubmenuPath.value = [];
};

// 显示多级子菜单
const showMultiLevelSubmenu = (item: MenuItem, event: MouseEvent, menuPath: number[]) => {
  if (!item.children) return;

  const submenuKey = menuPath.join('-');
  const menuRect = (event.currentTarget as HTMLElement).closest('.win11-context-menu')?.getBoundingClientRect();
  const itemRect = (event.currentTarget as HTMLElement).getBoundingClientRect();

  if (!menuRect || !itemRect) return;

  let submenuX = menuRect.right - 5;
  let submenuY = itemRect.top - 5;

  // 检查右侧空间
  const submenuWidth = 280;
  if (submenuX + submenuWidth > window.innerWidth) {
    submenuX = menuRect.left - submenuWidth + 5;
  }

  // 检查下方空间
  const submenuHeight = (item.children?.length || 0) * 40 + 20;
  if (submenuY + submenuHeight > window.innerHeight) {
    submenuY = window.innerHeight - submenuHeight - 10;
  }

  submenus.value.set(submenuKey, {
    show: true,
    x: submenuX,
    y: submenuY,
    items: item.children,
    path: [...menuPath]
  });

  // 更新活跃路径
  activeSubmenuPath.value = menuPath;
};

// 隐藏指定路径及其子级的菜单
const hideSubmenuFromPath = (path: number[]) => {
  const pathStr = path.join('-');
  
  // 隐藏当前路径及所有子路径的菜单
  for (const [key] of submenus.value) {
    if (key.startsWith(pathStr)) {
      submenus.value.delete(key);
    }
  }
  
  // 清理对应的定时器
  for (const [key, timer] of submenuTimers.value) {
    if (key.startsWith(pathStr)) {
      clearTimeout(timer);
      submenuTimers.value.delete(key);
    }
  }
  
  // 更新活跃路径
  if (activeSubmenuPath.value.length > path.length) {
    activeSubmenuPath.value = [...path];
  }
};

const handleMenuItemHover = (item: MenuItem, event: MouseEvent, index: number, menuPath: number[] = []) => {
  const currentPath = [...menuPath, index];
  const pathKey = currentPath.join('-');
  
  // 清除当前路径的定时器
  if (submenuTimers.value.has(pathKey)) {
    clearTimeout(submenuTimers.value.get(pathKey));
    submenuTimers.value.delete(pathKey);
  }

  if (item.children) {
    // 隐藏同级及更深层的其他子菜单
    const parentPath = menuPath.length > 0 ? menuPath : [];
    for (const [key] of submenus.value) {
      const keyPath = key.split('-').map(Number);
      if (keyPath.length > parentPath.length) {
        const shouldHide = parentPath.length === 0 || 
          !keyPath.slice(0, parentPath.length).every((val: number, i: number) => val === parentPath[i]) ||
          (keyPath.length === currentPath.length && keyPath[keyPath.length - 1] !== index);
        
        if (shouldHide) {
          submenus.value.delete(key);
        }
      }
    }
    
    // 延迟显示子菜单
    const timer = setTimeout(() => {
      if (menuPath.length === 0) {
        showSubmenu(item, event, index);
      } else {
        showMultiLevelSubmenu(item, event, currentPath);
      }
    }, 150);
    
    submenuTimers.value.set(pathKey, timer);
  } else {
    // 隐藏更深层的子菜单
    hideSubmenuFromPath(currentPath);
  }
};

const handleMenuItemLeave = (menuPath: number[] = []) => {
  // 取消显示子菜单 - 清理所有相关定时器
  if (submenuTimer.value) {
    clearTimeout(submenuTimer.value);
    submenuTimer.value = null;
  }
  
  // 清理多级菜单定时器
  submenuTimers.value.forEach(timer => clearTimeout(timer));
  submenuTimers.value.clear();
};

const handleMenuClick = (item: MenuItem, menuPath: number[] = []) => {
  if (item.disabled || item.children) return;

  // 触发事件
  emits("menu-click", {
    ...item,
    target: contextMenu.value.target,
    menuPath: menuPath
  });

  // 执行默认动作
  executeMenuAction(item);

  hideContextMenu();
};

const executeMenuAction = (item: MenuItem) => {
  const actions = {
    open: () => ElMessage.success("打开文件"),
    edit: () => ElMessage.info("编辑文件"),
    "new-folder": () => ElMessage.success("创建新文件夹"),
    "new-word": () => ElMessage.success("创建 Word 文档"),
    "new-txt": () => ElMessage.success("创建文本文件"),
    "new-pdf": () => ElMessage.success("创建 PDF 文档"),
    "new-excel": () => ElMessage.success("创建 Excel 表格"),
    "new-csv": () => ElMessage.success("创建 CSV 文件"),
    "new-presentation": () => ElMessage.success("创建演示文稿"),
    "new-image": () => ElMessage.success("创建图片"),
    "new-video": () => ElMessage.success("创建视频"),
    "new-audio": () => ElMessage.success("创建音频"),
    "share-gmail": () => ElMessage.info("通过 Gmail 分享"),
    "share-outlook": () => ElMessage.info("通过 Outlook 分享"),
    "share-other-email": () => ElMessage.info("通过其他邮箱分享"),
    "share-wechat": () => ElMessage.info("分享到微信"),
    "share-weibo": () => ElMessage.info("分享到微博"),
    "share-qq": () => ElMessage.info("分享到QQ"),
    "share-link": () => ElMessage.info("复制分享链接"),
    "share-qr": () => ElMessage.info("生成二维码"),
    copy: () => ElMessage.success("已复制"),
    paste: () => ElMessage.info("粘贴"),
    delete: () => ElMessage.warning("已删除"),
    properties: () => ElMessage.info("查看属性"),
  };

  const action = item.action ? actions[item.action as keyof typeof actions] : undefined;
  if (action) {
    action();
  }
};

// 事件监听
useEventListener(document, "keydown", (e) => {
  if (e.key === "Escape" && contextMenu.value.show) {
    hideContextMenu();
  }
});

// 点击外部关闭菜单
onClickOutside(menuRef, () => {
  if (contextMenu.value.show) {
    hideContextMenu();
  }
});

onClickOutside(submenuRef, () => {
  if (submenu.value.show) {
    hideSubmenu();
  }
});
</script>

<style scoped>
.context-menu-demo {
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
}

.demo-workspace {
  padding: 40px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.demo-header {
  text-align: center;
  margin-bottom: 40px;
  color: white;
}

.demo-header h2 {
  font-size: 2.5em;
  margin-bottom: 10px;
  font-weight: 300;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.demo-header p {
  font-size: 1.1em;
  opacity: 0.9;
}

.demo-files {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 25px;
  max-width: 800px;
  width: 100%;
}

.file-item {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  color: white;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
}

.file-item:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-5px) scale(1.02);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.file-icon {
  font-size: 2.5em;
  margin-bottom: 12px;
  display: block;
}

.file-name {
  font-size: 0.95em;
  font-weight: 500;
}

/* Windows 11 风格菜单样式 */
.win11-context-menu {
  position: fixed;
  min-width: 300px;
  background: rgba(43, 43, 43, 0.95);
  backdrop-filter: blur(30px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 6px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  z-index: 9999;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  user-select: none;
}

.win11-context-menu.submenu {
  min-width: 280px;
}

.menu-item {
  border-radius: 5px;
  margin: 1px 0;
  cursor: pointer;
  transition: all 0.1s cubic-bezier(0.23, 1, 0.32, 1);
  position: relative;
}

.menu-item:not(.is-disabled):hover {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
}

.menu-item.is-disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.menu-item.is-danger:not(.is-disabled):hover {
  background: rgba(196, 43, 28, 0.8);
  color: white;
}

.menu-item.has-submenu::after {
  content: "";
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 4px solid rgba(255, 255, 255, 0.6);
  border-top: 3px solid transparent;
  border-bottom: 3px solid transparent;
}

.menu-item-content {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  gap: 12px;
  color: rgba(255, 255, 255, 0.95);
  font-size: 14px;
  font-weight: 400;
  line-height: 1.4;
}

.menu-item-icon {
  font-size: 16px;
  width: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.menu-item-emoji {
  font-size: 16px;
  width: 18px;
  text-align: center;
  flex-shrink: 0;
}

.menu-item-label {
  flex: 1;
  font-weight: 400;
  letter-spacing: 0.1px;
}

.menu-item-shortcut {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  font-family: "SF Mono", "Monaco", "Consolas", monospace;
  font-weight: 400;
  margin-left: auto;
}

.menu-item-arrow {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-left: auto;
}

.menu-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 6px 12px;
}

/* 动画效果 */
.context-menu-enter-active {
  transition: all 0.15s cubic-bezier(0.23, 1, 0.32, 1);
}

.context-menu-leave-active {
  transition: all 0.1s ease-in;
}

.context-menu-enter-from {
  opacity: 0;
  transform: scale(0.95) translateY(-8px);
}

.context-menu-leave-to {
  opacity: 0;
  transform: scale(0.98) translateY(-4px);
}

.submenu-enter-active {
  transition: all 0.12s cubic-bezier(0.23, 1, 0.32, 1);
}

.submenu-leave-active {
  transition: all 0.08s ease-in;
}

.submenu-enter-from {
  opacity: 0;
  transform: scale(0.9) translateX(-10px);
}

.submenu-leave-to {
  opacity: 0;
  transform: scale(0.95) translateX(-5px);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .win11-context-menu {
    min-width: 280px;
    font-size: 16px;
  }

  .menu-item-content {
    padding: 14px 18px;
  }

  .demo-files {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }

  .demo-header h2 {
    font-size: 2em;
  }
}

@media (max-width: 480px) {
  .demo-workspace {
    padding: 20px;
  }

  .demo-files {
    grid-template-columns: 1fr;
  }

  .file-item {
    padding: 16px;
  }
}

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  .win11-context-menu {
    background: rgba(32, 32, 32, 0.95);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .menu-item:not(.is-disabled):hover {
    background: rgba(255, 255, 255, 0.1);
  }
}
</style>
