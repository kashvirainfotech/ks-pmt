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
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ResponseEnvelope<T>
> {
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
        let data = hasData ? res.data : res;
        const request = ctx.getRequest();
        if (
          request.path === '/api/v1/branches' &&
          Array.isArray(data) &&
          request.allowedBranchIds
        )
          data = data.filter((row) =>
            request.allowedBranchIds.includes(row.id),
          );
        const access = request.userEffectivePermissions;
        if (
          access &&
          access.roleCode !== 'ROLE_SUPER_ADMIN' &&
          !access.permissions.has('PROJECTS:VIEW_FINANCIALS') &&
          !(
            request.path.startsWith('/api/v1/products') &&
            access.permissions.has('PRODUCTS:MANAGE')
          )
        ) {
          const financial = new Set([
            'contract_amount',
            'hourly_rate',
            'charge_amount',
            'base_license_price',
            'standard_amc_percentage',
            'implementation_fee',
            'contract_value',
            'amc_amount',
            'total_active_contract_value',
            'total_annual_amc_value',
          ]);
          const redact = (value: any): any =>
            Array.isArray(value)
              ? value.map(redact)
              : value && typeof value === 'object' && !(value instanceof Date)
                ? Object.fromEntries(
                    Object.entries(value)
                      .filter(([key]) => !financial.has(key))
                      .map(([key, item]) => [key, redact(item)]),
                  )
                : value;
          data = redact(data);
        }
        const meta =
          res && typeof res === 'object' && 'meta' in res
            ? res.meta
            : undefined;
        const customMessage =
          res && typeof res === 'object' && res.message
            ? res.message
            : 'Operation successful';

        return {
          success: true,
          statusCode,
          message: customMessage,
          data,
          ...(meta
            ? {
                meta: {
                  ...meta,
                  total_count:
                    meta.total_count ?? meta.totalRecords ?? meta.totalCount,
                  total_pages: meta.total_pages ?? meta.totalPages,
                },
              }
            : {}),
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
