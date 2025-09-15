/**
 * 七牛上传 token 响应
 */
type QiniuUploadTokenRes = { token: string; key: string; fname: string };

/**
 * 登录 token 响应
 */
type LoginTokenRes = {
  accessToken: string;
  expiresIn: number;
  issuedAt: number;
};
