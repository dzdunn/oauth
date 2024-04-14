export interface UserCredentials {
	username: string;
	password: string;
}

export interface AuthenticationResult {
    result: boolean;
}

export interface UserRepository {
    authenticate(credentials: UserCredentials): Promise<AuthenticationResult>;
}