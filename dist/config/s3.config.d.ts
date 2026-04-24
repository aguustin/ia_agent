declare const _default: (() => {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
    presignedUrlExpiresIn: number;
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
    presignedUrlExpiresIn: number;
}>;
export default _default;
