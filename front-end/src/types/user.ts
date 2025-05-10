export interface User {
    id: number;
    username: string;
    email: string;
    is_email_verified: boolean;
    user_type: 'customer' | 'seller';
    profile?: {
        first_name: string;
        last_name: string;
        bio?: string;
        location?: string;
    };
}
