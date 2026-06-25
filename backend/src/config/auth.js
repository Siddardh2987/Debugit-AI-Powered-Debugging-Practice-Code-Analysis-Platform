const JWT_FALLBACK_SECRET = 'debugit_dev_fallback_secret_change_in_production';
// 🟡 Remove
// here remove the fallback before deployment.
export const getJwtSecret = () => {
    if (!process.env.JWT_SECRET) {
        throw new Error(
            'JWT_SECRET environment variable is not set. Please set it to a secure value in production.'
        );
    }

    return process.env.JWT_SECRET || JWT_FALLBACK_SECRET;
};
