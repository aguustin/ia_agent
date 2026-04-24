export declare class PaginationDto {
    page: number;
    limit: number;
    get skip(): number;
}
export interface PaginatedResult<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}
export declare function paginate<T>(data: T[], total: number, dto: PaginationDto): PaginatedResult<T>;
