import { ResponseStatus } from './response-status.enum';

export class ResponseModel {
    data: any;
    error: any;
    status: ResponseStatus;
    statusText: string;
    traceId?: string;

    constructor(defaultValues: Partial<ResponseModel> = {}) {
        this.data = defaultValues.data || null;
        this.error = defaultValues.error || null;
        this.status = defaultValues.status ?? ResponseStatus.OK;
        this.statusText = ResponseStatus[this.status];
        this.traceId = defaultValues.traceId;
    }

    setError(err: any, status: ResponseStatus = ResponseStatus.ERROR) {
        this.data = null;
        this.error = err;
        this.status = status;
        this.statusText = ResponseStatus[status];
        this.traceId = err.traceId;
    }

    setData(data: any) {
        this.data = data;
        this.error = null;
        this.status = ResponseStatus.OK;
        this.statusText = ResponseStatus[ResponseStatus.OK];
        this.traceId = data?.traceId;
    }
}