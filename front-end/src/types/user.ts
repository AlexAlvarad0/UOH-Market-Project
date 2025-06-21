export interface User {
    id: number;
    username: string;
    email: string;
    is_email_verified: boolean;
    is_verified_seller: boolean;
    user_type?: 'customer' | 'seller';
    profile_picture?: string;
    is_seller?: boolean;
    profile?: {
        first_name: string;
        last_name: string;
        bio?: string;
        location?: string;
    };
}
