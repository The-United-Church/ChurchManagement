export interface Church {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  createdBy: string;
  createdAt: string;
}

export interface Branch {
  id: string;
  churchId: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  isHeadquarters: boolean;
  createdAt: string;
}

export interface ChurchMembership {
  churchId: string;
  branchId?: string;
  role: 'admin' | 'member';
}
