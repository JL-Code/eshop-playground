interface Window {
    existLoading: boolean
    lazy: NodeJS.Timer
    unique: number
    tokenRefreshing: boolean
    requests: Function[]
    eventSource: EventSource
    loadLangHandle: Record<string, any>
}

interface anyObj {
    [key: string]: any
}

interface TableDefaultData<T = any> {
    list: T
    remark: string
    total: number
}

interface ApiResponse<T = any> {
    code: number
    data: T
    message: string
    time: number
}

interface OAuth2TokenResponse {
    accessToken: string
    refreshToken?: string
    expiresIn?: number
    scope?: string
}

/**
 * API 问题类型
 */
interface ApiProblem {
    /**
     * 问题链接 eg: https://zalando.github.io/problem/constraint-violation
     */
    type?: string
    /**
     * 问题标题
     */
    title: string
    /**
     * 问题编码
     */
    code: string
    /**
     * 问题详情
     */
    detail?: string
    /**
     * 字段约束
     */
    violations: Violation[]
}

/**
 * 字段约束违例
 */
interface Violation {
    /**
     * 字段名
     */
    field: string
    /**
     * 错误消息
     */
    message: string
}

/**
 * 默认 async/await 返回类型
 */
interface PromiseReturnType {
    /**
     * 成功时返回的数据
     */
    data: any | null
    /**
     * 失败时返回的错误
     */
    error: ApiProblem | null
}

interface OAuth2ErrorResponse {
    error:
        | 'invalid_request'
        | 'access_denied'
        | 'unauthorized_client'
        | 'unsupported_response_type'
        | 'invalid_scope'
        | 'server_error'
        | 'temporarily_unavailable'
    error_description: string
    error_uri?: string
    state?: string
}

interface PageResponse<T = any> {
    records: Array<T>
    size: number
    current: number
    pages: number
    total: number
}

type OAtuh2Promise = Promise<OAuth2TokenResponse | OAuth2ErrorResponse>

type ApiPromise<T = any> = Promise<ApiResponse<T>>

declare interface ImportMetaEnv {
    VITE_PROXY_URL: string
    VITE_TOKEN_URL: string
    VITE_OIDC_AUTHORITY: string
    VITE_OIDC_CLIENT_ID: string
    VITE_OIDC_REDIRECT_URI: string
    VITE_OIDC_SCOPE: string
    VITE_OIDC_RESPONSE_TYPE: string
    VITE_OIDC_POST_LOGOUT_REDIRECT_URI: string
}
