import { ElMessage, ElMessageBox } from "element-plus";

type CloseFn = () => void;

type MessageBoxType = "success" | "error" | "warning" | "info";

/**
 * Problem 工具类
 */
export default class Problems {
  static showSuccess(message: string | object, onClose?: CloseFn) {
    if (typeof message === "object") {
      message = this.getTitle(message);
    }
    ElMessage.success({
      message,
      onClose,
    });
  }
  /**
   * 显示错误信息
   * @param error 错误信息
   */
  static showError(error: unknown | ApiProblem, onClose?: CloseFn) {
    ElMessage.error({
      message: this.getTitle(error),
      onClose,
    });
  }
  /**
   * 显示警告信息
   * @param error 一个服务端返回的 API 问题
   */
  static showWarning(error: unknown | ApiProblem, onClose?: CloseFn) {
    ElMessage.warning({
      message: this.getTitle(error),
      onClose,
    });
  }
  /**
   * 显示信息
   * @param error 一个服务端返回的 API 问题
   */
  static showInfo(error: unknown | ApiProblem, onClose?: CloseFn) {
    ElMessage.info({
      message: this.getTitle(error),
      onClose,
    });
  }
  /**
   * 返回成功信息
   * @param data 成功的数据
   * @returns
   */
  public static success(data: any): PromiseReturnType {
    return {
      data,
      error: null,
    };
  }

  /**
   * 返回错误信息
   * @param error 错误信息
   * @returns
   */
  public static fail(error: string | ApiProblem): PromiseReturnType {
    return {
      data: null,
      error: Problems.parseProblem(error),
    };
  }

  /**
   * 将任意类型转化为 ApiProblem
   * @param problem 一个服务端返回的 API 问题
   * @returns ApiProblem
   * @see ApiProblem
   */
  public static parseProblem(problem: any): ApiProblem {
    const _problem: ApiProblem = {
      title: "",
      detail: "",
      code: "",
      violations: [],
    };
    try {
      if (typeof problem === "object" && problem !== null) {
        Object.assign(_problem, problem);
        const violationTitle = this.parseViolations(_problem);
        _problem.title = violationTitle || _problem.title;
      } else if (typeof problem === "string") {
        _problem.title = problem as string;
      }
    } catch (e) {
      if (e instanceof Error) {
        _problem.title = e.message;
      } else {
        console.error(e);
      }
    }
    return _problem;
  }

  /**
   * 解析字段错误信息
   * @param problem ApiProblem 实例
   * @returns 字段错误信息
   */
  public static parseViolations(problem: ApiProblem) {
    if (!Array.isArray(problem.violations)) {
      return "";
    }
    return problem.violations.map((v) => `${v.field} ${v.message}`).join(" ");
  }

  /**
   * 将任意类型转化为 ApiProblem
   * @param problem 一个服务端返回的 API 问题
   * @returns ApiProblem
   * @see ApiProblem
   */
  public static of(problem: any): ApiProblem {
    return this.parseProblem(problem);
  }

  /**
   * 从一个 API 问题中得到标题
   * @param problem 一个服务端返回的 API 问题
   * @returns 问题标题
   */
  public static getTitle(problem: any): string {
    const _problem = this.parseProblem(problem);
    return _problem.detail || _problem.title;
  }

  /**
   * 确认弹窗
   * @param message 弹窗内容
   * @param title 弹窗标题
   * @param type 弹窗类型
   */
  public static confirm(
    message: string | object,
    title: string,
    type: MessageBoxType
  ) {
    ElMessageBox.confirm(this.getTitle(message), title, {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type,
    });
  }
}
