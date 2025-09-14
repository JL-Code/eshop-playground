import * as qiniu from "qiniu-js";
import type { Config } from "qiniu-js/esm/upload";
// https://github.com/qiniu/js-sdk
// 上传状态枚举
export enum UploadStatus {
  PENDING = "pending",
  UPLOADING = "uploading",
  PAUSED = "paused",
  SUCCESS = "success",
  ERROR = "error",
  CANCELLED = "cancelled",
}

// 上传进度信息
export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
  speed?: number;
  remainingTime?: number;
}

// 上传任务信息
export interface UploadTask {
  id: string;
  file: File;
  key: string;
  originalKey: string; // 保存初始的key，用于断点续传
  status: UploadStatus;
  progress: UploadProgress;
  error?: string;
  url?: string;
  subscription?: any;
  startTime?: number;
  lastProgressTime?: number;
}

// 七牛云上传配置
export interface QiniuConfig {
  region?: "z0" | "z1" | "z2" | "na0" | "as0" | "cn-east-2";
  domain?: string;
  /**
   * 七牛云 CDN 域名，用于创建对象外链
   */
  cdnDomain: string;
  useCdnDomain?: boolean;
  forceDirect?: boolean;
  retryCount?: number;
  concurrentRequestLimit?: number;
  chunkSize?: number; // 分片大小，单位KB，最大值1024KB
  checkByMD5?: boolean;
}

// 上传服务类
// Token响应接口
export interface TokenResponse {
  token: string;
  key: string;
  fname: string;
}

export class QiniuUploadService {
  private tasks = new Map<string, UploadTask>();
  private config: QiniuConfig;
  private tokenProvider: (
    fileKey: string,
    keep?: boolean
  ) => Promise<TokenResponse>;

  constructor(
    tokenProvider: (fileKey: string, keep?: boolean) => Promise<TokenResponse>,
    config: QiniuConfig = { cdnDomain: "" }
  ) {
    this.tokenProvider = tokenProvider;
    this.config = {
      region: qiniu.region.z2, // 华南区域
      useCdnDomain: true,
      forceDirect: false,
      retryCount: 3,
      concurrentRequestLimit: 3,
      chunkSize: 1024, // 1024KB (1MB) - 七牛云SDK的最大值
      checkByMD5: false,
      ...config,
    };
  }

  // 生成唯一任务ID
  private generateTaskId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 生成文件key
  private generateFileKey(file: File): string {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 9);
    const extension = file.name.split(".").pop() || "";
    return `uploads/${timestamp}_${randomStr}.${extension}`;
  }

  // 计算上传速度和剩余时间
  private calculateSpeed(
    task: UploadTask,
    currentLoaded: number
  ): { speed: number; remainingTime: number } {
    const now = Date.now();
    const timeDiff = now - (task.lastProgressTime || task.startTime || now);
    const loadedDiff = currentLoaded - (task.progress?.loaded || 0);

    const speed = timeDiff > 0 ? (loadedDiff / timeDiff) * 1000 : 0; // bytes/second
    const remainingBytes = task.progress.total - currentLoaded;
    const remainingTime = speed > 0 ? remainingBytes / speed : 0;

    return { speed, remainingTime };
  }

  // 开始上传
  async upload(
    file: File,
    key?: string,
    onProgress?: (progress: UploadProgress) => void,
    onStatusChange?: (status: UploadStatus) => void
  ): Promise<UploadTask> {
    const taskId = this.generateTaskId();
    const fileKey = key || this.generateFileKey(file);

    // 先创建task对象，确保在catch块中可以访问
    const task: UploadTask = {
      id: taskId,
      file,
      key: fileKey,
      originalKey: fileKey, // 保存原始key用于断点续传
      status: UploadStatus.PENDING,
      progress: {
        loaded: 0,
        total: file.size,
        percent: 0,
      },
      startTime: Date.now(),
    };

    // 将task添加到任务列表
    this.tasks.set(taskId, task);

    try {
      // 获取上传token，传递fileKey参数
      const tokenResponse = await this.tokenProvider(fileKey);

      // 使用服务端返回的key更新任务
      task.key = tokenResponse.key;

      // 更新状态为上传中
      task.status = UploadStatus.UPLOADING;
      onStatusChange?.(task.status);

      // 配置上传参数
      const putExtra = {
        fname: tokenResponse.fname,
        params: {},
        mimeType: file.type || "application/octet-stream",
      };

      const qiniuConfig: Config = {
        region: this.config.region || qiniu.region.z2,
        useCdnDomain: this.config.useCdnDomain,
        forceDirect: this.config.forceDirect,
        retryCount: this.config.retryCount,
        concurrentRequestLimit: this.config.concurrentRequestLimit,
        chunkSize: this.config.chunkSize,
        checkByMD5: this.config.checkByMD5,
        uphost: this.config.domain,
      };

      // 开始上传，使用服务端返回的key
      const observable = qiniu.upload(
        file,
        tokenResponse.key,
        tokenResponse.token,
        putExtra,
        qiniuConfig
      );

      const subscription = observable.subscribe({
        next: (res: any) => {
          console.debug("qiniu subscription", JSON.stringify(res));
          /**
           * 七牛云返回的进度数据结构:
           * {
           *   total: {
           *     size: number,    // 文件总大小
           *     loaded: number,  // 已上传大小
           *     percent: number  // 上传百分比
           *   }
           * }
           */
          // 更新进度
          const { total } = res;
          if (
            total &&
            typeof total.loaded === "number" &&
            typeof total.size === "number"
          ) {
            const { speed, remainingTime } = this.calculateSpeed(
              task,
              total.loaded
            );

            task.progress = {
              loaded: total.loaded,
              total: total.size,
              percent: Math.round(
                total.percent || (total.loaded / total.size) * 100
              ),
              speed,
              remainingTime,
            };
            task.lastProgressTime = Date.now();

            onProgress?.(task.progress);
          }
        },
        error: (err: any) => {
          task.status = UploadStatus.ERROR;
          task.error = err.message || "上传失败";
          onStatusChange?.(task.status);
        },
        complete: (res: any) => {
          task.status = UploadStatus.SUCCESS;
          // 上传后返回的 cdn 访问地址
          task.url = res.key
            ? `${this.config.cdnDomain}/${res.key}`
            : undefined;
          onStatusChange?.(task.status);
        },
      });

      task.subscription = subscription;
      return task;
    } catch (error) {
      // 确保task已经初始化，更新错误状态
      task.status = UploadStatus.ERROR;
      task.error = error instanceof Error ? error.message : "上传失败";
      onStatusChange?.(task.status);
      return task;
    }
  }

  // 暂停上传
  pause(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== UploadStatus.UPLOADING) {
      return false;
    }

    if (task.subscription) {
      task.subscription.unsubscribe();
      task.status = UploadStatus.PAUSED;
      return true;
    }
    return false;
  }

  // 恢复上传（断点续传）
  async resume(
    taskId: string,
    onProgress?: (progress: UploadProgress) => void,
    onStatusChange?: (status: UploadStatus) => void
  ): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== UploadStatus.PAUSED) {
      return false;
    }

    try {
      // 断点续传必须使用原始的key获取token，确保scope匹配
      const tokenResponse = await this.tokenProvider(task.originalKey, true);

      task.status = UploadStatus.UPLOADING;
      onStatusChange?.(task.status);

      const putExtra = {
        fname: task.file.name, // 使用原始文件名而不是服务端返回的fname
        params: {},
        mimeType: task.file.type || "application/octet-stream",
      };

      // 七牛云SDK支持断点续传，关键是使用相同的file对象和key
      // SDK会根据文件内容hash和key来识别是否为断点续传
      const qiniuConfig: Config = {
        useCdnDomain: this.config.useCdnDomain,
        forceDirect: this.config.forceDirect,
        retryCount: this.config.retryCount,
        concurrentRequestLimit: this.config.concurrentRequestLimit,
        chunkSize: this.config.chunkSize,
        checkByMD5: this.config.checkByMD5,
        uphost: this.config.domain,
      };

      // 使用原始的originalKey而不是tokenResponse.key，确保断点续传生效
      const observable = qiniu.upload(
        task.file,
        task.originalKey, // 关键：使用原始key，确保断点续传识别
        tokenResponse.token,
        putExtra,
        qiniuConfig
      );

      const subscription = observable.subscribe({
        next: (res: any) => {
          const { total } = res;
          if (
            total &&
            typeof total.loaded === "number" &&
            typeof total.size === "number"
          ) {
            const { speed, remainingTime } = this.calculateSpeed(
              task,
              total.loaded
            );

            task.progress = {
              loaded: total.loaded,
              total: total.size,
              percent: Math.round(
                total.percent || (total.loaded / total.size) * 100
              ),
              speed,
              remainingTime,
            };
            task.lastProgressTime = Date.now();

            onProgress?.(task.progress);
          }
        },
        error: (err: any) => {
          task.status = UploadStatus.ERROR;
          task.error = err.message || "上传失败";
          onStatusChange?.(task.status);
        },
        complete: (res: any) => {
          task.status = UploadStatus.SUCCESS;
          task.url = res.key ? `${this.config.domain}/${res.key}` : undefined;
          onStatusChange?.(task.status);
        },
      });

      task.subscription = subscription;
      return true;
    } catch (error) {
      task.status = UploadStatus.ERROR;
      task.error = error instanceof Error ? error.message : "恢复上传失败";
      onStatusChange?.(task.status);
      return false;
    }
  }

  // 取消上传
  cancel(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    if (task.subscription) {
      task.subscription.unsubscribe();
    }

    task.status = UploadStatus.CANCELLED;
    return true;
  }

  // 删除任务
  remove(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (task) {
      this.cancel(taskId);
      this.tasks.delete(taskId);
      return true;
    }
    return false;
  }

  // 获取任务信息
  getTask(taskId: string): UploadTask | undefined {
    return this.tasks.get(taskId);
  }

  // 获取所有任务
  getAllTasks(): UploadTask[] {
    return Array.from(this.tasks.values());
  }

  // 清理已完成的任务
  clearCompletedTasks(): void {
    for (const [taskId, task] of this.tasks) {
      if (
        task.status === UploadStatus.SUCCESS ||
        task.status === UploadStatus.ERROR ||
        task.status === UploadStatus.CANCELLED
      ) {
        this.tasks.delete(taskId);
      }
    }
  }

  // 格式化文件大小
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  // 格式化上传速度
  static formatSpeed(bytesPerSecond: number): string {
    return this.formatFileSize(bytesPerSecond) + "/s";
  }

  // 格式化剩余时间
  static formatRemainingTime(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)}秒`;
    } else if (seconds < 3600) {
      return `${Math.round(seconds / 60)}分钟`;
    } else {
      return `${Math.round(seconds / 3600)}小时`;
    }
  }
}

// 创建默认的上传服务实例
export function createQiniuUploadService(
  tokenProvider: (fileKey: string) => Promise<TokenResponse>,
  config?: QiniuConfig
) {
  return new QiniuUploadService(tokenProvider, config);
}
