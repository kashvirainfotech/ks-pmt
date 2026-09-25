import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ResponseEnvelope<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  meta?: any;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ResponseEnvelope<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseEnvelope<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((res) => {
        // If the handler returned an object with data, extract it and message/meta
        const hasData = res && typeof res === 'object' && 'data' in res;
        const data = hasData ? res.data : res;
        const meta = res && typeof res === 'object' && 'meta' in res ? res.meta : undefined;
        const customMessage = res && typeof res === 'object' && res.message ? res.message : 'Operation successful';

        return {
          success: true,
          statusCode,
          message: customMessage,
          data,
          ...(meta ? { meta } : {}),
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
