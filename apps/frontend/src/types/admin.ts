export type Role = {
  id: string;
  slug: string;
  name: string;
};

export type UserRole = {
  role: Role;
};

export type UserItem = {
  id: string;
  identifier: string;
  name: string;
  email?: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  userRoles: UserRole[];
  profile?: {
    id: string;
    npm?: string | null;
    nip?: string | null;
    phone?: string | null;
    address?: string | null;
  } | null;
};

export type Peminatan = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  isActive: boolean;
};

export type MasterRuang = {
  id: string;
  code: string;
  name: string;
  type?: string | null;
  capacity?: number | null;
  facilities?: string | null;
  isActive: boolean;
};

export type GradingScale = {
  id: string;
  letter: string;
  minScore: string;
  maxScore: string;
  isActive: boolean;
};