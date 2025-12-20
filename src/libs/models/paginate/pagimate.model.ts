// Request
export class PaginateRequestModel {
    public page = 1;                 // >=1
    public limit = 5;    
    public sort?: 'asc' | 'desc' = 'asc';    // normalize
    public sortBy?: string = 'createdAt';          // validate allowlist ở service
}

export interface PaginateOptions {
    page?: number;
    limit?: number;
    sort?: 'asc' | 'desc';
    sortBy?: string;
    counted?: boolean;
}
  
// Response (2 chế độ)
export interface IPaginateCounted<T> {
    docs: T[];
    docsCount: number;
    totalDocs: number;               
    totalPages: number;              
    currentPage: number;
    nextPage: number | null;
    previousPage: number | null;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
}
  
export interface IPaginateNoCount<T> {
    docs: T[];
    currentPage: number;
    nextPage: number | null;         
    previousPage: number | null;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
}
  
export type IPaginate<T> = IPaginateCounted<T> | IPaginateNoCount<T>;
  