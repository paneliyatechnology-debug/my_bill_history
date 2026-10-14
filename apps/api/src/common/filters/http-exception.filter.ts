import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { CORRELATION_ID_HEADER } from "../interceptors/correlation-id.interceptor";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("ExceptionFilter");

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const correlationId =
      request?.correlationId ||
      request?.headers?.[CORRELATION_ID_HEADER] ||
      request?.headers?.["x-request-id"] ||
      "unknown";

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const isProduction = process.env.NODE_ENV === "production";

    let responsePayload: any;

    if (isHttpException) {
      const res = exception.getResponse();
      if (typeof res === "object" && res !== null) {
        responsePayload = {
          ...res,
          correlationId,
          timestamp: new Date().toISOString(),
        };
      } else {
        responsePayload = {
          statusCode: status,
          message: res,
          correlationId,
          timestamp: new Date().toISOString(),
        };
      }
    } else {
      // Unhandled Server Exception (500)
      this.logger.error(
        JSON.stringify({
          type: "UNHANDLED_EXCEPTION",
          correlationId,
          method: request?.method,
          url: request?.url,
          error:
            exception instanceof Error ? exception.message : String(exception),
          stack: exception instanceof Error ? exception.stack : undefined,
        }),
      );

      // In production mode, conceal internal database errors, schema details, or stack traces
      responsePayload = {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: "Internal Server Error",
        message: isProduction
          ? "An unexpected internal server error occurred. Please quote the correlation ID to support."
          : exception instanceof Error
            ? exception.message
            : "An unexpected error occurred.",
        correlationId,
        timestamp: new Date().toISOString(),
      };
    }

    if (response && typeof response.status === "function") {
      if (typeof response.send === "function") {
        response.status(status).send(responsePayload);
      } else if (typeof response.json === "function") {
        response.status(status).json(responsePayload);
      }
    }
  }
}
