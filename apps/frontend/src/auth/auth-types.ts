export type AuthUser = {
  id: string;
  identifier: string;
  name: string;
  email?: string | null;
  status: string;
  roles: string[];
  permissions: string[];
  profile?: {
    id: string;
    npm?: string | null;
    nip?: string | null;
    phone?: string | null;
    address?: string | null;
    photoPath?: string | null;
  } | null;
};

export type LoginPayload = {
  identifier: string;
  password: string;
};

export type LoginResponse = {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    user: AuthUser;
  };
};

export type MeResponse = {
  success: boolean;
  data: AuthUser;
};