declare const _default: (() => {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
    publicUrl: string;
    signedUrlExpiresIn: number;
    requestTimeoutMs: number;
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
    publicUrl: string;
    signedUrlExpiresIn: number;
    requestTimeoutMs: number;
}>;
export default _default;
