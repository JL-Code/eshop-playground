export default function useOss() {
  /**
   * 获取上传 token
   * @param fileName 文件名
   * @returns 上传token
   */
  async function getUploadToken(
    fileName: string
  ): Promise<QiniuUploadTokenRes> {
    const res = await $fetch<QiniuUploadTokenRes>(
      "/oss/qiniu/token?fileKey=" + fileName,
      {
        method: "POST",
      }
    );
    return res;
  }
}
