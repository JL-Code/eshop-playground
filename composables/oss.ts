export default function useOss() {
  const accessToken = ref("");

  async function login() {
    return $fetch<LoginTokenRes>("http://localhost:8081/auth/login", {
      method: "POST",
      body: {
        username: "18580687918",
        password: "123456",
        rememberMe: false,
        credentialType: "password",
        pushClientId: "push_token",
        deviceInfo: {
          deviceId: "18580687918",
        },
      },
    });
  }

  /**
   * 获取上传 token
   * @param fileName 文件名
   * @returns 上传token
   */
  async function getUploadToken(
    fileName: string
  ): Promise<QiniuUploadTokenRes> {
    if (!accessToken.value) {
      const res = await login();
      accessToken.value = res.accessToken;
    }

    const res = await $fetch<QiniuUploadTokenRes>(
      "http://localhost:8081/oss/qiniu/token?fileKey=" + fileName,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + accessToken.value,
        },
      }
    );
    return res;
  }

  return {
    getUploadToken,
  };
}
